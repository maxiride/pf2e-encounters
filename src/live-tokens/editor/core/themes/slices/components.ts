/**
 * Components slice — per-component `{ activeFile, aliases, config, unlinked? }`.
 *
 * `aliases` are the typed component-token → semantic-token map (each entry is
 * a `CssVarRef` discriminated union: `{ kind: 'token', name }` or
 * `{ kind: 'literal', value }`). The renderer emits each alias entry as
 * `var(<name>)` for tokens or as the raw literal for literals.
 *
 * `config` carries literal-valued knobs that don't follow the alias →
 * `var(...)` shape (e.g. `--dialog-confirm-variant: 'primary'`). The set of
 * keys routed to config lives in `componentConfigKeys`.
 *
 * Themes and components are orthogonal: `loadFromFile` preserves
 * `state.components`.
 *
 * Sharing semantics: tokens with the same groupKey (registered explicitly
 * via `registerComponentSchema`) are siblings. Each individual sibling can opt out of the group: `unlinked`
 * lists the specific variable names that have detached, leaving the rest
 * of the group intact. `setComponentAliasLinked` writes the alias to every
 * sibling that is *currently linked* (i.e. not in `unlinked`) plus the
 * target itself, re-joining it to the group; `unlinkComponentProperty`
 * detaches just that one variable. The `unlinked` list persists across
 * theme loads.
 *
 * Dirty tracking: `savedComponents` is the on-disk snapshot baseline (one
 * stringified `{aliases, config}` bag per component). `componentDirty`
 * re-evaluates on any state change or baseline bump. The baseline is set
 * explicitly by the load path (`setSavedComponentBaseline`) — `loadComponentActive`
 * and `seedComponentsFromApi` in editorStore call into this from their migration
 * pipeline.
 */
import { writable, derived, get, type Readable } from 'svelte/store';
import type { CssVarRef, EditorState } from '../../store/editorTypes';
import { store, mutate } from '../../store/editorCore';
import { formatGradientValue } from './gradients';

const EMPTY_COMPONENT_BASELINE = JSON.stringify({ aliases: {}, config: {} });

export function componentBaseline(slice: { aliases: Record<string, CssVarRef>; config: Record<string, unknown> }): string {
  return JSON.stringify({ aliases: slice.aliases, config: slice.config });
}

export function componentsToVars(components: EditorState['components']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slice of Object.values(components)) {
    for (const [varName, ref] of Object.entries(slice.aliases)) {
      if (ref.kind === 'token') out[varName] = `var(${ref.name})`;
      else if (ref.kind === 'literal') out[varName] = ref.value;
      else out[varName] = formatGradientValue(ref.value);
    }
  }
  return out;
}

export function getComponentOwnedVarNames(state: EditorState): string[] {
  const names: string[] = [];
  for (const slice of Object.values(state.components)) {
    for (const name of Object.keys(slice.aliases)) names.push(name);
  }
  return names;
}

/**
 * Loader: themes and components are orthogonal — component aliases live
 * in their own files, not the theme JSON. Preserve the current slice
 * across theme loads and strip any component-owned vars that may have
 * leaked into the theme's cssVariables bag. Mutates `next` and `rawVars`
 * in place.
 */
export function loadComponentsFromVars(
  next: EditorState,
  rawVars: Record<string, string>,
): void {
  next.components = structuredClone(get(store).components);
  for (const name of getComponentOwnedVarNames(next)) delete rawVars[name];
}

// Module-private baseline for per-component dirty detection. Parallels
// `savedAtIndex` + `historyTick` for the global flag; `componentSavedTick`
// drives re-derivation when the baseline changes.
const savedComponents: Record<string, string> = {};
const componentSavedTick = writable(0);
function bumpComponentSavedTick(): void { componentSavedTick.update((n) => n + 1); }

