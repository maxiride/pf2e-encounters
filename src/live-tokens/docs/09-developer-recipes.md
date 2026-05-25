# Developer recipes

Common tasks. Each recipe assumes you have read chapters 02–05 and know
what "slice", "scope", and "registry" mean.

## Run tests

```bash
npm run test       # one shot
npm run test:watch # vitest watch
npm run check      # svelte-check (type-check)
```

The test suites:

| File | What it guards |
|---|---|
| `src/editor/core/store/editorStore.test.ts` | History machine, scopes, undo/redo, theme load resets |
| `src/editor/core/components/componentConfig.test.ts` | Per-component dirty tracking, seed from API |
| `src/editor/core/components/lazyConfig.test.ts` | `configureEditor` storage prefix observed lazily |
| `src/editor/core/themes/migrations/migrations.test.ts` | Migration runner: legacy → current, gating, purity |
| `src/editor/component-editor/editorTokens.test.ts` | Each editor's token list resolves to declared `:global(:root)` slots |
| `src/editor/ui/PaletteEditor.test.ts` | Palette derivation behavior |

If any of these fail, find the cause before touching code that depends
on them. Use `npm run test 2>&1 | grep '✓\|×'` to see deltas, not the
absolute count.

## Add a CSS-var domain (a new "slice")

You're adding a new family of variables (e.g., motion presets, focus
rings) that deserves typed state instead of living in the catch-all
`cssVars` bag.

### 1. Define the slice

Create `src/editor/core/themes/slices/<domain>.ts`. Export at minimum:

```ts
import { mutate } from '../../store/editorCore';
import type { EditorState } from '../../store/editorTypes';

export interface MotionState { duration: number; easing: string; }

export const DEFAULT_MOTION: MotionState = { duration: 200, easing: 'ease-out' };
export const MOTION_VAR_NAMES = ['--motion-duration', '--motion-easing'] as const;

export function motionToVars(m: MotionState): Record<string, string> {
  return {
    '--motion-duration': `${m.duration}ms`,
    '--motion-easing': m.easing,
  };
}

export function motionEqualsDefault(m: MotionState): boolean {
  return m.duration === DEFAULT_MOTION.duration && m.easing === DEFAULT_MOTION.easing;
}

export function loadMotionFromVars(next: EditorState, rawVars: Record<string, string>): void {
  for (const name of MOTION_VAR_NAMES) {
    if (rawVars[name]) {
      // parse rawVars[name] into next.motion fields; delete rawVars[name];
      delete rawVars[name];
    }
  }
}

export function setMotionDuration(ms: number): void {
  mutate(`set motion duration ${ms}ms`, (s) => { s.motion.duration = ms; });
}
export function setMotionEasing(easing: string): void {
  mutate(`set motion easing ${easing}`, (s) => { s.motion.easing = easing; });
}
```

### 2. Add the field to `EditorState`

`src/editor/core/store/editorTypes.ts`:

```ts
export interface EditorState {
  /* …existing… */
  motion: MotionState;
}
```

### 3. Wire the empty state and barrel

`src/editor/core/store/editorStore.ts`:

```ts
import { DEFAULT_MOTION, motionToVars, motionEqualsDefault, loadMotionFromVars }
  from '../themes/slices/motion';

function emptyState(): EditorState {
  return {
    /* …existing… */
    motion: { ...DEFAULT_MOTION },
  };
}

const domainLoaders: Record<string, DomainLoader> = {
  /* …existing… */
  motion: loadMotionFromVars,
};

// Re-export the slice's public API on the barrel
export { setMotionDuration, setMotionEasing, motionToVars, motionEqualsDefault } from '../themes/slices/motion';
```

### 4. Wire the renderer

`src/editor/core/store/editorRenderer.ts`:

```ts
export function deriveCssVars(state: EditorState): Record<string, string> {
  const out: Record<string, string> = { ...state.cssVars };
  /* …existing… */
  if (!motionEqualsDefault(state.motion)) {
    Object.assign(out, motionToVars(state.motion));
  }
  return out;
}
```

### 5. Wire `toTheme` so saves include the new vars

`src/editor/core/store/editorStore.ts`:

```ts
export function toTheme(state: EditorState, meta: { name: string }): Theme {
  /* …existing… */
  if (!motionEqualsDefault(state.motion)) {
    Object.assign(cssVariables, motionToVars(state.motion));
  }
  /* … */
}
```

### 6. Add UI

Wire a tab in `src/editor/ui/` (e.g., a `MotionTab.svelte`) that calls
`setMotionDuration` and reads `$editorState.motion`. Mount it in
`Editor.svelte` alongside the existing tabs.

That is the full integration. Existing themes load with `motion:
DEFAULT_MOTION` (the `loadMotionFromVars` loader claims the vars from
the catch-all bag if present). New saves include motion vars whenever
they diverge from the default.

## Add a schema migration

You renamed a token, removed a deprecated key, or restructured a config
shape.

