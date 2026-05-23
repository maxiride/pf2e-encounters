# Manifest robustness plan

**Goal.** Make "save a manifest and switch back to it" a load-bearing primitive: a manifest captures everything needed to render a theme, and applying it produces the exact saved appearance — regardless of whether the theme was authored in the editor, hand-edited, or imported from CSS.

**Working artifact.** This doc is the proposal surface. Steer it here before any code lands. Findings/decisions/open questions stay inline; the implementation PR cites this doc by section.

---

## 1. Problem statement

A theme JSON has two sources of truth for the same CSS variables:

- `cssVariables` — the catch-all bag (flat name → value map).
- Typed slices — `editorConfigs` (palettes), `fontStacks` + `fontSources`, plus the columns / overlays / shadows / gradients / components stored in `cssVariables` but parsed back into typed state on load.

At render time (`src/editor/core/store/editorRenderer.ts:28-45`), the typed slices derive their own CSS variables and overlay them on top of `cssVariables` in a fixed order:

```ts
const out = { ...state.cssVars };
Object.assign(out, columnsToVars(state.columns));
Object.assign(out, overlaysToVars(state.overlays));
Object.assign(out, shadowsToVars(state.shadows));
Object.assign(out, gradientsToVars(state.gradients));
Object.assign(out, palettesToVars(state.palettes));   // stomps cssVariables
Object.assign(out, componentsToVars(state.components));
```

Whatever a typed slice produces wins over whatever `cssVariables` says. Themes authored entirely in the editor stay consistent because `toTheme` re-serializes from typed state on every save. **Imported / hand-authored themes can drift**: the importer fills `cssVariables` with one set of values, leaves typed state at the previous theme's defaults, and the renderer silently stomps the import on next paint.

The runegoblin import surfaced this concretely:
- The import wrote `--color-brand-500: #bd6a08` (orange) into `cssVariables`.
- It left `editorConfigs.Brand.baseColor` at default's `#fb2898` (pink).
- The PaletteEditor recomputed pink ramps from `baseColor` + default curves and overwrote orange on render.
- Visually, "applying the runegoblin manifest" appeared to do nothing.

The fix-by-overlay (patch `baseColor` in the importer) works locally but doesn't address the structural fragility. **Any future external author, migration, or extension can re-introduce the same drift.**

---

## 2. Design commitment

> **Typed state is canonical. `cssVariables` is the catch-all for tokens that no typed slice owns.**

This matches what `toTheme` (`src/editor/core/store/editorStore.ts:351`) already does today: palette / gradient / component derivations are **not** serialized into `cssVariables`. The current implementation is half-committed to typed-canonical; the work in this plan finishes the commitment.

Implications:
- Imported `cssVariables` for typed-slice-owned tokens are **input only** — they exist to seed typed state on first load and are then stripped from `cssVariables` at the storage boundary.
- After normalization, every theme on disk has the invariant: *for every typed-slice-owned variable name, `cssVariables` either omits it or carries a value the typed slice would derive.* No drift possible.
- `cssVariables` shrinks to its real job: radii, spacing, font-sizes, opacity scales, page-bg, transitions — tokens with no editor model.

Trade-off accepted: curve recovery is approximate. Importing a `--color-brand-500` snaps `baseColor` but keeps the default curve shape, so the imported 100 / 850 / 950 steps will only *approximate* the original. Surfaced in §6.

---

## 3. Architecture

### 3.1 Per-slice reconcile contract

Each typed-slice module gains a single method:

```ts
reconcileFromCssVars(state: SliceState, cssVars: Record<string,string>): {
  state: SliceState;          // updated typed state
  consumed: ReadonlySet<string>; // var names that fed the reconcile
};
```

Mirrors the existing pair (`loadXxxFromVars` + `xxxToVars`) and slots into the existing `domainLoaders` table in `editorStore.ts:307`. Every slice already understands its own variable names — this method just inverts the derivation back into typed state, returning the set of names that were "owned" by this slice so the orchestrator can strip them.

Per-slice behaviour table:

| Slice | Reconcile signal | Approximation? |
|---|---|---|
| Palettes (`editorConfigs[family]`) | `--color-{family}-500` → `baseColor` | Yes — curves kept as-is, see §6 |
| Fonts (`fontStacks`) | `--font-{role}` literal stack with no matching fontStack → clear that stack so cssVar passes through | None |
| Shadows | `--shadow-{token}` box-shadow string → typed shadow record (parse) | None if parser is total |
| Gradients | `--gradient-{n}` linear-gradient string → typed gradient | None if parser is total |
| Components | already loaded via `loadComponentsFromVars`; reuse | None |
| Columns / Overlays | already loaded via existing loaders; reuse | None |

The slices that already have load-from-vars implementations cost ~nothing to wire up — `reconcileFromCssVars` is a thin alias that also returns its `consumed` set. The palette and shadow slices need new inverse logic.

### 3.2 One door — the storage layer

Reconciliation runs **at one place: the file resource layer**, in the path that reads a theme or manifest from disk. Specifically:

- `themesResource` GET in `vite-plugin/themeFileApi.ts` — when a theme is fetched, run normalization before returning it.
- Same for manifest apply's resolved-theme payload.
- Same hook also runs as part of `runMigrations('theme', ...)` (`editorStore.ts:326`) — the existing schema-version migration system is the right home; normalization is conceptually "migration to the v3 invariant: cssVariables has no derived keys."

What "normalization" does, in order:
1. Run typed slices' `reconcileFromCssVars` in dependency order (palettes first, since shadow/gradient might reference palette values).
2. Union the `consumed` sets and delete those keys from `cssVariables`.
3. Run `toTheme`-style serialization to verify round-trip stability.

No call site outside the storage layer needs to know about this. `loadFromFile` consumes already-normalized themes; the renderer's layered overwrite becomes a no-op (typed-derived values match what `cssVariables` no longer contains).

### 3.3 Renderer becomes order-independent

After §3.2, every typed-slice-owned variable is owned by exactly one writer. The fixed overlay order in `editorRenderer.ts:42` survives but is no longer load-bearing — it's defensive. A future change to that order can't break a saved manifest.

---

## 4. Implementation phases

Each phase ships independently and leaves the system in a working state. Don't bundle.

### Phase 1 — Palette slice reconciler + storage hook

Smallest viable win. Fixes the concrete runegoblin case and the only one we've observed in practice.

**Files touched:**
- `src/editor/core/palettes/paletteDerivation.ts` — add `reconcilePalettesFromCssVars`.
- `vite-plugin/themeFileApi.ts` — wrap `themesResource` GET + manifest-apply theme payload with a normalize call.
- `themes/default.json`, `themes/runegoblin.json` — normalized in-place via the migration script (Phase 4).

**Net behavior change:** importing `--color-brand-500: #bd6a08` produces orange brand ramps on next paint, with no editor-side intervention. The fix to `temp/build-runegoblin-bundle.py` (the `PALETTE_BASE_TOKEN` overlay) becomes unnecessary and gets removed.

**Out of scope:** font / shadow / gradient reconciliation.

### Phase 2 — Font slice reconciler

Imported themes with explicit `--font-*` literals (no fontStack equivalent) currently get stomped by `resolveFontStacks` in `themeFileApi.ts:120`. The reconciler clears the conflicting fontStack so the `cssVariable` passes through.

**Files touched:**
- `vite-plugin/themeFileApi.ts` — split `resolveFontStacks` into "build typed stacks → derive vars" so the reconciler can edit `theme.fontStacks` symmetrically.
- The `temp/build-runegoblin-bundle.py` clearing of `fontStacks` becomes unnecessary.

### Phase 3 — Shadow + gradient slice reconcilers

Lowest-priority because neither has hit a user-visible bug yet. Schedule when an importer needs them, or when we want to seal the invariant.

**Files touched:**
- `src/editor/core/store/editorStore.ts` (or sibling shadow / gradient modules) — add inverse parsers.
- Parsing CSS `box-shadow` and `linear-gradient` strings is non-trivial; use a tokenizer rather than a regex to avoid Cargo-Cult fragility.

### Phase 4 — One-time migration of seeds on disk

`scripts/normalize-themes.ts` walks every `themes/*.json` and `component-configs/*/*.json`, runs normalize, writes back, commits. Existing `default.json` will lose ~50 dead palette-derived keys from `cssVariables`; the file shrinks by a few KB and gains the property that future diffs are signal-only.

Run once. Check in the cleaned files.

---

## 5. What's deliberately not in this plan

