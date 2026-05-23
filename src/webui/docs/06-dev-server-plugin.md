# Dev-server plugin

The Vite plugin lives in `vite-plugin/` at the repo root. It turns "save
in the editor" into "JSON file on disk." Its entry point is
`themeFileApi(opts)`, exported from `vite-plugin/index.ts` and consumed
via the `@motion-proto/live-tokens/vite-plugin` subpath export.

The plugin is **dev-only**. Production builds do not include it;
production reads `tokens.css` and `fonts.css` as static CSS, with no
`/api/*` routes involved.

## Configuration

```ts
// vite.config.ts
import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';

export default defineConfig({
  plugins: [
    svelte(),
    themeFileApi({
      themesDir: 'themes',
      tokensCssPath: 'src/system/styles/tokens.css',
      // Optional overrides:
      fontsCssPath: 'src/system/styles/fonts.css',     // default: sibling of tokensCssPath
      apiBase: '/api',                                  // default: '/api'
      componentConfigsDir: 'component-configs',
      componentsSrcDir: 'src/system/components',
      manifestsDir: 'manifests',
    }),
  ],
});
```

## What it does

```mermaid
flowchart TB
    Vite[Vite dev server]
    subgraph Plugin["themeFileApi(opts)"]
        Config["config()<br/><small>injects __PROJECT_ROOT__</small>"]
        Configure["configureServer(server)<br/><small>seeds files, mounts middleware</small>"]
        HMR["handleHotUpdate(ctx)<br/><small>regenerates default.json on .svelte change</small>"]
    end

    subgraph Boot["On dev-server start"]
        SeedThemes["ensureThemesDir<br/><small>seed default.json + meta files</small>"]
        SeedComps["ensureComponentConfigsDir<br/><small>generate default.json per component</small>"]
        SeedMan["ensureManifestsDir<br/><small>seed default manifest</small>"]
    end

    subgraph Middleware["On every /api/* request"]
        Dispatch["dispatch(req, res, routes)"]
        Routes[routes table]
        Handlers[per-route handlers]
    end

    Vite --> Plugin
    Configure --> Boot
    Configure --> Middleware
    Dispatch --> Routes --> Handlers
    HMR --> SeedComps
```

Three responsibilities:

1. **Seed defaults.** On first start, write `themes/default.json` if
   missing, regenerate `component-configs/<id>/default.json` from each
   component's `:global(:root)` block, and seed
   `manifests/default.json`.
2. **Serve `/api/*`.** Themes CRUD, component-config CRUD, manifests
   CRUD.
3. **Inject `__PROJECT_ROOT__`.** Vite `define` so `LiveEditorOverlay`'s
   "Page Source" button can build `vscode://file/<root>/<path>` URLs
   without each consumer adding their own `define`.

## Route table

The middleware uses a route table dispatched by `dispatch(req, res,
routes)` (`vite-plugin/files/routeTable.ts`). Each route is
`{ method, pattern, handler }`; `pattern` is either a literal string for
exact-match URLs or a `RegExp` for parameterized ones. The dispatcher
walks the table in order, runs the first match, and **catches all
throws → 500 JSON** so handlers can be linear and just throw on error.

Order matters because the `RegExp`s overlap. The active/production
patterns must come *before* the catch-all `:name` patterns:

```
/api/component-configs/button/active     ← matches COMP_ACTIVE_REGEX
/api/component-configs/button/production  ← matches COMP_PRODUCTION_REGEX
/api/component-configs/button/default_01  ← matches COMP_BY_NAME_REGEX
```

Without explicit ordering, the third pattern would also match the first
two with `name='active'` / `name='production'`. The route table is the
explicit ordering; the previous code maintained order via comment
warnings.

## Endpoints

### Themes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/themes` | List themes (name, fileName, updatedAt, isActive) |
| `GET` | `/api/themes/active` | Get the active theme JSON |
| `PUT` | `/api/themes/active` | Set the active theme — body: `{name}` |
| `GET` | `/api/themes/production` | Get the production theme info |
| `PUT` | `/api/themes/production` | Promote a theme to production — runs `syncTokensToCss + syncFontsToCss + syncComponentsToCss` |
| `GET` | `/api/themes/:name` | Get a theme JSON |
| `PUT` | `/api/themes/:name` | Save a theme; if `:name` is the production theme, also re-runs the syncs |
| `DELETE` | `/api/themes/:name` | Delete (rejected for `default`); if it was active, fall back to `default` |