### 1. Decide the kind

Theme migrations apply to `themes/*.json` files; component-config
migrations apply to `component-configs/<id>/*.json` files. Pick one. A
single migration cannot straddle both kinds.

### 2. Write the migration file

`src/editor/core/themes/migrations/YYYY-MM-DD-<short-name>.ts`:

```ts
import type { Migration } from './index';

export const themeMigration_2026_05_10_motionPresetRename: Migration = {
  id: '2026-05-10-motion-preset-rename',
  fromVersion: 1,           // applies to files at v1; bumps to v2
  toVersion: 2,
  appliesTo: 'theme',
  apply(rawVars, _meta) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      const newKey = key === '--motion-duration-old' ? '--motion-duration' : key;
      if (!(newKey in out)) out[newKey] = value;
    }
    return out;
  },
};
```

`fromVersion` is the file-stamp this applies to; `toVersion` is the
post-application stamp. Migrations are pure: return a new map, do not
mutate input.

### 3. Register it

`src/editor/core/themes/migrations/index.ts`:

```ts
import { themeMigration_2026_05_10_motionPresetRename } from './2026-05-10-motion-preset-rename';

export const MIGRATIONS: Migration[] = [
  /* …existing… */
  themeMigration_2026_05_10_motionPresetRename,
];
```

`CURRENT_THEME_SCHEMA_VERSION` adjusts itself (`countFor('theme')`).

### 4. Add a test

`src/editor/core/themes/migrations/migrations.test.ts`:

```ts
test('renames --motion-duration-old', () => {
  const out = runMigrations('theme', 1, { '--motion-duration-old': '300ms' });
  expect(out).toEqual({ '--motion-duration': '300ms' });
});

test('skips when file is already at toVersion', () => {
  const out = runMigrations('theme', 2, { '--motion-duration-old': '300ms' });
  expect(out).toEqual({ '--motion-duration-old': '300ms' });  // untouched
});
```

### 5. (Eventually) delete it

Once you are confident every saved file has been re-saved past
`toVersion`, delete the migration file and remove its import from
`index.ts`. The constant auto-decrements; nothing else references it.

## Add a versioned file resource (e.g., a new editable artifact class)

You have a new editable class (say, motion presets) that needs the
same list/save/load/active/production lifecycle as themes,
component configs, and manifests.

The conventions are encoded in `versionedFileResource`. Follow the
pattern:

### 1. Decide the directory layout

```
motion-presets/
├── _active.json
├── _production.json
├── default.json
└── slow.json
```

### 2. Wire the server resource

In `vite-plugin/themeFileApi.ts` (or a new plugin if you are
factoring this out):

```ts
const motionResource = versionedFileResourceServer({
  dir: path.resolve(opts.motionPresetsDir ?? 'motion-presets'),
});

function ensureMotionDir() {
  motionResource.ensureDir();
  if (!fs.existsSync(motionResource.filePath('default'))) {
    fs.writeFileSync(motionResource.filePath('default'),
      JSON.stringify({ name: 'default', duration: 200, easing: 'ease-out' }, null, 2));
  }
  motionResource.ensureMeta();
}
```

### 3. Add routes

```ts
const MOTION_ROUTE = `${API_BASE}/motion-presets`;
const MOTION_ACTIVE = `${API_BASE}/motion-presets/active`;
const MOTION_PRODUCTION = `${API_BASE}/motion-presets/production`;
const MOTION_BY_NAME = new RegExp(`^${escapedBase}/motion-presets/([a-z0-9\\-_]+)$`);

const routes: Route[] = [
  /* …existing… */
  { method: 'GET',    pattern: MOTION_ROUTE,       handler: handleListMotion },
  { method: 'GET',    pattern: MOTION_ACTIVE,      handler: handleGetMotionActive },
  { method: 'PUT',    pattern: MOTION_ACTIVE,      handler: handleSetMotionActive },
  { method: 'GET',    pattern: MOTION_PRODUCTION,  handler: handleGetMotionProduction },
  { method: 'PUT',    pattern: MOTION_PRODUCTION,  handler: handleSetMotionProduction },
  { method: 'GET',    pattern: MOTION_BY_NAME,     handler: handleMotionByName },
  { method: 'PUT',    pattern: MOTION_BY_NAME,     handler: handleMotionByName },
  { method: 'DELETE', pattern: MOTION_BY_NAME,     handler: handleMotionByName },
];
```

**Order matters.** `MOTION_ACTIVE` and `MOTION_PRODUCTION` must come
before `MOTION_BY_NAME`. Otherwise `/active` matches as
`name='active'`. Mirror the ordering used for themes, component
configs, and manifests.

### 4. Wire the client

`src/editor/core/motion/motionPresetsService.ts`:

```ts
import { versionedFileResource } from '../storage/files/versionedFileResourceClient';

export interface MotionPreset { name: string; duration: number; easing: string; }
export interface MotionPresetMeta { name: string; fileName: string; updatedAt: string; isActive: boolean; }
export interface MotionProductionInfo { fileName: string; name: string; updatedAt: string; }

const motion = versionedFileResource<MotionPreset, MotionPresetMeta, MotionProductionInfo>({
  baseUrl: '/api/motion-presets',
});

export const listMotion = () => motion.list().then((d) => d.files);
export const loadMotion = motion.load;
export const saveMotion = motion.save;
/* … */
```

### 5. Mirror the file-manager UI

Use `ComponentFileManager` as a template, or extract a generic
`<FileManager service={...} />` wrapper if this is the second copy.

The audit's M2 fix collapsed two copies of this code; if you are
adding a third, factor the file-manager UI now rather than letting it
drift.

## Add a token category

You want a new theme-token category (say, `--ring-*` already exists;
suppose you want `--motion-*`).

1. Add the tokens to `src/system/styles/tokens.css` under a category
   section header. Pick a name that fits the existing vocabulary;
   do not invent a new scale shape if numeric or t-shirt fits.
2. Update `src/system/styles/CONVENTIONS.md` to list the new category
   in the table.
3. If the category needs typed state in `EditorState`, follow the
   slice recipe above. Otherwise it lives in the catch-all `cssVars`
   bag and works automatically.
4. If the category needs a UI editor, add a tab to `src/editor/ui/`.

## Promote a theme to production from the CLI

There is no CLI today; promotion is only through the editor UI. If
you need non-interactive promotion (CI flows, scripted previews),
call the API:

```bash
curl -X PUT http://localhost:5173/api/themes/production \
  -H 'Content-Type: application/json' \
  -d '{"name": "green_goblin"}'
```

That runs `syncTokensToCss + syncFontsToCss + syncComponentsToCss`
server-side, just like the UI button.

## Debug undo

If undo behaves unexpectedly:

- **Open dev tools.** `editorCore.ts` has dev-only `console.debug`
  lines for `commitScope` (clipping path), `cancelScope` (clipping
  path), and `undo`. These show `pastLen`, `floor`, the palette
  snapshot, and whether a clipping scope is open.
- **Check `__getHistoryLengths()`.** Test-only export; in dev you can
  paste `editorCore.__getHistoryLengths()` in the console to see
  `{past, future}`.
- **Check the scope ownership.** Two scopes can be open
  simultaneously: one non-clipping (transaction / slider gesture)
  and one clipping (palette session). Each occupies its own slot.
  If you opened a third, the prior one in the same slot was
  auto-aborted with a `[editorStore]` warning.

## Publish the library

Releases go through GitHub Actions: pushing a `v*` tag triggers
`.github/workflows/publish.yml`, which runs `npm ci` + tests + a packaging
dry-run, then `npm publish --provenance --access public` over OIDC. There
is no `NPM_TOKEN`; npm trusts the workflow via Trusted Publisher.

```bash
# 1. Edit package.json version + CHANGELOG entry
# 2. Refresh the lockfile (see "Lockfile + optional deps" below — important)
npm install --include=optional

# 3. Local sanity check — exactly what CI will run
rm -rf node_modules && npm ci
npm test
npm pack --dry-run

# 4. Commit, tag, push
git commit -am "Release 0.3.x — <summary>"
git push origin main
git tag v0.3.x && git push origin v0.3.x

# 4. tag + push
git tag v0.6.3
git push origin main --tags
```

`prepublishOnly` runs `build:lib` which runs `build:plugin` (tsup
ESM+CJS+dts). The `files` field in `package.json` controls what
ships:

- `src/editor/` (everything under it)
- `src/system/` (runtime components, tokens.css, fonts.css, assets)
- `src/app/site.css`
- `dist-plugin/` (compiled plugin)

What does not ship: `src/app/main.ts`, `src/app/App.svelte`,
`src/app/Home.svelte`, `src/demo/`, `index.html`, `themes/`,
`component-configs/`, `manifests/`. These are starter-only.

## Force a fresh component-config seed

If `component-configs/<id>/default.json` got out of sync with the
runtime component (you renamed a slot but the seed still has the old
name):

```bash
rm component-configs/<id>/default.json
# touch the runtime to trigger HMR's regenerate path
touch src/system/components/<Name>.svelte
```

The dev plugin's `handleHotUpdate` regenerates `default.json` on the
touch. `createdAt` is preserved if there was a previous default.

## Skip migrations when manually editing a theme JSON

You hand-edited `themes/foo.json` and do not want migrations to run
on next load. Stamp the file with the current schema version:

```bash
# look up current
node -e "import('./src/editor/core/themes/migrations/index.js').then(m => console.log(m.CURRENT_THEME_SCHEMA_VERSION))"
# → 7

# add to the JSON file
"schemaVersion": 7
```

Migrations gate by `fromVersion >= file.schemaVersion`, so a file at
the current version skips all migrations.
