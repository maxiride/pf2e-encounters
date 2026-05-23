# Project structure refactor

**Goal.** Make the three parts of the project visible in `src/`: the **editor** (npm-published product), the **system** (token-consuming components + token contract), the **demo** (example/explanation), and the user's **app** (the host site that consumes the package). Within the editor, replace the catch-all `lib/` with subfolders named for concrete domains, not abstract roles.

Status: planning. No file moves yet.

---

## Final layout

```
src/
  editor/                             ── Part 1: the editor (npm-published) ──
    core/
      store/        editor store: history, scopes, mutate, persistence, keybindings
                      editorCore.ts, editorStore.ts, editorRenderer.ts,
                      editorPersistence.ts, editorKeybindings.ts,
                      editorViewStore.ts, editorConfigStore.ts,
                      editorConfig.ts, editorTypes.ts, editorStore.test.ts
      themes/       theme load/save/init + theme data sub-domains
                      themeService.ts, themeInit.ts, themeTypes.ts,
                      slices/ (columns, components, domainVars, fonts,
                              gradients, overlays, palettes, shadows),
                      migrations/ (dated migration files + index + test),
                      parsers/ (globalRootBlock)
      manifests/    manifestService.ts
      components/   componentConfigService.ts, componentConfigKeys.ts,
                      componentPersist.ts, componentConfig.test.ts,
                      lazyConfig.test.ts
      fonts/        fontLoader.ts, fontMigration.ts, fontParse.ts
      palettes/     paletteDerivation.ts, oklch.ts, tokenRegistry.ts
      storage/      storage.ts, files/ (versionedFileResourceClient.ts — renamed from versionedFileResource.ts to make the client/server pair explicit)
      routing/      router.ts, navLinkTypes.ts, parentRouteStore.ts
      cssVarSync.ts            DOM bridge — :root writes + parent-iframe fan-out
      productionPulse.ts       revision counter for production-pointer flips
      flashStatus.ts           transient status helper for file managers
      index.ts                 (was src/lib/index.ts — main package entry)

      Note: `paddingSplit.test.ts` moves into `store/` alongside `editorStore.test.ts`
      and `editorRenderer` — it exercises `setComponentAlias` + `componentsToVars`
      + `deriveCssVars` for the `padding-split` token kind. Live coverage, not orphan.

    overlay/                   LiveEditorOverlay + ColumnsOverlay + their state
                                 LiveEditorOverlay.svelte, ColumnsOverlay.svelte,
                                 columnsOverlay.ts, overlayState.ts

    pages/                     Editor.svelte (+.d.ts), EditorShell.svelte,
                               ComponentEditorPage.svelte (+.d.ts)

    component-editor/          unchanged tree (per-component editors + scaffolding)
                                 — internal-only imports update; folder name stays

    ui/                        UI* primitives + sections/ + palette/
                                 + colocated helpers (copyPopover.ts, scrollSection.ts)

    styles/                    ui-editor.css, ui-form-controls.css

  system/                             ── Part 1b: design system (npm-published) ──
    components/   Badge, Button, Card, … (token consumers), types.ts,
                  __tests__/, FloatingTokenTags.svelte + .css
    styles/       tokens.css (variable contract), fonts.css,
                  fonts/ (bundled WOFFs), _padding.scss
    data/, assets/

  demo/                               ── Part 2: example + explanation ──
    Demo.svelte, FloatingTagsPlayground.svelte, demo.css

  app/                                ── Part 3: the user's actual site ──
    App.svelte, main.ts, Home.svelte, site.css, vite-env.d.ts

vite-plugin/                          ── hoisted to repo root (Node runtime, separate build) ──
  index.ts, themeFileApi.ts,
  files/ (versionedFileResourceServer.ts — renamed from versionedFileResource.ts to make the client/server pair explicit; pairs with editor/core/storage/files/versionedFileResourceClient.ts)
  tsconfig.json   (new — Node-targeted, no DOM lib)
```

Untouched top-level siblings: `themes/`, `manifests/`, `component-configs/`, `docs/`, `temp/`, `public/`, `scripts/`, `bench/`, `c2audit/`, `dist/`, `dist-plugin/`.

