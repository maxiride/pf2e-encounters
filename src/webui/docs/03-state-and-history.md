# State, history, and persistence

Everything the editor mutates lives in one tree, threaded through one
funnel. This chapter is the rules of the road for the state core.

## The state tree

`EditorState` (`src/editor/core/store/editorTypes.ts`) is the canonical
shape. View state (tab selection, dialog flags, drag payloads, in-progress
draft hex values) stays out of the tree. Only what a save needs to
round-trip belongs here:

```ts
interface EditorState {
  palettes: Record<string, PaletteConfig>;
  fonts: { sources: FontSource[]; stacks: FontStack[] };
  shadows: { globals: ShadowGlobals; tokens: ShadowToken[];
             overrides: Record<string, ShadowOverrideFlags> };
  overlays: { tokens: OverlayToken[]; hoverTokens: OverlayToken[]; globals: OverlayGlobals };
  columns: ColumnsState;
  components: Record<string, ComponentSlice>;   // per-component aliases + config
  gradients: { tokens: GradientToken[] };
  cssVars: Record<string, string>;              // catch-all for vars not yet in a typed slice
}
```

Each top-level domain has its own slice file under
`src/editor/core/themes/slices/`:

| Domain | Slice | Owns |
|---|---|---|
| `palettes` | `slices/palettes.ts` | Palette config setters; seeded from theme |
| `fonts` | `slices/fonts.ts` | Sources + stacks; seeded from theme |
| `shadows` | `slices/shadows.ts` | Tokens, overrides, global drivers, parser |
| `overlays` | `slices/overlays.ts` | Overlay/hover token lists + globals |
| `columns` | `slices/columns.ts` | Page-grid columns count/gutter/margin/maxWidth |
| `components` | `slices/components.ts` | Per-component `{aliases, config, unlinked}` + sibling linking |
| `gradients` | `slices/gradients.ts` | Fixed-slot gradient tokens |
| `cssVars` | (no slice) | Catch-all string→string bag for unmigrated tokens |

Each slice exports:

- A **default factory** (where applicable) used by `editorStore.emptyState()`.
- An **`xToVars(state)` pure function** consumed by
  `editorRenderer.deriveCssVars()`.
- An **`xEqualsDefault(state)` predicate** consumed by `toTheme` so
  unchanged domains do not bloat the saved theme JSON.
- A **`loadXFromVars(next, rawVars)` loader** consumed by `loadFromFile`'s
  `domainLoaders` table. The loader claims its variables from the raw bag
  and routes them into typed state.
- **Action functions** (e.g., `setPaletteConfig`, `setComponentAlias`) that
  wrap a `mutate(label, draft => …)` call.

Implement those five, register the loader in `editorStore.domainLoaders`,
and wire the renderer call. That is the whole contract for a new domain.

## The mutation funnel

Every change goes through `editorCore.mutate(label, fn)`:

```ts
mutate('set palette primary.baseColor', (draft) => {
  draft.palettes.primary.baseColor = '#ff0000';
});
```

`mutate` is the single chokepoint:

1. Snapshot the current state via `structuredClone`.
2. Push the snapshot onto `past[]` (capped at `HISTORY_MAX = 100`; clear
   `future[]`).
3. `store.update(s => { fn(s); return s; })`. Apply the mutation in place;
   Svelte subscribers fire.
4. Bump the history tick so derived stores (`canUndo`, `canRedo`, `dirty`)
   re-evaluate.
5. Schedule a debounced persist (`schedulePersist`, 300 ms).

Direct `store.set()` is reserved for "open a different document" semantics
(`loadFromFile`, `seedComponentsFromApi`) where history resets rather than
pushes.

## Scopes — the unified history primitive

Until Wave 7, the codebase had three separate history regimes (`mutate`,
`transaction`, palette session). Wave 7 collapsed them into one **`Scope`**
primitive with two orthogonal axes:

```mermaid
flowchart TB
    subgraph Scope["interface Scope"]
        Snap[snapshot: EditorState]
        Idx[historyIdx: past.length at start]
        Collapse[collapseToOne: bool]
        Clip[clipUndoFloor: bool]
        Changed[changed: bool — flipped by mutate]
    end
```

The two axes:

| Axis | When false | When true |
|---|---|---|
| **`collapseToOne`** | Each `mutate` inside the scope is its own history entry. | On commit, intra-scope `past[]` entries collapse to one (the pre-scope snapshot). |
| **`clipUndoFloor`** | Undo can walk past the scope's start. | Undo is clipped to `historyIdx`; on commit, intra-scope past entries are dropped. |

Mapping to use cases:

- **Unscoped one-shot.** Plain `mutate(label, fn)`. Each call is one entry.
- **Drag gesture / atomic edit.** `scope { collapseToOne: true,
  clipUndoFloor: false }`. Slider drags fire dozens of `mutate` calls;
  one commit at pointerup collapses them to a single undoable entry.
- **Palette panel session.** `scope { collapseToOne: true, clipUndoFloor:
  true }`. While the panel is open, undo cannot escape it, so the user does
  not accidentally walk back past the work they are examining; on cancel
  or commit, the whole session reduces to one entry (or reverts entirely).

The wrapper helpers in `editorCore.ts`:

| Helper | Form | Equivalent scope |
|---|---|---|
| `mutate(label, fn)` | unscoped | — |
| `transaction(label, fn)` | sync closure | `{collapseToOne: true, clipUndoFloor: false}` |
| `beginSliderGesture(label)` | window-pointerup wiring | `{collapseToOne: true, clipUndoFloor: false}` |
| `beginScope({label, collapseToOne, clipUndoFloor})` + `commitScope`/`cancelScope` | explicit handle | any combination |

Palette panels need the handle-based form (they open on mount, close on
user action; no closure form fits). UI sliders are the only consumer of
`beginSliderGesture`.

### Cancel — silent vs not

`cancelScope(scope, { silent })` always reverts state to the snapshot and
drops intra-scope past entries. The `silent` flag controls whether the
cancel surfaces:

- `silent: false` (default). Used when the user explicitly aborts (clicks
  the palette panel close button). Bumps the history tick, fires
  `persistHook`. The UI sees `dirty` flip to match the post-revert
  position.
- `silent: true`. Used by internal auto-aborts (a stray transaction killed
  by `undo()`, a competing scope opening). State reverts but no tick fires
  and no persist runs. `dirty` reflects the pre-scope position.

The distinction matters because `cancelScope` runs in two very different
contexts (user intent vs. internal cleanup). Wiring both through the same
path with the same UI side effects would surface ghost dirty signals.

## History stacks

`editorCore.ts` maintains three pieces of history state, all
module-private:

```ts
const past: EditorState[] = [];      // capped at HISTORY_MAX = 100
const future: EditorState[] = [];    // cleared on any new mutate
let savedAtIndex = 0;                // markSaved() sets this to past.length
```

The history arrays live **outside Svelte reactivity**. `derived` stores
read the `historyTick` writable instead. This lets `mutate` apply changes
in-place to the live state (`store.update(s => { fn(s); return s; })`)
without Svelte serializing or copying it through the writable's set path.
History snapshots stay independent; each one is a `structuredClone` taken
at push time, so in-place mutation of the live state cannot corrupt
history.

```mermaid
flowchart LR
    subgraph Stacks["editorCore module-private"]
        Past["past: EditorState array<br/><small>cap 100</small>"]
        Future["future: EditorState array"]
        Saved[savedAtIndex]
        Tick["historyTick<br/><small>writable bumped on change</small>"]
    end

    Mutate[mutate]
    Undo[undo]
    Redo[redo]
    MarkSaved[markSaved]

    Mutate -->|push snapshot| Past
    Mutate -->|clear| Future
    Mutate --> Tick
    Undo -->|pop, push current| Past
    Undo -->|stash to| Future
    Undo --> Tick
    Redo -->|pop, push current| Future
    Redo -->|push| Past
    Redo --> Tick
    MarkSaved -->|past.length| Saved
    MarkSaved --> Tick

    Tick -->|drives| CanUndo["canUndo: Readable&lt;bool&gt;"]
    Tick -->|drives| CanRedo["canRedo: Readable&lt;bool&gt;"]
    Tick -->|drives| Dirty["dirty: Readable&lt;bool&gt;<br/><small>past.length !== savedAtIndex</small>"]
```

