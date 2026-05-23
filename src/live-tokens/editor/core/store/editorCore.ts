/**
 * State-core for the editor store.
 *
 * Owns the writable, history stacks (undo/redo), and the unified `Scope`
 * primitive that brackets a series of mutations. Exposes `editorState`
 * (Readable), `mutate` for unscoped one-shots, `transaction(label, fn)` for
 * sync closure form, `beginSliderGesture(label)` for window-pointerup wiring,
 * and the `beginScope/commitScope/cancelScope` trio for explicit handle-based
 * scopes (the only form palette panels need). Domain slices import `mutate`
 * and friends from here.
 *
 * The Scope primitive (M6 fold) — two orthogonal axes:
 *  - `collapseToOne` — on commit, all intra-scope mutations collapse to a
 *    single history entry (the pre-scope snapshot).
 *  - `clipUndoFloor` — while the scope is active, undo() is clipped to the
 *    scope's start; on commit, intra-scope past entries are dropped from
 *    history so the snapshot becomes the single undo target.
 *
 * Mapping to use cases:
 *  - `mutate`               — unscoped one-shot (no scope at all).
 *  - drag gesture / atomic  — scope { collapseToOne: true,  clipUndoFloor: false }.
 *  - palette panel session  — scope { collapseToOne: true,  clipUndoFloor: true  }.
 *
 * Two side-effect hooks are wired by `editorStore.ts` at boot:
 *  - `setEmptyStateFactory` — produces a fresh state tree.
 *  - `setPersistHook` — debounced localStorage write.
 *
 * Hooks are nullable on first import so the module evaluates cleanly even
 * when consumed from contexts that don't need persistence (SSR, isolated
 * unit tests).
 */

import { writable, derived, get, type Readable } from 'svelte/store';
import type { EditorState } from './editorTypes';

const HISTORY_MAX = 100;

// ── Hooks (wired by editorStore at boot) ──────────────────────────────────

let emptyStateFactory: () => EditorState = () => ({} as EditorState);
let persistHook: () => void = () => {};

export function setEmptyStateFactory(fn: () => EditorState): void {
  emptyStateFactory = fn;
}
export function setPersistHook(fn: () => void): void {
  persistHook = fn;
}

/** Trigger the persistence hook. Used by seed paths that bypass `mutate`. */
export function persist(): void {
  persistHook();
}

// ── Store + history machine ───────────────────────────────────────────────

export const store = writable<EditorState>(emptyStateFactory());

// History stacks hold snapshots that are independent of the current state
// reference (always created via structuredClone at push time). This lets
// mutate / undo / redo use in-place mutation on the live state without
// corrupting history entries.
const past: EditorState[] = [];
const future: EditorState[] = [];
let savedAtIndex = 0;

// A counter that bumps on every history-affecting change, so `derived`
// stores (canUndo, canRedo, dirty) re-evaluate. The history arrays
// themselves live outside Svelte reactivity.
const historyTick = writable(0);
function bumpTick() { historyTick.update((n) => n + 1); }

/** Push `entry` onto past[], handling overflow + clearing future. */
function pushPast(entry: EditorState): void {
  past.push(entry);
  if (past.length > HISTORY_MAX) {
    past.shift();
    if (savedAtIndex > 0) savedAtIndex--;
  }
  future.length = 0;
}

// ── Scope primitive ───────────────────────────────────────────────────────

/**
 * A handle for a bracketed series of mutations. Returned by `beginScope` and
 * passed back to `commitScope`/`cancelScope`. The shape is public but its
 * fields are read-only from outside this module — callers treat it as an
 * opaque ticket.
 *
 * Two orthogonal axes:
 *  - collapseToOne: on commit, everything in the scope collapses to one
 *    history entry (the pre-scope snapshot).
 *  - clipUndoFloor: while the scope is active, undo() cannot pop past
 *    entries pushed before the scope began; on commit, intra-scope past
 *    entries are dropped (past.length = historyIdx).
 */
export interface Scope {
  readonly snapshot: EditorState;
  readonly label: string;
  readonly collapseToOne: boolean;
  readonly clipUndoFloor: boolean;
  /** past.length captured at scope start — only consulted when clipUndoFloor. */
  readonly historyIdx: number;
  /** Set by `mutate()` when at least one mutation is applied within the scope. */
  changed: boolean;
}

// Two scope slots: one for in-flight non-clipping scopes (drag gestures,
// atomic edits), one for clipping scopes (palette edit sessions). They can
// coexist — a slider drag inside an open palette session is the canonical
// case — so they're tracked independently. `mutate` consults `transactionScope`
// to suppress per-mutate pushes; `undo` consults `clippingScope` to enforce
// the floor.
let transactionScope: Scope | null = null;
let clippingScope: Scope | null = null;

/**
 * Open a new scope. Returns a handle the caller passes back to
 * `commitScope`/`cancelScope`. The handle's `clipUndoFloor` flag determines
 * which internal slot the scope occupies; if a slot is already filled, the
 * prior scope is auto-committed (transaction slot) or auto-committed
 * (clipping slot) — matching the prior wrapper behavior.
 */