export const componentDirty: Readable<Record<string, boolean>> = derived(
  [store, componentSavedTick],
  ([$state]) => {
    const out: Record<string, boolean> = {};
    for (const [comp, slice] of Object.entries($state.components)) {
      out[comp] = componentBaseline(slice) !== (savedComponents[comp] ?? EMPTY_COMPONENT_BASELINE);
    }
    return out;
  },
);

export function setComponentAlias(component: string, varName: string, ref: CssVarRef): void {
  mutate(`set alias ${component}/${varName}`, (s) => {
    const existing = s.components[component];
    if (existing) {
      existing.aliases[varName] = ref;
    } else {
      s.components[component] = { activeFile: 'default', aliases: { [varName]: ref }, config: {} };
    }
  });
}

export function clearComponentAlias(component: string, varName: string): void {
  mutate(`clear alias ${component}/${varName}`, (s) => {
    const slice = s.components[component];
    if (!slice) return;
    delete slice.aliases[varName];
  });
}

export function setComponentConfig(component: string, key: string, value: unknown): void {
  mutate(`set config ${component}/${key}`, (s) => {
    const existing = s.components[component];
    if (existing) {
      existing.config[key] = value;
    } else {
      s.components[component] = { activeFile: 'default', aliases: {}, config: { [key]: value } };
    }
  });
}

export function clearComponentConfig(component: string, key: string): void {
  mutate(`clear config ${component}/${key}`, (s) => {
    const slice = s.components[component];
    if (!slice) return;
    delete slice.config[key];
  });
}

function componentVarPrefix(component: string): string {
  return `--${component}-`;
}

/**
 * Per-component groupKey schema registered by editor modules. Maps each
 * declared variable to its groupKey (the explicit sibling-set identifier).
 * Tokens with the same groupKey are siblings; tokens not in the schema fall
 * back to last-dash property inference so unmigrated editors keep working.
 */
const componentSchemas: Record<string, Map<string, string>> = {};
/** Inverse of `componentSchemas`: groupKey → declared variables sharing it.
 *  This is the linkage topology declared by the editor, independent of which
 *  aliases the user happens to have saved. */
const componentSchemaSiblings: Record<string, Map<string, string[]>> = {};

const TYPOGRAPHY_PROP_SUFFIXES = ['font-family', 'font-size', 'font-weight', 'line-height'] as const;

/** Pull the slot identifier off a typography variable name, e.g.
 *  `--card-primary-title-font-family` → `'title'`. Returns null for
 *  non-typography vars, where the slot concept doesn't apply. */
function typographySlotOf(varName: string): string | null {
  for (const suffix of TYPOGRAPHY_PROP_SUFFIXES) {
    if (!varName.endsWith('-' + suffix)) continue;
    const head = varName.slice(0, -(suffix.length + 1));
    const lastDash = head.lastIndexOf('-');
    if (lastDash < 0) return null;
    return head.slice(lastDash + 1);
  }
  return null;
}

/**
 * Register a component's token → groupKey mapping. Editors call this at
 * module load (top of `<script>`) so sibling lookups can prefer explicit
 * groupKeys over name-derived inference. Re-registration overwrites prior
 * entries for the same component.
 *
 * Warns when a single groupKey covers typography variables whose name-derived
 * slots differ — e.g. `groupKey: 'font-family'` covering both
 * `--card-primary-title-font-family` and `--card-primary-body-font-family`.
 * Slot prefixes (`title-font-family` vs `body-font-family`) are required so
 * each slot is independently linkable. See `src/styles/CONVENTIONS.md`.
 */