- **Apply-time write-back guard.** Originally proposed; dropped. With Phase 1's storage-layer normalize, an apply can't observe inconsistent state — there's no consumer to defend.
- **Reconcile at every entry point (load + apply + save + GET).** Single door is sufficient if it's the storage door. Save is already self-consistent via `toTheme`; load and apply both pass through the storage layer.
- **Making `cssVariables` fully canonical (the inverse direction).** Considered, rejected. It would require lossless inverse parsers for every typed slice and lose the curve / typed-state richness the editor depends on.
- **A unified `normalizeTheme` super-function.** Replaced by per-slice contracts plus a thin orchestrator (§3.1), so adding a future typed slice doesn't edit a central file.

---

## 6. Risks and open questions

### 6.1 Curve approximation on imported palettes

Snapping `baseColor` to an imported `--color-{family}-500` keeps the default curve shape. The 100 / 850 / 950 stops in the imported `cssVariables` are *discarded* unless we also fit curves to them.

Three options:
- **(a) Accept the approximation.** Document it. Surface a small "imported — curves approximate" badge in the PaletteEditor when reconcile snapped a baseColor. Cheap.
- **(b) Fit curves to imported stops.** Pass 100 / 500 / 950 as curve control points; solve for the lightness/saturation curves that hit them. Real color-science work; defers Phase 1.
- **(c) Persist imported color stops as palette overrides.** The PaletteEditor already supports per-step overrides (the "Clear Overrides" button in the UI). Encode imported stops as overrides on top of the default curve. Loses fidelity if the user later edits curves but preserves it at import time.

Recommendation: ship **(a)** in Phase 1; revisit **(c)** if users complain about ramp drift. **(b)** is a real project, not a side trip.

### 6.2 Component config configs vs theme

Component-config files also have two-source ambiguity: `aliases` (their typed slice) and the values they resolve to. Less acute than theme drift because the alias → resolved-value derivation is mechanical and the editor doesn't recompute it. Audit before deciding whether to extend this plan there.

### 6.3 Backwards compatibility