### Component configs

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/component-configs` | List components: `[{name, activeFile, productionFile}]` |
| `GET` | `/api/component-configs/:comp/active` | Active config JSON |
| `PUT` | `/api/component-configs/:comp/active` | Set active — body: `{name}` |
| `GET` | `/api/component-configs/:comp/production` | Production config metadata + aliases |
| `PUT` | `/api/component-configs/:comp/production` | Promote — runs `syncComponentsToCss` |
| `GET` | `/api/component-configs/:comp/:name` | Get config JSON |
| `PUT` | `/api/component-configs/:comp/:name` | Save (rejected for `default`) |
| `DELETE` | `/api/component-configs/:comp/:name` | Delete (rejected for `default`); active/production fall back to `default` |
| `GET` | `/api/component-configs/:comp` | List configs for one component |

### Manifests

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/manifests` | List manifests |
| `GET` | `/api/manifests/active` | Get the active manifest JSON |
| `PUT` | `/api/manifests/active` | Set active — body: `{name}` |
| `GET` | `/api/manifests/:name` | Get a manifest JSON |
| `PUT` | `/api/manifests/:name` | Save (rejected for `default`) |
| `DELETE` | `/api/manifests/:name` | Delete (rejected for `default`) |
| `PUT` | `/api/manifests/:name/apply` | Atomic apply: flip theme + each component's `_active.json` pointer; return resolved theme + configs |

## `versionedFileResource`

Themes, per-component configs, and manifests use the same
active/production vocabulary. That vocabulary is implemented once, in
two halves:

- **Server.** `vite-plugin/files/versionedFileResourceServer.ts`
  exports `versionedFileResourceServer({dir, defaultName?})`. Returns
  `{ ensureDir, ensureMeta, filePath, getActiveName, getProductionName,
  setActiveName, setProductionName }`.
- **Client.**
  `src/editor/core/storage/files/versionedFileResourceClient.ts` exports
  `versionedFileResource<T, M, P>({baseUrl})`. Returns `{ list, load,
  save, remove, getActive, setActive, getProductionInfo,
  setProduction }`.

The themes resource and the manifests resource are constructed once at
plugin init; per-component resources are **lazily** constructed on
first access via the `componentResource(comp)` cache. That matters
because the set of components is discovered at runtime from
`src/system/components/*.svelte`; there is no static list.

## Sync functions

When a theme is **promoted to production** (or a save lands on the
already-production theme), three syncs run:

```mermaid
flowchart LR
    Promote["PUT /api/themes/production<br/>{name: 'green_goblin'}"]
    Promote --> SetProd[setProductionName]
    SetProd --> SyncTokens["syncTokensToCss<br/><small>rewrite --token: value;<br/>append additions block</small>"]
    SetProd --> SyncFonts["syncFontsToCss<br/><small>regenerate fonts.css from<br/>theme.fontSources</small>"]
    SetProd --> SyncComps["syncComponentsToCss<br/><small>rebuild :root:root override<br/>block from each component's<br/>_production.json</small>"]
    SyncTokens --> WriteCss[fs.writeFileSync tokens.css]
    SyncFonts --> WriteFonts[fs.writeFileSync fonts.css]
    SyncComps --> WriteCss2[fs.writeFileSync tokens.css]
```

### `syncTokensToCss(fileName)`

Reads the named theme, walks `tokens.css` line-by-line with a regex
that matches `--name: value;` declarations, and **replaces in place**
the value of every variable the theme overrides. Variables in the theme
that do not already appear in the file land in a trailing
`/* Token additions */` block before the closing brace.

The in-place rewriting is intentional. It keeps `tokens.css` diffs
minimal and preserves the file's original ordering, comments, and
category headers, so designers can hand-edit `tokens.css` and have
their work survive a promote of the same theme.