export function registerComponentSchema(
  component: string,
  tokens: ReadonlyArray<{ variable: string; groupKey?: string }>,
): void {
  const map = new Map<string, string>();
  const siblings = new Map<string, string[]>();
  for (const t of tokens) {
    if (!t.groupKey) continue;
    map.set(t.variable, t.groupKey);
    const list = siblings.get(t.groupKey) ?? [];
    list.push(t.variable);
    siblings.set(t.groupKey, list);
  }
  componentSchemas[component] = map;
  componentSchemaSiblings[component] = siblings;

  for (const [groupKey, vars] of siblings) {
    const slots = new Set<string>();
    for (const v of vars) {
      const slot = typographySlotOf(v);
      if (slot) slots.add(slot);
    }
    if (slots.size > 1) {
      const slotList = [...slots];
      const examples = slotList.map((s) => `"${s}-${groupKey}"`).join(', ');
      console.warn(
        `[registerComponentSchema] component "${component}" groupKey "${groupKey}" links typography variables with distinct slots: ${slotList.join(', ')}. ` +
          `Use slot-prefixed groupKeys (e.g. ${examples}) so each slot is independently linkable.`,
      );
    }
  }
}

/**
 * Resolve a variable's groupKey from the component's registered schema.
 * Returns null when the variable has no declared groupKey (i.e. it isn't a
 * member of any sibling group).
 */
function getGroupKey(component: string, varName: string): string | null {
  return componentSchemas[component]?.get(varName) ?? null;
}

/**
 * Variables that share `varName`'s groupKey, i.e. are declared as one
 * linkage group. The editor's registered schema is the source of truth — the
 * declared topology is reported regardless of which aliases happen to be
 * persisted in the slice, so link UI reflects the editor's intent rather than
 * leaking through the on-disk state. Falls back to a slice scan only when the
 * variable isn't declared (legacy/inferred groupKey).
 */
export function getComponentPropertySiblings(component: string, varName: string): string[] {
  const groupKey = getGroupKey(component, varName);
  if (!groupKey) return [];
  const declared = componentSchemaSiblings[component]?.get(groupKey);
  if (declared && declared.length > 0) return declared.slice();
  const slice = get(store).components[component];
  if (!slice) return [];
  const siblings: string[] = [];
  for (const v of Object.keys(slice.aliases)) {
    if (getGroupKey(component, v) === groupKey) siblings.push(v);
  }
  return siblings;
}

function cssVarRefEqual(a: CssVarRef | undefined, b: CssVarRef | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'token') return a.name === (b as { kind: 'token'; name: string }).name;
  if (a.kind === 'literal') return a.value === (b as { kind: 'literal'; value: string }).value;
  // gradient: structural compare on type, angle, aspect axes, and stops.
  const av = a.value;
  const bv = (b as { kind: 'gradient'; value: typeof a.value }).value;
  if (av.type !== bv.type || av.angle !== bv.angle || av.stops.length !== bv.stops.length) return false;
  if ((av.aspectX ?? 1) !== (bv.aspectX ?? 1)) return false;
  if ((av.aspectY ?? 1) !== (bv.aspectY ?? 1)) return false;
  for (let i = 0; i < av.stops.length; i++) {
    const sa = av.stops[i];
    const sb = bv.stops[i];
    if (sa.position !== sb.position || sa.color !== sb.color || (sa.opacity ?? 100) !== (sb.opacity ?? 100)) return false;
  }
  return true;
}

/** True iff `varName` is not individually opted out, has ≥2 declared siblings,
 *  and the linked siblings agree — either all sharing the same explicit alias,
 *  or all having no override (linked at the upstream default). */
export function isComponentPropertyLinked(component: string, varName: string): boolean {
  const slice = get(store).components[component];
  if (slice?.unlinked?.includes(varName)) return false;
  const siblings = getComponentPropertySiblings(component, varName);
  if (siblings.length < 2) return false;
  const unlinkedList = slice?.unlinked ?? [];
  const linkedSiblings = siblings.filter((v) => !unlinkedList.includes(v));
  if (linkedSiblings.length < 2) return false;
  const aliases = slice?.aliases ?? {};
  const first = aliases[linkedSiblings[0]];
  return linkedSiblings.every((v) => cssVarRefEqual(aliases[v], first));
}