`schemaVersion` bump on themes. Old clients reading a normalized theme see fewer `cssVariables` keys — they should not crash (typed slices recompute the values), but verify against any external consumers (the npm package's runtime, the production sync path).

### 6.4 Test coverage

A single round-trip property test pays for the whole plan: *for any theme T, `normalize(parse(serialize(load(T))))` equals `normalize(T)`.* Plus a fixture-based test that imports the runegoblin tokens.css, applies the manifest, and asserts `--color-brand-500` rendered = `#bd6a08`. Both are fast and catch regressions of the systemic class.

---

## 7. Out-of-scope follow-ups noted while drafting

- The `applyManifest` server handler currently writes `tokens.css` + `fonts.css` directly. After Phase 2, font sync becomes simpler (the typed/cssVar split is clean). Worth revisiting that handler's responsibilities at that point — it currently knows about every typed domain.
- `editorRenderer.ts:42`'s fixed overlay order will be obsolete after Phase 3. A short comment marking it as historical defense is enough; don't refactor it away preemptively.

---

## 8. Decisions (accepted 2026-05-18)

1. **Typed state is canonical (§2). Accepted.** Once And Only Once, Information Hiding, matches existing `toTheme` behaviour.
2. **Curve approximation: (a) accept-and-badge for Phase 1, (c) palette overrides as contingency (§6.1). Accepted.** YAGNI / KISS for Phase 1; (b) curve-fitting is a separate project, deferred indefinitely unless ramp drift becomes a real complaint.
3. **Phase ordering 1 → 2 → 3 → 4. Accepted.** Phases ship independently; Phase 1 alone fixes the observed bug class.

Implementation cleared to start with Phase 1.

## 9. Phase 1 spike outcome (2026-05-18)

**Reverted, with finding.** The server-side reconciler approach can't distinguish two legitimately different cases on the same data shape:

- **Case A — import.** `cssVariables` carries authoritative values; typed state is default-inherited. Right behaviour: snap baseColor to cssVariables. (runegoblin)
- **Case B — legacy drift.** Typed state has been hand-edited via the editor over time; `cssVariables` is a stale serialization from an older `toTheme`. Right behaviour: keep typed state, strip cssVariables. (default.json today: `editorConfigs.Accent.baseColor = #008582` teal, `cssVariables['--color-accent-500'] = #9d7f00` olive — page renders teal because typed-slice wins; the olive in cssVariables is dead data.)

The reconciler I shipped (`reconcilePalettesFromCssVars`) snapped on every divergence, so running it over `default.json` flipped the Accent baseColor from teal to olive and would have visibly changed the default theme's appearance at the next page load. Caught by the dry-run on disk before the wiring landed at runtime.

**What was kept:**
- `syncTokensToCss` now overlays `palettesToVars(editorConfigs)` over `theme.cssVariables` before writing, mirroring the client renderer's overlay order (`editorRenderer.ts:42`). Strict improvement: tokens.css and the runtime renderer now agree on which value wins for palette tokens; the previous version let `tokens.css` end up with stale `cssVariables` values that the renderer was always going to stomp.

**What was reverted:**
- `reconcilePalettesFromCssVars` function (deleted from `paletteDerivation.ts`).
- `normalizeTheme` helper + all four call sites in `themeFileApi.ts`.
- `scripts/normalize-themes.ts` (deleted; broke the default theme).
- The "remove `PALETTE_BASE_TOKEN`" change to the builder — overlay restored. The builder once again writes `editorConfigs.{family}.baseColor` AND the cssVariables palette ramp for imports, mirroring what the editor's `toTheme` would do if the import had gone through the UI.

**Why builder-writes-both is the right level for now:**
- The importer knows its own intent — it's the one moment in the lifecycle where "case A vs case B" is unambiguous. No heuristic, no flag, no reference data.
- KISS / YAGNI: zero new surface area in the runtime path.
- The systemic problem (two sources of truth) is unsolved at the architectural level, but no user-visible drift occurs in practice as long as imports use the importer contract (write both representations).

**What's still missing for "robust manifest switching":**
- A signal to distinguish import-fresh palettes from edited palettes inside the file format. Candidate: a per-palette `_imported: true` flag set by importers, cleared on first user edit, used by a future reconciler as the opt-in switch. Adds a single bit of state but resolves the ambiguity once and for all.
- Server-side validation that warns on cssVariables/typed-state drift without auto-fixing — surfaces the trap without changing semantics. Cheap to add; defers the canonical-direction question.
- The full Phase 2/3/4 work (fonts / shadows / gradients reconcile, disk migration) is on hold until the import-flag design lands.

**Outstanding C2 concerns (from /C2audit on prior turn):**
- M1 "wrong abstraction" (single normalize across slices) — sidestepped since no normalize exists.
- M2 "cargo-cult at every entry point" — sidestepped, ditto.
- m1 "source of truth ambiguity not resolved" — explicitly unresolved now, called out here.
- m2 "curve recovery handwave" — moot for Phase 1 since import-time setting of baseColor avoids curve recovery entirely.

## 10. Phase 1 completion via `_imported` flag (2026-05-18)

The flag landed and resolved m1 properly. Three pieces, all small:

**Type change.** `PaletteConfig` gains optional `_imported?: boolean` (`themeTypes.ts:10`). Underscore-prefixed = metadata sentinel, conventionally ignored by equality checks. Importers set it to true on each palette they overlay; the reconciler clears it on first read.

**Reconciler reinstated, now gated.** `reconcilePalettesFromCssVars` lives in `paletteDerivation.ts`. Two operations:
- **Snap** runs only when `_imported === true`. Chromatic palettes: `baseColor ← cssVariables['--color-{ns}-500']`. Gray palettes: `tintHue`+`tintChroma` derived via OKLCH from the same anchor. Flag is cleared.
- **Strip** runs unconditionally. Every variable `derivePaletteVars` would produce gets reported in `consumed`; the caller drops those keys from `cssVariables`. The renderer always overlays `palettesToVars` (`editorRenderer.ts:42`), so stripped values were dead data — the strip is a cleanup, not a behaviour change.

Six unit tests in `paletteDerivation.test.ts` cover: flagged-snaps, unflagged-no-op, gray-mode OKLCH path, flag-without-anchor (clears anyway), unconditional consume, idempotency.

**Single-door wiring.** `normalizeTheme` helper in `themeFileApi.ts` runs reconcile + strip. Called from `handleGetActiveTheme`, `handleGetProductionTheme`, `handleThemeByName` GET, and `handleApplyManifest`. Editor-authored themes are no-ops at every door (no `_imported` flag); imported themes converge on first read.

**Importer contract.** `temp/build-runegoblin-bundle.py` now sets `_imported: True` on every palette config it overlays. Future importers follow the same one-line contract.

**End-to-end verified (live dev server):**
- `PUT /api/manifests/runegoblin/apply` → flips pointers, syncs `tokens.css`. Normalized response: `Brand.baseColor=#bd6a08`, `_imported=false`, `cssVariables['--color-brand-500']` stripped.
- `PUT /api/manifests/default/apply` → no baseColor mutation; `editorConfigs.Accent.baseColor` stays `#008582` (teal). cssVariables palette keys stripped (cleanup only — page renders teal as before).

**Side improvement that's stayed in:** `syncTokensToCss` now overlays `palettesToVars(editorConfigs)` over `theme.cssVariables` before writing, mirroring the client renderer's overlay order. `tokens.css` and the runtime renderer now agree on which value wins for palette tokens.

### What's done vs. deferred

| Plan item | Status |
|---|---|
| Phase 1 — palette reconciler at storage layer | **Done** via `_imported` flag |
| Phase 2 — font reconciler | **Not needed for runegoblin.** `migrateThemeFonts` already strips `--font-*` from `cssVariables` when typed `fontStacks` are present, and the runegoblin builder clears `fontStacks` so the imported font names pass through. If a future importer wants typed font stacks AND specific cssVariables, a font-side `_imported` flag follows the same pattern. **Deferred** until a real use case. |
| Phase 3 — shadow + gradient reconcilers | **Not blocking.** No current importer touches these. Same `_imported`-style pattern is available if needed. **Deferred.** |
| Phase 4 — disk migration script | **Skipped.** The original `scripts/normalize-themes.ts` regressed default.json (§9). With the flag, an in-memory normalize at every read door is enough — the file invariant is achieved at the API boundary, not on disk. Themes on disk can stay un-normalised; the storage layer normalises every time. |
| Decision 2a's "imported / curve approximate" badge | **Skipped for now.** With clear-on-read semantics the badge would only flash for a single frame (between import-write and first read) and never display to a user. To make it useful we'd need either disk-persistent flag clearing or transient client-side state — deferred until someone asks. |

### Why this is the right stopping point

- The runegoblin manifest works end-to-end with no user-visible drift, no editor regressions.
- The systemic problem (two sources of truth for palette values) is resolved at the doors that matter — `applyManifest`, `loadFromFile` (via `getActiveTheme`), and direct theme GETs.
- Future typed slices can follow the same template (`_imported` flag + per-slice reconciler + storage-layer call site). The pattern composes.
- No speculative generality: each piece is concretely demanded by the runegoblin case or the renderer-vs-sync mismatch we fixed along the way.

The plan was about making "save a manifest and switch it" load-bearing. That now works for any theme an importer emits using the documented contract (`_imported: true` on overlaid palettes + writing the cssVariables anchor). Editor-authored themes stay round-trip-stable.

## 11. Phase 1.5 — shareable bundles (2026-05-18)

Manifest *switching* was settled in §10. This phase added the *transport* half: send a single file to someone, they import, everything materialises with no manual file shuffling. Approach was a deliberate compromise — keep the local manifest lightweight (pointer-only, as it has always been) and add a separate bundle format for sharing, so the local file never drifts and the transport artifact is always a fresh snapshot.

### What shipped

**New types** (`src/editor/core/themes/themeTypes.ts`):
- `ManifestBundle` interface — `kind: "manifest-bundle"` discriminator, `schemaVersion: 1`, `liveTokensVersion`, `exportedAt`, inlined `manifest` + `theme` + `componentConfigs` (keyed by `${comp}/${configName}`, non-default only).
- Existing `Manifest` interface — unchanged.

**Server endpoints** (`vite-plugin/themeFileApi.ts`):
- `GET /api/manifests/:name/export` — assembles the bundle from disk, returns JSON with `Content-Disposition: attachment` so browsers save rather than display.
- `POST /api/manifests/import` — validates `kind` + `schemaVersion`, allocates fresh names for collisions, materialises files, rewrites manifest pointers through the rename map, writes the manifest. Returns `{ ok, manifest, renames }`. Does **not** auto-apply.

**Collision strategy** — rename with numeric suffix via the new `vite-plugin/files/nameAllocator.ts` module (`nextAvailableName`). Receiver's local `runegoblin.json` is never overwritten; the inbound bundle's theme becomes `runegoblin-2.json` and the imported manifest's pointers are rewritten to match. Server returns the full rename map so the UI can surface what happened.

**Client helpers** (`src/editor/core/manifests/manifestService.ts`):
- `exportManifest(fileName)` — hidden-anchor download trick; no new infrastructure.
- `importManifest(bundle)` — POSTs and returns the rename map.

**UI** (`src/editor/ui/ManifestFileManager.svelte` + `FileLoadList.svelte`):
- `FileLoadList` gained optional `onexport` + `exportTitle` props; renders a download icon per row (mirrors the per-row delete affordance).
- Manifest panel passes `onexport={handleExport}` to the Load dialog and added an `Import…` button to the main action row. Import opens a file picker, reads JSON, validates the `kind` discriminator client-side, calls `importManifest`. On non-empty rename map, surfaces an alert listing what was renamed.

**Tests** (`vite-plugin/files/nameAllocator.test.ts`):
- 5 unit tests on the pure allocator: base case, first collision, occupied-suffix walk, gap handling, max-attempts safeguard.

### End-to-end verification (live dev server)

| Scenario | Outcome |
|---|---|
| Export runegoblin → bundle JSON | `kind: "manifest-bundle"`, 12 non-default component configs inlined, 5 `"default"` entries omitted from `componentConfigs`, theme + manifest fully embedded |
| Backup → re-import same bundle | All files materialise with original names, rename map empty, apply produces orange brand (`--color-brand-500: #ce7a25`) |
| Re-import with files present | Theme + 12 configs + manifest all renamed with `-2` suffix, pointer rewrites verified, apply against `runegoblin-2` works identically |
| Validation: wrong `kind` | 400 with descriptive message |
| Validation: wrong `schemaVersion` | 400 with descriptive message |
| Validation: malformed JSON | 400 |
| Validation: missing required fields | 400 |

### Why bundle-as-separate-format and not always-inline `_embedded`

Earlier in the same session I drafted (and the user revised) an alternative where every saved manifest would inline its referenced files in an `_embedded` envelope. We rejected it for two reasons documented in the plan revision:

1. **Drift.** Inlined snapshots captured at save-time go stale if the user later edits the referenced theme directly. The light pointer-only manifest can't drift.
2. **Mixing concerns.** Local manifest = working file; bundle = transport artifact. Different lifecycles, different sizes. One format per concern.

The cost: two file formats. Conversion is one-directional at each boundary (export → bundle; import → unpack to manifest + files), so no data lives in two representations at the same time. Bundles never persist server-side.

### What's intentionally not in scope

- **Hash-merge on collision** (reuse existing file if content matches): YAGNI. Rename-with-suffix is the safest default and the rename map gives the UI all the information it needs.
- **Live-tokens version mismatch warnings**: `liveTokensVersion` is captured in the bundle for future use, but the UI doesn't yet warn on mismatch. Add when version skew bites in practice.
- **Server-handler unit tests with mocked fs**: skipped in favour of e2e verification against the live dev server. The handlers are short and linear; the algorithmically interesting piece (`nextAvailableName`) is unit-tested in isolation.
- **Auto-apply on import**: the import flow stops at "manifest row appears in the list". Click Load explicitly. Keeps the import action reversible (user can delete the imported manifest if it's not what they wanted).
- **Bundle versioning beyond v1**: stamped, not yet exercised. When `schemaVersion` needs to evolve, add a migration path through the same `runMigrations` machinery that themes already use.

### Composition with Phase 1

The Phase 1 `_imported` flag + normalize-on-read is what makes imported bundles render correctly. Bundle import writes the inlined theme to disk; the next GET runs `normalizeTheme`, which honours the bundle's `_imported: true` palette flags and snaps `baseColor` to the imported `--color-{ns}-500` anchors. Without Phase 1, an imported runegoblin theme would render in pink-and-teal default colours despite having orange values inlined. The two phases compose cleanly: import is the transport, normalize is the make-it-render-right step.

### Net for "robust manifest switching"

Save → switch → share → import → switch. Every step works. The flag, the normalize, the rename allocator, the bundle envelope — each is small in isolation and composes into the round-trip the user originally asked for.