export function beginScope(opts: {
  label: string;
  collapseToOne: boolean;
  clipUndoFloor: boolean;
}): Scope {
  const scope: Scope = {
    snapshot: structuredClone(get(store)),
    label: opts.label,
    collapseToOne: opts.collapseToOne,
    clipUndoFloor: opts.clipUndoFloor,
    historyIdx: past.length,
    changed: false,
  };
  if (opts.clipUndoFloor) {
    if (clippingScope) commitScope(clippingScope);
    clippingScope = scope;
  } else {
    if (transactionScope) {
      if (import.meta.env.DEV) {
        console.warn(
          `[editorStore] beginScope("${opts.label}") while "${transactionScope.label}" is still open; aborting previous`,
        );
      }
      cancelScope(transactionScope, { silent: true });
    }
    transactionScope = scope;
  }
  return scope;
}

/**
 * Commit the given scope. If collapseToOne, all intra-scope past entries
 * (those pushed since `historyIdx`) are dropped and the pre-scope snapshot
 * is pushed in their place — but only if anything actually changed.
 *
 * "Did anything change" is computed by state-equality (JSON) when
 * `clipUndoFloor` is set, because the scope's intra-scope mutations were
 * applied to history AND then dropped — the only signal left is whether
 * the live state still matches the snapshot. For non-clipping scopes,
 * the `changed` flag is the source of truth: empty scopes skip the commit
 * entirely.
 */
export function commitScope(scope: Scope): void {
  // Clear the slot first so internal aborts triggered during commit don't
  // recurse against the same scope.
  if (scope.clipUndoFloor) {
    if (clippingScope !== scope) return;
    if (transactionScope) cancelScope(transactionScope, { silent: true });
    clippingScope = null;
  } else {
    if (transactionScope !== scope) return;
    transactionScope = null;
  }

  if (scope.collapseToOne) {
    if (scope.clipUndoFloor) {
      // Clipping path: intra-scope entries were each pushed by mutate()
      // (they had to be, so undo within the scope could walk them back).
      // On commit, drop them and push the pre-scope snapshot iff state is
      // not back at the snapshot.
      past.length = scope.historyIdx;
      const snapshotJson = JSON.stringify(scope.snapshot);
      const currentJson = JSON.stringify(get(store));
      const changedByEquality = snapshotJson !== currentJson;
      if (changedByEquality) {
        pushPast(scope.snapshot);
        persistHook();
      }
      bumpTick();
      if (import.meta.env.DEV) {
        console.debug('[editorStore] commitScope (clipping) →', {
          label: scope.label,
          pastLen: past.length,
          snapshotPalettes: paletteSnapshot(scope.snapshot),
          currentPalettes: paletteSnapshot(get(store)),
        });
      }
      return;
    }
    // Non-clipping path: intra-scope mutations were applied to the store
    // but NOT pushed individually. Push the pre-scope snapshot iff anything
    // changed.
    if (!scope.changed) return;
    pushPast(scope.snapshot);
    bumpTick();
    persistHook();
    return;
  }
  // Future: a non-collapsing scope would be a no-op on commit (entries
  // already live in past[]). Not used today.
  bumpTick();
}

/**
 * Cancel the given scope. Always reverts state to the snapshot and drops
 * intra-scope past entries. The `silent` flag controls whether the cancel
 * surfaces as a tick + persist:
 *  - silent: false (default) — used when the user aborts a scope
 *    explicitly (e.g., palette panel X). Refreshes dirty + persist so the
 *    UI reflects the discard.
 *  - silent: true — used by internal auto-aborts (a stray transaction
 *    being killed by undo() / by a competing scope). UI observes the state
 *    revert, but `dirty` reflects the pre-scope position because no tick
 *    fires and no persist runs.
 */
export function cancelScope(scope: Scope, opts?: { silent?: boolean }): void {
  // Clear the slot first so any code observing the state revert doesn't see
  // a stale "scope still open" view.
  if (scope.clipUndoFloor) {
    if (clippingScope !== scope) return;
    if (transactionScope) cancelScope(transactionScope, { silent: true });
    clippingScope = null;
  } else {
    if (transactionScope !== scope) return;
    transactionScope = null;
  }

  past.length = scope.historyIdx;
  if (scope.clipUndoFloor) future.length = 0;
  store.set(scope.snapshot);
  if (opts?.silent) return;
  bumpTick();
  persistHook();
  if (import.meta.env.DEV && scope.clipUndoFloor) {
    console.debug('[editorStore] cancelScope (clipping) →', {
      label: scope.label,
      pastLen: past.length,
      restoredPalettes: paletteSnapshot(scope.snapshot),
    });
  }
}

export const editorState: Readable<EditorState> = { subscribe: store.subscribe };