### `syncFontsToCss(fileName)`

Regenerates `fonts.css` from the theme's `fontSources`. Each source
emits one block:

- `font-face` sources contribute their `cssText` verbatim.
- `google` / `typekit` / `css-url` sources emit `@import url('<url>');`.

The file is fully overwritten. Fonts are an opaque registry, not a
hand-edited file.

### `syncComponentsToCss()`

Walks every component's `_production.json` and rebuilds a single
`:root:root { … }` block in `tokens.css` between
`/* component-aliases:start */` and `/* component-aliases:end */`
markers:

```css
/* component-aliases:start */
:root:root {
  /* button (green_goblin_button) */
  --button-primary-surface: var(--surface-success);
  --button-primary-hover-surface: var(--surface-success-high);
  /* … */
}
/* component-aliases:end */
```

The `:root:root` selector has specificity (0,0,2). That is higher than
each component's own `:global(:root)` declarations (0,0,1), so
production overrides win deterministically regardless of CSS chunk
ordering. When a component's production points to `default`, no
overrides are emitted (the source `.svelte` is authoritative).

## Hot-update: regenerating defaults

`handleHotUpdate(ctx)` listens for changes to
`src/system/components/*.svelte`. When a component's source changes:

```mermaid
sequenceDiagram
    participant Vite
    participant Plugin as themeFileApi
    participant Parser as extractGlobalRootBody
    participant FS as component-configs/<comp>/default.json

    Vite->>Plugin: handleHotUpdate({file})
    Plugin->>Plugin: file in COMPONENTS_SRC_DIR && .svelte?
    Plugin->>FS: read existing default.json (preserve createdAt)
    Plugin->>Parser: parse :global(:root) block
    Parser-->>Plugin: { '--btn-…': '--surface-…', … }
    Plugin->>FS: write new default.json
```

The editor does not need a full reload. `componentConfigService`
re-fetches the new defaults on its next call, and runtime state owns
the override layer regardless.

The HMR check uses `defaultStat.mtimeMs >= sourceStat.mtimeMs` to skip
regeneration when the existing default is already newer (which happens
on plugin restart against files that haven't changed). `createdAt` is
preserved across regeneration.

## Project root injection

```ts
config() {
  return {
    define: {
      __PROJECT_ROOT__: JSON.stringify(process.cwd()),
    },
  };
}
```

`LiveEditorOverlay` reads `__PROJECT_ROOT__` (with a `declare const`
fallback so TypeScript-only consumers do not need an ambient global) to
build the `vscode://` links for the "Page Source" button. The plugin
handles the injection so library consumers do not need to add their own
`define` entry. The README's `vite.config.ts` example explicitly notes
"You don't need a `define` entry for this."

## Sanitization & path safety

User-provided file names go through `sanitizeFileName(name)`:

```ts
sanitizeFileName('My Theme!')  // → 'my_theme'
```

Allowed characters are `[a-z0-9_]`; everything else collapses to `_`,
then leading and trailing underscores trim. The same helper is used on
the client (so the editor displays the post-sanitize name before
saving) and on the server (so requests with unsanitized names get
coerced). Both halves import from
`src/editor/core/storage/files/versionedFileResourceClient.ts` (the
canonical pure helper) so they cannot drift.

User-supplied path components (`:name`, `:comp`) are also constrained
at the route-pattern level: every regex uses `[a-z0-9\-_]+`, so `..`
and `/` never reach the handlers in the first place.

## Summary

- One Vite plugin, one route table, one dispatcher with centralized
  500-on-throw.
- Themes, component configs, and manifests share the
  `versionedFileResource` vocabulary: server half (filesystem ops +
  active/production pointers) plus client half (REST shape).
- Promote-to-production triggers three syncs that rewrite `tokens.css`
  and `fonts.css` in place; `tokens.css` ends up with a `:root:root`
  override block for component aliases.
- HMR regenerates per-component `default.json` from the Svelte
  source's `:global(:root)` block on every save.
- `__PROJECT_ROOT__` is injected by the plugin so the overlay's "Page
  Source" link works without consumer config.