`undo()` and `redo()` cancel any open *transaction* (non-clipping) scope
silently before walking history, but respect the clipping scope's floor
(`past.length <= floor` short-circuits). That is what makes "open palette
panel, drag a slider, undo" behave intuitively: undo walks back the slider
drag, then stops at the panel-open floor.

## Persistence

Persistence is **debounced localStorage**
(`src/editor/core/store/editorPersistence.ts`):

- Every `mutate` / `undo` / `redo` calls `persistHook` (wired to
  `schedulePersist`).
- `schedulePersist` debounces to a 300 ms timer; when the timer fires,
  `persistNow` writes the full state JSON to `storageKey('editor-state')`.
- `quietSet` swallows quota and serialization errors; persistence is
  best-effort.

The storage key resolves **lazily** (`getPersistKey()` runs on every save,
not memoized). Library consumers that call
`configureEditor({storagePrefix: 'my-app-'})` *after* `editorPersistence`
was imported still get the configured prefix on the first write.

### Hydrate

`hydrate()` runs eagerly from the editor-store barrel (`ensureHydrated()`
at module load, gated by a flag so it fires once). The eager call matters
because Svelte mounts children before parents, and child components
reading `$editorState` in `onMount` need to see persisted state, not the
transient empty default.

Hydrate also schedules `seedShadowsFromDom()` via
`requestAnimationFrame`. Shadows were the only domain not fully captured
in JSON-serialized state on a fresh install; the rAF defer waits for
`tokens.css` to apply before `getComputedStyle` reads the baseline.

## "Open a different document" — `loadFromFile`

Loading a theme is not a `mutate`; it replaces state and resets history:

```mermaid
sequenceDiagram
    participant Caller
    participant LoadFile as loadFromFile(theme)
    participant Mig as migrations.runMigrations
    participant Loaders as domainLoaders
    participant Core as editorCore
    participant Persist

    Caller->>LoadFile: theme JSON
    LoadFile->>LoadFile: next = emptyState()<br/>copy palettes/fonts onto next
    LoadFile->>Mig: runMigrations('theme', theme.schemaVersion ?? 0,<br/>theme.cssVariables)
    Mig-->>LoadFile: rawVars (post-migration)
    loop for each domain
        LoadFile->>Loaders: load(next, rawVars) — claims its vars
    end
    LoadFile->>LoadFile: next.cssVars = remaining rawVars
    LoadFile->>Core: resetHistoryForLoad()<br/>store.set(next)
    LoadFile->>Persist: schedulePersist()
```

History resets rather than pushes because undo crossing a theme load is
incoherent: the user opened a different document. A "go back to the prior
theme" affordance would be its own command (re-load the prior file by
name), not undo.

`state.components` is *preserved* across theme loads. Component slices
live in their own files; `loadComponentsFromVars` clones the current
`components` onto `next` and strips any component-owned vars that may
have leaked into the theme bag.

## Test coverage

The state core's contract lives in tests. Three test files form the
canonical regression net for any state work:

| File | Covers |
|---|---|
| `core/store/editorStore.test.ts` | All three (now-folded) history regimes; cross-regime edges (e.g. "undo with pending transaction aborts it first") |
| `core/components/componentConfig.test.ts` | Per-component dirty tracking; seed-from-API; config baseline |
| `core/themes/migrations/migrations.test.ts` | Legacy → current; gating by stamp; identity at current; purity |
| `core/components/lazyConfig.test.ts` | `configureEditor` storage-prefix observed lazily |

If you touch `editorCore.ts`, `editorStore.ts`, or any slice's
history-affecting behavior, run `npm run test` and expect these to stay
green.

## Test-only escape hatches

Three test-only resets exist; they are not on the public barrel:

- `__resetForTests()` (in `editorStore.ts`). Full reset (core + renderer +
  components).
- `__resetCoreForTests()` (in `editorCore.ts`). Just core.
- `__resetComponentsForTests()` (in `slices/components.ts`). Just
  per-component baseline.

These reach into module-private mutables on purpose. Do not depend on
them from production code.

## Summary

- One state tree (`EditorState`), one mutation funnel (`mutate`), one
  history machine (the `Scope` primitive in `editorCore`).
- Slices own their domain's defaults, derivation, and load contract; the
  renderer is the only DOM consumer.
- Persistence is debounced localStorage, resolved against the lazy
  storage prefix.
- Theme loads reset history; component slices are orthogonal to themes
  and survive.
