# Live Tokens

A foundational design system for quickly styling and building Svelte + Vite microsites. **Edit your tokens and components in real time** — colors, typography, spacing, per-component aliases — and see the site update as you drag the slider. Save the result as a portable configuration you can carry from project to project.

`npm install @motion-proto/live-tokens` into your app — install once, style fast. The editor is dev-only; production builds get plain CSS variables and your chosen components, nothing else.

## What you get

- **Real-time token editing.** Pick a color, drag a hue slider, retype a font size — the page repaints on every input event via CSS-variable writes. No reload, no save-and-refresh, no build step. Works across colors, typography, spacing, radii, shadows, motion, palettes, and gradients.
- **Real-time component editing.** Each of ~19 shipped Svelte components (Button, Card, Dialog, Badge, Callout, Table, Tooltip, Toggle, Tabs, SegmentedControl, ProgressBar, CornerBadge, SectionDivider, CollapsibleSection, and more) declares its own design-token aliases in a `:global(:root)` block. Rewire any alias from a per-component picker and see that component update everywhere it's used — live, on your real pages, not in a Storybook sandbox.
- **Theme editor** (`/editor` route, dev-only) — the home of real-time token editing. Save themes to disk as JSON, promote one to "production" to bake it into a static `tokens.css` for the build.
- **Per-component editor** (`/components` route, dev-only) — the home of real-time component-alias editing. Pick token aliases per component without writing CSS.
- **Live editor overlay** — pins to the top-right of every dev page. Opens the editor in a side panel or floating window so you edit *on the page you're styling*, not in a separate tab. Includes a "Page Source" button that opens the current page's `.svelte` file in VS Code.
- **Preset bundles** — capture a whole site configuration (active theme + every component's active config) as a single portable artifact. Drop a preset into a new project to restore the full styling in one step.
- **Vite plugin** — hosts the `/api/themes/*`, `/api/component-configs/*`, and `/api/presets/*` routes that persist your edits to disk as you make them.

## Quick install

```bash
npm install @motion-proto/live-tokens
```

### Vite config

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';

export default defineConfig({
  plugins: [
    svelte(),
    themeFileApi({
      themesDir: 'themes',
      tokensCssPath: 'src/system/styles/tokens.css',
    }),
  ],
  optimizeDeps: {
    exclude: ['@motion-proto/live-tokens'],
  },
});
```

The `themeFileApi` plugin:
- Seeds `themes/` with a default theme on first dev-server start.
- Discovers components at `src/system/components/*.svelte` and seeds `component-configs/{comp}/default.json` from each component's `:global(:root)` block.
- Hosts the `/api/*` routes the editor uses to save and load themes + per-component configs.
- Auto-injects `__PROJECT_ROOT__` for the overlay's "Page Source" link.

### Bootstrap in `main.ts`

```ts
import './styles/tokens.css';
import {
  configureEditor,
  initializeTheme,
  initCssVarSync,
  initRouter,
  initColumnsOverlay,
  initEditorStore,
} from '@motion-proto/live-tokens';
import App from './App.svelte';
import { mount } from 'svelte';

configureEditor({ storagePrefix: 'my-app-' });

async function boot() {
  initCssVarSync();
  initRouter();
  initColumnsOverlay();
  initEditorStore();
  if (import.meta.env.DEV) {
    await initializeTheme();
  }
  mount(App, { target: document.getElementById('app')! });
}

boot();
```

### Mount overlay + editor pages

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { LiveEditorOverlay, ColumnsOverlay } from '@motion-proto/live-tokens';
  import Editor from '@motion-proto/live-tokens/editor';
  import ComponentEditorPage from '@motion-proto/live-tokens/component-editor-page';
  import { route } from './router';
</script>

<LiveEditorOverlay
  navLinks={[
    { path: '/', label: 'Home', icon: 'fa-home' },
    { path: '/components', label: 'Components', icon: 'fa-puzzle-piece' },
  ]}
  pageSources={{
    '/': 'src/app/Home.svelte',
  }}
/>
<ColumnsOverlay />

{#if $route === '/editor'}
  <Editor />
{:else if $route === '/components'}
  <ComponentEditorPage />
{:else}
  <!-- your routes -->
{/if}
```

`<LiveEditorOverlay />` self-gates: it only renders in dev, never inside an iframe, and never on the editor route. No need to wrap in `{#if import.meta.env.DEV}` guards.

### Use components

```svelte
<script lang="ts">
  import Button from '@motion-proto/live-tokens/components/Button.svelte';
  import Callout from '@motion-proto/live-tokens/components/Callout.svelte';
</script>

<Callout variant="info">Read this.</Callout>
<Button variant="primary">Save</Button>
```

The components carry their own design-token aliases (declared inside each `.svelte` file). They'll pick up your `tokens.css` overrides automatically. Strip out the ones you don't use; nothing is forced.

### Styles

Editor chrome (`ui-editor.css`, `ui-form-controls.css`) and the icon font are
**auto-loaded by the editor pages themselves**; you don't import them. The
only stylesheet a consumer needs is a `tokens.css` declaring the design-token
CSS variables on `:root`.

You can use the package's default as a starting point:

```ts
import '@motion-proto/live-tokens/app/tokens.css';
import '@motion-proto/live-tokens/app/site.css';   // optional: themed h1/p/a styles
import '@motion-proto/live-tokens/app/fonts.css';  // optional: Fraunces + Manrope @font-face
```

…or copy `node_modules/@motion-proto/live-tokens/src/system/styles/tokens.css` into
your project and edit. The editor will seed `themes/default.json` on first
run and you can promote your edits back into the file.

## Consuming live-tokens from scratch

The minimum a consumer needs after `npm install @motion-proto/live-tokens`:

```ts
// src/main.ts
import '@motion-proto/live-tokens/app/tokens.css';
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
```

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import Editor from '@motion-proto/live-tokens/editor';
</script>

<Editor />
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
});
```

No `css: 'injected'` workaround, no `optimizeDeps` excludes — `vite build` works as-is. (You'll want the full `themeFileApi` plugin from the Quick install section above when you're ready to persist edits to disk.)

## Greenfield? Use the starter

If you're starting from scratch, skip the manual wiring and clone the repo as a template — `App.svelte`, `main.ts`, the router, and a placeholder `Home.svelte` saying "put your content here" are all pre-wired.

```bash
npx degit motionproto/live-tokens my-app
cd my-app
npm install
npm run dev
```

Open http://localhost:5173 and replace `src/app/Home.svelte` with your content. The rest of the wiring is already done — it's the same code the npm package ships, just with the App-shell scaffolding included.

## How the editor ships changes to prod

1. Edit in `/editor` or `/components`. Saves write to `themes/{name}.json` and `component-configs/{comp}/{name}.json`.
2. Promote a theme to "production." Its variables are written into `src/system/styles/tokens.css` and backed up under `src/system/styles/_backups/`.
3. `npm run build` bundles `tokens.css` as plain CSS. No editor code, no JSON lookups, no dev surfaces ship to prod.

## File ownership — what the plugin writes

Knowing which files the plugin touches matters when upgrading the package or working in a repo you don't want overwritten.

**On `npm install` or `npm update`: nothing outside `node_modules/`.** No install hooks. Upgrading versions never touches your `themes/`, `component-configs/`, `presets/`, or any file in `src/`.

**At dev-server startup, the plugin only fills gaps — it never overwrites authored files:**

- `themes/default.json` — written **only if missing**.
- `themes/_active.json` and `themes/_production.json` — written **only if missing**.
- `component-configs/{comp}/_active.json` and `_production.json` — same: only if missing.
- `component-configs/{comp}/default.json` — regenerated from the component's `:global(:root)` block **only when the `.svelte` source is newer than the existing default**. This file is a build artifact of the source; don't hand-edit it.

**At dev-time editor actions, these files get rewritten by your explicit save/promote:**

- `themes/{name}.json` — every save in the editor.
- `src/system/styles/tokens.css` — fully regenerated when you save or promote the production theme. **Treat this as a build artifact.** Hand-edits get clobbered next time the production theme is saved; promote a theme instead.
- `src/system/styles/fonts.css` — same rule: regenerated from the theme's font sources.
- `component-configs/{comp}/{name}.json` — every save of a per-component config.

## Maintainer notes — publishing

The package publishes to npm as `@motion-proto/live-tokens`.

1. Bump the version in `package.json`.
2. Verify tarball contents: `npm pack --dry-run`.
3. `npm publish`. `prepublishOnly` rebuilds `dist-plugin/`.
4. Tag and push: `git tag vX.Y.Z && git push origin main vX.Y.Z`.

## License

MIT. Originally extracted from [RuneGoblin](https://www.runegoblin.com/).