export function mutate(label: string, fn: (draft: EditorState) => void): void {
  if (import.meta.env.DEV && !label) {
    console.warn('[editorStore] mutate() called without a label');
  }
  // Svelte 5's `$derived` uses strict `===` for equality (see
  // node_modules/svelte/src/internal/client/reactivity/deriveds.js → equality.js).
  // If we mutated `s` in place and emitted the same top-level reference, any
  // intermediate `$derived($editorState.someSlice.someObj)` in a component
  // would return the same object reference and short-circuit the whole
  // downstream chain — swatches and previews would freeze even while the
  // renderer's direct `editorState.subscribe(...)` (which uses `safe_not_equal`,
  // always-different for objects) continued to write CSS vars to :root.
  //
  // Cloning the draft before mutation guarantees every nested reference is
  // fresh, so `$derived` chains everywhere propagate correctly. The previous
  // live state (`current`) becomes the immutable history snapshot — no second
  // structuredClone needed.
  if (transactionScope) {
    transactionScope.changed = true;
    if (clippingScope) clippingScope.changed = true;
    store.update((s) => {
      const next = structuredClone(s);
      fn(next);
      return next;
    });
    return;
  }
  if (clippingScope) clippingScope.changed = true;
  const current = get(store);
  pushPast(current);
  store.update((s) => {
    const next = structuredClone(s);
    fn(next);
    return next;
  });
  bumpTick();
  persistHook();
}

/**
 * Slider-drag helper: opens a non-clipping scope on pointerdown and commits
 * it on the next window-level pointerup / pointercancel. Groups a drag
 * gesture under one history entry so undo rolls the whole drag back as a
 * single step.
 */
export function beginSliderGesture(label: string): void {
  if (typeof window === 'undefined') return;
  const scope = beginScope({ label, collapseToOne: true, clipUndoFloor: false });
  const end = () => {
    commitScope(scope);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}

/**
 * Sync closure form: opens a non-clipping scope, runs `fn`, and commits.
 * If `fn` throws, the scope is silently cancelled (state reverted, no
 * persist) and the error is re-thrown.
 */
export function transaction<T>(label: string, fn: (draft: EditorState) => T): T {
  const scope = beginScope({ label, collapseToOne: true, clipUndoFloor: false });
  try {
    let result!: T;
    mutate(label, (draft) => { result = fn(draft); });
    commitScope(scope);
    return result;
  } catch (e) {
    cancelScope(scope, { silent: true });
    throw e;
  }
}

// ── Undo / redo ───────────────────────────────────────────────────────────

export function undo(): boolean {
  if (transactionScope) cancelScope(transactionScope, { silent: true });
  const floor = clippingScope ? clippingScope.historyIdx : 0;
  if (past.length <= floor) return false;
  future.push(structuredClone(get(store)));
  const previous = past.pop()!;
  store.set(previous);
  bumpTick();
  persistHook();
  if (import.meta.env.DEV) {
    console.debug('[editorStore] undo →', {
      pastLen: past.length, floor,
      palettes: paletteSnapshot(previous),
      inClippingScope: !!clippingScope,
    });
  }
  return true;
}

export function redo(): boolean {
  if (transactionScope) cancelScope(transactionScope, { silent: true });
  if (future.length === 0) return false;
  past.push(structuredClone(get(store)));
  const next = future.pop()!;
  store.set(next);
  bumpTick();
  persistHook();
  return true;
}

export const canUndo: Readable<boolean> = derived(historyTick, () => past.length > 0);
export const canRedo: Readable<boolean> = derived(historyTick, () => future.length > 0);
export const dirty:   Readable<boolean> = derived(historyTick, () => past.length !== savedAtIndex);

export function markSaved(): void {
  savedAtIndex = past.length;
  bumpTick();
}

/**
 * Reset history + transient scope state without touching the store. Used by
 * `loadFromFile` ("open a different document" — undo cannot cross a theme
 * load). The caller is responsible for `store.set(next)` and `persistHook()`.
 */
export function resetHistoryForLoad(): void {
  past.length = 0;
  future.length = 0;
  savedAtIndex = 0;
  transactionScope = null;
  bumpTick();
}

/**
 * Test-only: clear all core history + transient scope state and reset the
 * store to `emptyStateFactory()`. The full `__resetForTests` in editorStore
 * also resets renderer + per-slice baselines.
 */
export function __resetCoreForTests(): void {
  past.length = 0;
  future.length = 0;
  savedAtIndex = 0;
  transactionScope = null;
  clippingScope = null;
  store.set(emptyStateFactory());
  bumpTick();
}

/** Test-only accessors — internal history state is module-private otherwise. */
export function __getHistoryLengths(): { past: number; future: number } {
  return { past: past.length, future: future.length };
}
export function __getPastAt(idx: number): EditorState | undefined {
  return past[idx];
}

/** Dev-only: compact digest of each palette's baseColor + overrides count. */
function paletteSnapshot(s: EditorState): Record<string, { base: string; overrides: number }> {
  const out: Record<string, { base: string; overrides: number }> = {};
  for (const [k, v] of Object.entries(s.palettes ?? {})) {
    out[k] = { base: v.baseColor, overrides: Object.keys(v.overrides).length };
  }
  return out;
}