---

## Naming conventions (locked)

- **`ui-` is the canonical namespace marker** for the editor layer. Svelte components keep PascalCase (`UIPillButton.svelte`, class `UIPillButton`) because Svelte requires it; their root CSS class is kebab-case `.ui-pill-button`; folder names and docs use `ui-`.
- **System components** are plain-named (`Badge`, `Card`) — no `UI` prefix.
- **Files-as-domains.** Subfolders in `editor/core/` are named for the *thing* they hold (`themes/`, `manifests/`, `fonts/`), not the *role* (`services/`, `state/`).

---

## CSS placement (locked)

| File | Lives in | Role |
|---|---|---|
| `tokens.css` | `src/system/styles/` | Variable contract — edited by the editor; read by all surfaces |
| `fonts.css` + `fonts/` | `src/system/styles/` | Bundled `@font-face` and WOFFs (system asset) |
| `_padding.scss` | `src/system/styles/` | System SCSS partial |
| `site.css` | `src/app/` | The user's site stylesheet — extends tokens; users add their own here |
| `demo.css` | `src/demo/` | Demo-specific typography & layout (split out of today's `site.css`) |
| `ui-editor.css` | `src/editor/styles/` | Editor chrome |
| `ui-form-controls.css` | `src/editor/styles/` | Editor form controls — kept separate, placed alongside |

Imports today:
- `src/main.ts` imports `./styles/tokens.css` + `./styles/fonts.css` → become `../system/styles/tokens.css` + `../system/styles/fonts.css` (from `src/app/main.ts`).
- `Home.svelte`, `Demo.svelte`, `FloatingTagsPlayground.svelte` all import `../styles/site.css` today. After split:
  - `Home.svelte` → `./site.css`
  - `Demo.svelte` → `./demo.css`
  - `FloatingTagsPlayground.svelte` → `./demo.css`

---

## Vite plugin: out of `src/`

Moving `src/vite-plugin/` → `/vite-plugin/` at repo root.

- **Why.** Plugin code runs in Node (build/dev-server context), not the browser. Different runtime, different `tsconfig`, separate build pipeline (tsup → `dist-plugin/`). Keeping it in `src/` falsely implies it ships to the client bundle.
- **Convention.** Published Vite plugins almost always live at repo root in single-package layouts (`/plugin/`, `/vite-plugin/`).
- **The two `versionedFileResource.ts` files are a deliberate client/server pair, not duplication.** Browser side uses `fetch`; Node side uses `fs`/`path`. Both stay, both rename: `versionedFileResourceClient.ts` (under `editor/core/storage/files/`) + `versionedFileResourceServer.ts` (under `vite-plugin/files/`). Sharing one filename across two runtimes was obscuring the pairing.

---

## What about `editor/component-editor/` ?

Folder stays. It's already well-named and cohesive: per-component editors (`BadgeEditor.svelte` …) + `scaffolding/` (the framework that hosts them — `ComponentEditorBase`, `LinkedBlock`, `StateBlock`, `VariantGroup`, …). Internal imports update to reflect new `editor/` ancestor; no internal reshuffle.

---

## Files that change but don't move

### `package.json`

`files:` array — replace `src/lib`, `src/ui`, `src/component-editor`, `src/components`, `src/pages/Editor.svelte` (+ .d.ts), `src/pages/EditorShell.svelte`, `src/pages/ComponentEditorPage.svelte` (+ .d.ts), `src/styles/*`, `src/data`, `src/assets`, `dist-plugin` →

```
src/editor,
src/system,
dist-plugin,
!**/*.test.ts,
!**/*.spec.ts,
!**/__tests__/**
```

(One subtree per published surface; `dist-plugin` for the plugin bundle.)

`exports:` map — every published path changes:

| Subpath | Was | Becomes |
|---|---|---|
| `.` | `./src/lib/index.ts` | `./src/editor/index.ts` |
| `./component-editor` | `./src/component-editor/index.ts` | `./src/editor/component-editor/index.ts` |
| `./ui` | `./src/ui/index.ts` | `./src/editor/ui/index.ts` |
| `./editor` | `./src/pages/Editor.svelte` | `./src/editor/pages/Editor.svelte` |
| `./component-editor-page` | `./src/pages/ComponentEditorPage.svelte` | `./src/editor/pages/ComponentEditorPage.svelte` |
| `./components/*` | `./src/components/*` | `./src/system/components/*` |
| `./vite-plugin` | `./dist-plugin/index.{js,cjs,d.ts}` | unchanged (built artifact path stays) |
| `./styles/ui-editor.css` | `./src/styles/ui-editor.css` | `./src/editor/styles/ui-editor.css` |
| `./app/tokens.css` | `./src/styles/tokens.css` | `./src/system/styles/tokens.css` (renamed from `./starter/tokens.css`) |
| `./app/site.css` | `./src/styles/site.css` | `./src/app/site.css` (renamed from `./starter/site.css`) |
| `./app/fonts.css` | `./src/styles/fonts.css` | `./src/system/styles/fonts.css` (renamed from `./starter/fonts.css`) |

Open question: rename `./starter/*` exports to `./app/*` for consistency, or keep `./starter/*` as the published name? Renaming is a breaking change for consumers. **Recommend: keep `./starter/*` published name, even though the internal folder is `app/`.** Published surface ≠ internal layout; consumers see `./starter/tokens.css` meaning "starter content," which is accurate.

### `vite.config.ts`

```ts
- import { themeFileApi } from './src/vite-plugin';
+ import { themeFileApi } from './vite-plugin';
  …
- themeFileApi({ themesDir: 'themes', tokensCssPath: 'src/styles/tokens.css' }),
+ themeFileApi({ themesDir: 'themes', tokensCssPath: 'src/system/styles/tokens.css' }),
```

### `tsup.config.ts`

```ts
- entry: ['src/vite-plugin/index.ts'],
+ entry: ['vite-plugin/index.ts'],
```

Plus a new `vite-plugin/tsconfig.json` (Node-targeted, no DOM lib) and update root `tsconfig.json` `include` if needed.

### `scripts/check-editor-font-isolation.mjs`

Hardcoded paths:

```js
- 'src/styles/ui-editor.css', 'src/styles/ui-form-controls.css'
+ 'src/editor/styles/ui-editor.css', 'src/editor/styles/ui-form-controls.css'

- editorSvelteDirs: ['src/ui', 'src/component-editor']
+ editorSvelteDirs: ['src/editor/ui', 'src/editor/component-editor']

- 'src/pages/Editor.svelte', 'src/pages/EditorShell.svelte', 'src/pages/ComponentEditorPage.svelte'
+ 'src/editor/pages/Editor.svelte', 'src/editor/pages/EditorShell.svelte', 'src/editor/pages/ComponentEditorPage.svelte'
```

Comment in the script also references "src/pages mixes editor pages with themed pages" — that mix no longer exists after the move; comment can simplify.

### `scripts/check-no-style-imports.mjs`

Walks `src/` recursively — no path updates needed.

### `src/App.svelte` → `src/app/App.svelte`

The `pageSources` object hardcodes paths:

```ts
pageSources={{
- '/': 'src/pages/Home.svelte',
- '/demo': 'src/pages/Demo.svelte',
- '/components': 'src/pages/ComponentEditorPage.svelte',
- '/editor': 'src/pages/Editor.svelte',
- '/playground/floating-tags': 'src/pages/FloatingTagsPlayground.svelte',
+ '/': 'src/app/Home.svelte',
+ '/demo': 'src/demo/Demo.svelte',
+ '/components': 'src/editor/pages/ComponentEditorPage.svelte',
+ '/editor': 'src/editor/pages/Editor.svelte',
+ '/playground/floating-tags': 'src/demo/FloatingTagsPlayground.svelte',
}}
```

Dynamic `import()` calls update similarly. The "Show page source" overlay reads from these strings; verify it still resolves after move.

---

## Import update strategy

52 files contain relative cross-folder imports today. Strategy:

1. **No path aliases yet.** Keep relative imports; the new top-level folders are shallow enough that paths like `../core/themes/themeService` stay readable. We can introduce `$editor`, `$system` aliases later if pain emerges, but don't bundle that with the move.
2. **Order matters.** Move folders **leaf-first** so each move only updates incoming-edge imports:
   1. Move `src/components/` → `src/system/components/` (leaf — many consumers, few internal imports).
   2. Move `src/styles/` files to their new homes per the CSS table above.
   3. Move `src/ui/` → `src/editor/ui/`.
   4. Move `src/component-editor/` → `src/editor/component-editor/`.
   5. Move `src/lib/` → `src/editor/core/` (and split into subfolders).
   6. Move `src/pages/` (editor pages → `src/editor/pages/`; demo pages → `src/demo/`; Home → `src/app/`).
   7. Move `src/App.svelte`, `src/main.ts`, `src/vite-env.d.ts` → `src/app/`.
   8. Hoist `src/vite-plugin/` → `/vite-plugin/`.
3. **One PR.** Discoverability cost of split PRs (every import path changes again) outweighs review-size cost of one PR. Reviewer reads the layout, spot-checks a few touched files, and trusts `npm run check && npm test && npm run build` to catch the rest.
4. **`git mv` everywhere.** Preserves history. Avoid mixing rewrites with renames; if a file needs internal edits (e.g. subfolder split inside `editor/core/`), move first, then edit in a follow-up commit so blame stays clean.

---

## Verification gates

After each major step (folder move, not file move):
- `npm run check` — svelte-check passes
- `npm test` — vitest passes
- `npm run check:no-style-imports`
- `npm run check:editor-font-isolation`
- `npm run dev` and click through `/`, `/demo`, `/components`, `/editor` — visual sanity

After all moves:
- `npm run build` — production build clean
- `npm run build:plugin` — plugin build clean
- `npm run check:smoke-install` — published package shape correct

---

## Notes

1. **Path aliases (`$editor`, `$system`).** Defer. The move itself is the win; aliases can come later if relative paths get painful.
2. **`scripts/check-editor-font-isolation.mjs` comment update.** The comment about "src/pages mixes editor + themed pages" no longer applies after the move — pages are now sorted by surface. Simplify when touching the file.
3. **`temp/` worksheets.** Any open worksheets that reference current paths (e.g. token-naming refactor) — flag during the move so they don't rot.
4. **External consumer.** One external project imports from `@motion-proto/live-tokens/starter/*`. After this refactor that path becomes `/app/*` — call out in CHANGELOG.

---

## Decision log

- **2026-05-17.** Three-part split confirmed (`editor/`, `system/`, `demo/`, `app/`). `starter/` rejected as internal folder name; user's actual site = `app/`. Published export path `./starter/*` retained for back-compat.
- **2026-05-17.** `ui-` is the canonical namespace marker; PascalCase only forced by Svelte component naming.
- **2026-05-17.** Vite plugin hoists to repo root. Different runtime + separate build = wrong fit for `src/`.
- **2026-05-17.** `editor/core/` subfolders named by concrete domain (`themes/`, `manifests/`, `fonts/`), not abstract role (`services/`, `state/`).
- **2026-05-17.** `ui-editor.css` and `ui-form-controls.css` stay separate, both under `src/editor/styles/`.
- **2026-05-17.** `site.css` splits into `demo.css` (under `src/demo/`) + `site.css` (under `src/app/` as user-extension surface).
- **2026-05-17.** `./starter/*` exports rename to `./app/*` (breaking change accepted — one external consumer).
- **2026-05-17.** Two `versionedFileResource.ts` files are a client/server pair, not duplication. Rename to `versionedFileResourceClient.ts` (browser) + `versionedFileResourceServer.ts` (plugin); keep both.
- **2026-05-17.** `paddingSplit.test.ts` is live coverage, not orphan — moves into `editor/core/store/` alongside other store/renderer tests.
- **2026-05-17.** Keep `versionedFileResource(Client|Server)` naming despite "version" being a slight misnomer for "named variant of an artifact." Renaming to `editableArtifact*` rejected: less churn. JSDoc clarifies meaning.
- **2026-05-17.** Production-pointer scaffolding is still load-bearing for themes + component configs. Manifests dropped production (2026-05-15 simplification) but their consumer ignores those methods via `never` generic. A future audit could prune production from the abstraction when the last consumer drops it; out of scope here.
