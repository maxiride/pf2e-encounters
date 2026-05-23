# Preset bundles: save/load entire site configurations

## Goal

Capture the *whole site state* — the active theme + every component's active config — under one named bundle (e.g. "Toyota", "Hollywood Bright"). Loading a bundle flips the entire UI to that look in one action; the underlying theme + per-component configs stay independently editable.

## Concept: manifest, not snapshot

Two design directions were considered:

- **Snapshot bundle** — embed full theme JSON + every component's full config inside one preset file.
- **Manifest bundle** — preset references existing named files: `{ theme: "toyota", componentConfigs: { button: "toyota-cta", … } }`. Loading the preset just flips the `_active` pointers.

**Decision: manifest.** Matches the user's stated requirement — keep pieces independently editable, restore the whole state by loading a file. Snapshots fork from the live files (edit `toyota-button.json` and the snapshot drifts); manifests stay current. If we later need self-contained portability (export/share), we can add a `bundlePack(presetName)` action that resolves a manifest to a snapshot bundle for export. Internal storage stays manifest-shaped.

## File layout

Mirrors the existing `themes/` and `component-configs/{comp}/` lifecycles (per the "mirror theme-file lifecycle for new editor artifacts" invariant):

```
presets/
  _active.json          # { activeFile: "toyota" }       — current preset (informational; see below)
  default.json          # bootstrap: theme=default, all components=default
  toyota.json
  hollywood-bright.json
```

**No `_production.json` for presets** — presets are dev-time convenience. Production behaviour is still owned by the theme's `_production.json` and each component's `_production.json`. A future "promote preset to production" action could be a one-button shorthand for "set production = each file referenced by the manifest" but it isn't core to V1.

**Why `_active.json`?** Tracks which preset is currently loaded, so the UI can show "Active: Toyota" and so reloading the page can re-display that label. It does *not* drive any other behaviour — the actual active theme + active component configs are already pinned by their own `_active.json` files.

## Manifest shape

```ts
interface Preset {
  name: string;                                  // display name, e.g. "Toyota"
  createdAt: string;
  updatedAt: string;
  theme: string;                                 // theme file basename, e.g. "toyota"
  componentConfigs: Record<string, string>;      // { [componentId]: configFileBasename }
}
```

Notes:
- `theme` is required — every preset pins a theme.
- `componentConfigs` is partial: components omitted from the manifest fall back to "default". This means a "minimal preset" can pin just the theme and let components be default. We could also store an explicit `"default"` value; either round-trips. Default to the explicit form so saving a preset always writes a complete manifest.
- File basenames (no `.json` extension) — same convention as `_active.json`'s `activeFile` field.

## Server-side: extend `themeFileApi.ts`

Add a third resource alongside themes + per-component:

```ts
const presetsResource = versionedFileResourceServer({ dir: PRESETS_DIR });
```

New routes:

- `GET    /api/presets`               — list manifests
- `GET    /api/presets/active`        — get currently active preset
- `PUT    /api/presets/active`        — set active (informational; doesn't flip theme/components)
- `GET    /api/presets/:name`         — load manifest
- `PUT    /api/presets/:name`         — save manifest
- `DELETE /api/presets/:name`         — delete manifest
- `PUT    /api/presets/:name/apply`   — atomic apply: validate referenced files exist, then call `themesResource.setActiveName(theme)` and `componentResource(comp).setActiveName(file)` for each entry, then `presetsResource.setActiveName(:name)`. Returns the resolved theme + component configs in one payload so the client can hydrate without N+1 round-trips.

The `apply` route is the critical addition. Without it, the client has to issue 1 (theme) + N (components) PUT requests then re-fetch each one — race-prone and chatty.

`default.json` bootstrap: on first run, write a default preset that pins `theme: "default"` and every discovered component to `"default"`.

## Client-side: `presetService.ts`

```ts
const presetsResource = versionedFileResource<Preset, PresetMeta, ProductionInfo>({
  baseUrl: '/api/presets',
});

export const listPresets = …;
export const loadPreset = …;
export const savePreset = …;
export const deletePreset = …;
export const getActivePreset = …;
export const setActivePreset = …;

// Custom: not a generic CRUD route
export async function applyPreset(name: string): Promise<{
  theme: Theme;
  componentConfigs: Record<string, ComponentConfig>;
}> {
  const res = await fetch(`/api/presets/${encodeURIComponent(name)}/apply`, { method: 'PUT' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Build a manifest from the current active state and save it
export async function captureCurrentAsPreset(name: string, displayName: string): Promise<void> {
  const components = await listComponents();
  const manifest: Preset = {
    name: displayName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    theme: (await fetch('/api/themes/active').then(r => r.json()))._fileName,
    componentConfigs: Object.fromEntries(components.map(c => [c.name, c.activeFile])),
  };
  await savePreset(name, manifest);
  await setActivePreset(name);
}
```

## Editor orchestration: `presetService` (continued)

```ts
export async function applyAndHydratePreset(name: string): Promise<void> {
  const { theme, componentConfigs } = await applyPreset(name);
  // Theme path: same as hydrateTheme, but we already have the JSON
  migrateThemeFonts(theme);
  loadEditorState(theme);
  if (theme.fontSources?.length) applyFontSources(theme.fontSources);
  if (theme.fontStacks?.length) applyFontStacks(theme.fontStacks, theme.fontSources ?? []);
  // Component configs: PaletteEditor / per-component editors already
  // re-fetch their active config when their store-backed alias map changes.
  // For V1 we trigger that via a custom event or a tick of the active-config
  // store; design TBD when wiring up the editors.
  markSaved();
}
```

The component-config rehydration path is the one open question. Two options:
1. **Page reload** — simplest; `applyPreset` server-side flips pointers, client does `window.location.reload()`. Loses undo history but the UI was just nuked anyway.
2. **In-place rehydrate** — emit an event each editor listens for; each re-fetches `getActiveComponentConfig(comp)`. Preserves session, more wiring.

V1 recommendation: **page reload**. Loading a preset is a "blow up the world" action — preserving editor session state across that boundary is low value. We can add in-place rehydrate in V2 if it matters.

## Dirty-state handling

If `$dirty === true` when the user clicks "Apply preset", prompt: "You have unsaved changes. Save current theme/components before switching?" with options Save / Discard / Cancel. Standard text-editor pattern.

## UI

New `PresetFileManager.svelte` mirroring `TokenFileManager.svelte`:
- Active preset indicator
- Save (overwrite current) / Save As / Save Increment / Load / Delete
- Backup browser (TBD whether presets get backups; probably yes for symmetry)

Placement: sits in `EditorShell` alongside the theme file manager. Could be its own sidebar tab "Presets" or a top-level dropdown. Defer placement to implementation; pick whatever's least disruptive to the current chrome.

## Implementation order

1. **Types** — `Preset`, `PresetMeta` in `themeTypes.ts`.
2. **Server routes** — extend `themeFileApi.ts` with preset CRUD + `apply`. Bootstrap `presets/default.json` on first run.
3. **Client service** — `presetService.ts` with CRUD + `applyAndHydratePreset` + `captureCurrentAsPreset`.
4. **UI** — `PresetFileManager.svelte` + placement in `EditorShell`.
5. **Smoke test** — manual: save preset from current → tweak components → load preset → confirm restoration. Also: load a preset that references a non-existent theme/config (after manual file delete) and confirm we get a clear error rather than silent corruption.

## Decisions (2026-05-10)

1. **Reload on apply** — page reload. Loading a preset is a blow-up-the-world action; undo history across that boundary is low value.
2. **Capture from disk on save** — preset is a manifest of named files. Dirty in-memory edits aren't files yet, so they don't get into the preset until saved. When dirty, surface an alert: *"You have unsaved changes. They will not be included in the preset. Save them first if you want them captured."* (with options Save / Save Anyway / Cancel — "Save Anyway" continues with on-disk state).
3. **No `_production.json` for presets in V1** — production layering still owned by theme + component prod pointers. Future enhancement: a "promote preset to production" button.
4. **Backup files for presets** — yes, for symmetry with themes and component configs. Same file-manager surface (Save / Save As / Save Increment / Backup browser).