/** Write `ref` to `varName` and every sibling currently linked (not in `unlinked`),
 *  and remove `varName` from the unlinked list so it rejoins the group. */
export function setComponentAliasLinked(component: string, varName: string, ref: CssVarRef): void {
  const groupKey = getGroupKey(component, varName);
  const siblings = getComponentPropertySiblings(component, varName);
  if (!groupKey || siblings.length === 0) {
    setComponentAlias(component, varName, ref);
    return;
  }
  mutate(`link ${component}/${groupKey}`, (s) => {
    const slice = s.components[component] ?? (s.components[component] = { activeFile: 'default', aliases: {}, config: {} });
    const unlinked = (slice.unlinked ?? []).filter((p) => p !== varName);
    slice.aliases[varName] = ref;
    for (const v of siblings) {
      if (v === varName) continue;
      if (!unlinked.includes(v)) slice.aliases[v] = ref;
    }
    if (unlinked.length === 0) delete slice.unlinked;
    else slice.unlinked = unlinked;
  });
}

/** Clear `varName` and every sibling currently linked (not in `unlinked`). */
export function clearComponentAliasLinked(component: string, varName: string): void {
  const groupKey = getGroupKey(component, varName);
  const siblings = getComponentPropertySiblings(component, varName);
  if (!groupKey || siblings.length === 0) {
    clearComponentAlias(component, varName);
    return;
  }
  mutate(`clear link ${component}/${groupKey}`, (s) => {
    const slice = s.components[component];
    if (!slice) return;
    const unlinked = slice.unlinked ?? [];
    for (const v of siblings) {
      if (v === varName || !unlinked.includes(v)) delete slice.aliases[v];
    }
  });
}

/** Detach a single property from its sibling group. Other siblings stay linked
 *  to each other; only `varName` becomes independently editable. */
export function unlinkComponentProperty(component: string, varName: string): void {
  const groupKey = getGroupKey(component, varName);
  if (!groupKey) return;
  const siblings = getComponentPropertySiblings(component, varName);
  if (siblings.length < 2) return;
  mutate(`unlink ${component}/${varName}`, (s) => {
    const slice = s.components[component];
    if (!slice) return;
    const unlinked = slice.unlinked ?? [];
    if (!unlinked.includes(varName)) {
      slice.unlinked = [...unlinked, varName];
    }
  });
}

/** Rejoin `varName` to its sibling group as pure metadata: drop it from the
 *  `unlinked` list without writing any alias. Use when the group has no
 *  overrides yet (linked at the upstream default) and the user just wants to
 *  re-engage membership — `setComponentAliasLinked` requires a ref to write,
 *  which there is none of in that state. */
export function relinkComponentProperty(component: string, varName: string): void {
  const slice = get(store).components[component];
  if (!slice?.unlinked?.includes(varName)) return;
  mutate(`relink ${component}/${varName}`, (s) => {
    const next = s.components[component];
    if (!next?.unlinked) return;
    const remaining = next.unlinked.filter((v) => v !== varName);
    if (remaining.length === 0) delete next.unlinked;
    else next.unlinked = remaining;
  });
}

export function markComponentSaved(component: string): void {
  const slice = get(store).components[component];
  if (!slice) return;
  savedComponents[component] = componentBaseline(slice);
  bumpComponentSavedTick();
}

/**
 * Set the on-disk baseline for a component without touching the store.
 * Called by `loadComponentActive` / `seedComponentsFromApi` after their
 * migration step so the post-load state reads clean.
 */
export function setSavedComponentBaseline(component: string, baseline: string): void {
  savedComponents[component] = baseline;
}

/** Notify subscribers that the dirty baseline changed. */
export function notifyComponentSavedChanged(): void {
  bumpComponentSavedTick();
}

/** Test-only: clear the baseline and the dirty signal. */
export function __resetComponentsForTests(): void {
  for (const k of Object.keys(savedComponents)) delete savedComponents[k];
  bumpComponentSavedTick();
}
