/**
 * Central editor state store — the single mutation funnel.
 *
 * All editor state (palettes, fonts, shadows, overlays, columns, ad-hoc CSS
 * vars) lives in one `EditorState` tree. Every change must go through
 * `mutate` (or a transaction). History is captured automatically; the
 * renderer subscribes and writes derived CSS vars to :root via `cssVarSync`
 * (which fans out to the parent document for the overlay iframe).
 *
 * This module is now a barrel: it re-exports the public API from
 *  - `editorCore` (history machine + transaction/session primitives)
 *  - `slices/*` (per-domain factories + actions)
 *  - `editorRenderer` (DOM subscriber)
 *  - `editorPersistence` (debounced localStorage)
 *
 * Component-config + theme migrations live in `./migrations` (Wave 4).
 * `loadComponentActive` / `seedComponentsFromApi` / `loadFromFile` / `toTheme`
 * orchestrate across slices and stay here.
 */

import type { CssVarRef, EditorState, GradientAliasValue } from './editorTypes';
import type { AliasDiskValue, Theme } from '../themes/themeTypes';
import { KNOWN_COMPONENT_CONFIG_KEYS } from '../components/componentConfigKeys';
import {
  CURRENT_THEME_SCHEMA_VERSION,
  CURRENT_COMPONENT_SCHEMA_VERSION,
  runMigrations,
} from '../themes/migrations';
import { renamePrimaryPaletteKey } from '../themes/migrations/2026-05-13-primary-to-brand';
import { __resetRendererCacheForTests, installRenderer } from './editorRenderer';
import {
  store,
  mutate,
  setEmptyStateFactory as setCoreEmptyStateFactory,
  setPersistHook,
  resetHistoryForLoad,
  __resetCoreForTests,
} from './editorCore';
import {
  schedulePersist,
  setEmptyStateFactory as setPersistenceEmptyStateFactory,
  ensureHydrated,
  initializeEditorStore,
} from './editorPersistence';
import {
  DEFAULT_COLUMNS,
  columnsEqualsDefault,
  columnsToVars,
  loadColumnsFromVars,
} from '../themes/slices/columns';
import {
  loadOverlaysFromVars,
  makeDefaultOverlaysState,
  overlaysEqualsDefault,
  overlaysToVars,
} from '../themes/slices/overlays';
import {
  loadShadowsFromVars,
  shadowsToVars,
} from '../themes/slices/shadows';
import { makeDefaultGradients } from '../themes/slices/gradients';
import {
  componentBaseline,
  loadComponentsFromVars,
  notifyComponentSavedChanged,
  setSavedComponentBaseline,
  __resetComponentsForTests,
} from '../themes/slices/components';

function emptyState(): EditorState {
  return {
    palettes: {},
    fonts: { sources: [], stacks: [] },
    shadows: {
      globals: {
        angle: 90, opacityMin: 0.15, opacityMax: 0.15, opacityLocked: true,
        distanceMin: 1, distanceMax: 25,
        blurMin: 2, blurMax: 50, blurLocked: false,
        sizeMin: 0, sizeMax: 0, sizeLocked: true,
        hue: 0, saturation: 0, lightness: 0,
      },
      tokens: [],
      overrides: {},
    },
    overlays: makeDefaultOverlaysState(),
    columns: { ...DEFAULT_COLUMNS },
    components: {},
    gradients: { tokens: makeDefaultGradients() },
    cssVars: {},
  };
}

// ── editorCore re-exports ─────────────────────────────────────────────────

export {
  editorState,
  mutate,
  transaction,
  beginScope,
  commitScope,
  cancelScope,
  beginSliderGesture,
  undo,
  redo,
  canUndo,
  canRedo,
  dirty,
  markSaved,
  __getHistoryLengths,
  __getPastAt,
} from './editorCore';
export type { Scope } from './editorCore';

// Wire the factory in both editorCore and editorPersistence. Resetting the
// store lands a proper EditorState before any helper below runs `mutate`.
setCoreEmptyStateFactory(emptyState);
setPersistenceEmptyStateFactory(emptyState);
store.set(emptyState());

// ── Slice re-exports ──────────────────────────────────────────────────────

export {
  DOMAIN_VAR_NAMES,
} from '../themes/slices/domainVars';

export {
  columnsToVars,
  columnsEqualsDefault,
  COLUMN_VAR_NAMES,
  DEFAULT_COLUMNS,
  parseColumnVars,
} from '../themes/slices/columns';

export {
  overlaysToVars,
  overlaysEqualsDefault,
  OVERLAY_VAR_NAMES,
  applyOverlayVarsToState,
  makeDefaultOverlaysState,
  overlayTokenToRgba,
  parseRgba,
  RGBA_RE,
  HEX_RE,
} from '../themes/slices/overlays';

export {
  shadowsToVars,
  applyShadowVarsToState,
  SHADOW_VAR_NAMES,
  SCALE_SHADOW_VARIABLES,
  computeShadowXY,
  shadowTokenCss,
  defaultShadowOverride,
  parseShadowCss,
  seedShadowsFromDom,
} from '../themes/slices/shadows';

export {
  gradientsToVars,
  makeDefaultGradients,
  setGradient,
  setGradientType,
  setGradientAngle,
  setGradientStop,
  addGradientStop,
  removeGradientStop,
  addGradientToken,
  removeGradientToken,
} from '../themes/slices/gradients';

export {
  componentsToVars,
  getComponentOwnedVarNames,
  componentDirty,
  setComponentAlias,
  clearComponentAlias,
  setComponentConfig,
  clearComponentConfig,
  registerComponentSchema,
  getComponentPropertySiblings,
  isComponentPropertyLinked,
  setComponentAliasLinked,
  clearComponentAliasLinked,
  unlinkComponentProperty,
  relinkComponentProperty,
  markComponentSaved,
} from '../themes/slices/components';

export {
  setFontSources,
  setFontStacks,
  seedFontsFromTheme,
} from '../themes/slices/fonts';

export {
  setPaletteConfig,
  seedPalettesFromTheme,
} from '../themes/slices/palettes';

// ── Component-config load orchestration ───────────────────────────────────
//
// Component-config migrations now live in `./migrations` (Wave 4): the
// migration runner pipes `aliases` through any registered transforms whose
// `fromVersion >= file.schemaVersion`, then `splitAliasesAndConfig` routes
// literal-valued knobs (per `KNOWN_COMPONENT_CONFIG_KEYS`) into the config
// bucket and wraps the remainder as `CssVarRef` discriminated unions.

/**
 * Migrate a disk-shape alias bag through the registered migration runner.
 *
 * The runner is string-typed by contract (most migrations only do
 * key/value string rewrites). Object-valued entries — currently just
 * inline `{ kind: 'gradient', value: ... }` payloads — pass through
 * untouched: we split the bag into string/object subsets, run the runner
 * on the string subset, then merge.
 *
 * For sectiondivider's legacy 7-flat-token gradients we run a synthesis
 * step BEFORE the migration runner that would strip those tokens. The
 * synthesized gradient object lands in the object subset and survives
 * the stripping pass.
 */
function migrateComponentAliases(
  component: string,
  aliasesIn: Record<string, AliasDiskValue>,
  rawConfig: Record<string, unknown> | undefined,
  fileVersion: number,
): { aliases: Record<string, AliasDiskValue>; config: Record<string, unknown> } {
  const stringPart: Record<string, string> = {};
  const objectPart: Record<string, AliasDiskValue> = {};
  for (const [k, v] of Object.entries(aliasesIn)) {
    if (typeof v === 'string') stringPart[k] = v;
    else objectPart[k] = v;
  }
  // String-valued config entries join the migration input so a migration can
  // rename or relocate them. After migration the bag flows through
  // `splitAliasesAndConfig` which routes KNOWN keys back to config and the
  // rest to aliases — this is what lets a migration *move* a key from the
  // config bucket to the aliases bucket by also removing it from KNOWN.
  // Config wins over an aliases-bucket collision on the same key: the legacy
  // single-bucket → split-bucket move preserved "explicit config field beats
  // legacy alias-bucketed value", and that contract still holds.
  // Non-string config values (rare; reserved for future structured payloads)
  // pass through untouched.
  const configOut: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawConfig ?? {})) {
    if (typeof v === 'string') stringPart[k] = v;
    else configOut[k] = v;
  }
  if (component === 'sectiondivider') {
    synthesizeSectionDividerGradients(stringPart, objectPart);
  }
  const migratedString = runMigrations('component-config', fileVersion, stringPart, { component });
  const migratedObject = component === 'sectiondivider'
    ? renameSectionDividerObjectSlots(objectPart)
    : objectPart;
  return {
    aliases: { ...migratedString, ...migratedObject },
    config: configOut,
  };
}

/**
 * v8→v9 companion to `componentMigration_2026_05_20_sectiondividerSlimVariants`:
 * the structured background payload is reshaped from six color families →
 * three size variants (lg/md/sm). Canvas's gradient is taken as the canonical
 * seed and fanned across all three new variants; other families' gradients
 * are dropped. Idempotent — keys already at the final shape pass through.
 *
 * Sources accepted (in priority order, first-found wins for canvas's slot):
 *   --sectiondivider-canvas-background  (current/in-progress shape)
 *   --sectiondivider-canvas-gradient    (v7-era shape)
 *   --sectiondivider-color-canvas-background  (intermediate shape that landed
 *                                              briefly during the color-prop pivot)
 *
 * The migration runner only sees string keys, so this object-shape rename
 * has to live alongside the runner call.
 */
const FAMILIES = ['canvas', 'neutral', 'alternate', 'primary', 'accent', 'special'] as const;
const SIZE_VARIANTS = ['lg', 'md', 'sm'] as const;
function renameSectionDividerObjectSlots(
  objectPart: Record<string, AliasDiskValue>,
): Record<string, AliasDiskValue> {
  // Find canvas's gradient under any historical key shape.
  const canvasSourceKeys = [
    '--sectiondivider-canvas-background',
    '--sectiondivider-canvas-gradient',
    '--sectiondivider-color-canvas-background',
  ];
  let canvasGradient: AliasDiskValue | undefined;
  for (const key of canvasSourceKeys) {
    if (objectPart[key] !== undefined) {
      canvasGradient = objectPart[key];
      break;
    }
  }

  // If we found a canvas gradient (any era), fan it into the three new
  // per-variant background slots and drop every other family's gradient.
  // If no canvas gradient is found, pass through non-family keys verbatim
  // so non-migration data (theme tokens, other components) isn't touched.
  const out: Record<string, AliasDiskValue> = {};
  for (const [key, value] of Object.entries(objectPart)) {
    // Skip any sectiondivider per-family gradient; the canvas fan-out emits
    // the canonical set below.
    let isFamilyGradient = false;
    for (const f of FAMILIES) {
      if (
        key === `--sectiondivider-${f}-background`
        || key === `--sectiondivider-${f}-gradient`
        || key === `--sectiondivider-color-${f}-background`
      ) {
        isFamilyGradient = true;
        break;
      }
    }
    // Pass through anything that's already at the final lg/md/sm shape so
    // re-running the migration is idempotent.
    if (isFamilyGradient) continue;
    out[key] = value;
  }
  if (canvasGradient !== undefined) {
    for (const v of SIZE_VARIANTS) {
      out[`--sectiondivider-${v}-background`] = canvasGradient;
    }
  }
  return out;
}

/** SectionDivider variants that ship gradient aliases. */
const SECTIONDIVIDER_VARIANTS = ['canvas', 'neutral', 'alternate', 'primary', 'accent', 'special'] as const;

/**
 * Collapse legacy 7-flat-token gradients (`{angle, stop-{1,2,3}-{color,position}}`)
 * for each sectiondivider variant into one structured gradient alias at
 * `--sectiondivider-{v}-gradient`. The flat tokens stay in `stringPart`
 * for the migration runner to strip; the structured payload joins
 * `objectPart` so the merge produces the new shape.
 *
 * Skips variants that already declare a gradient alias (object form) so
 * round-tripping doesn't overwrite user edits.
 */
function synthesizeSectionDividerGradients(
  stringPart: Record<string, string>,
  objectPart: Record<string, AliasDiskValue>,
): void {
  const GRADIENT_ANGLE_TOKENS: Record<string, number> = {
    '--gradient-angle-horizontal': 90,
    '--gradient-angle-vertical': 180,
    '--gradient-angle-diagonal': 135,
    '--gradient-angle-counter-diagonal': 45,
  };
  const GRADIENT_STOP_POSITIONS: Record<string, number> = {
    '--gradient-stop-start': 0,
    '--gradient-stop-mid': 50,
    '--gradient-stop-end': 100,
  };
  const parseAngle = (raw: string | undefined): number => {
    if (!raw) return 135;
    if (raw.startsWith('--')) return GRADIENT_ANGLE_TOKENS[raw] ?? 135;
    const m = raw.match(/^(-?\d+(?:\.\d+)?)\s*deg$/i);
    return m ? parseFloat(m[1]) : 135;
  };
  const parsePosition = (raw: string | undefined, fallback: number): number => {
    if (!raw) return fallback;
    if (raw.startsWith('--')) return GRADIENT_STOP_POSITIONS[raw] ?? fallback;
    const m = raw.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
    return m ? parseFloat(m[1]) : fallback;
  };
  const parseStopColor = (raw: string | undefined): { color: string; opacity?: number } | null => {
    if (!raw) return null;
    if (raw.startsWith('--')) return { color: raw };
    const mix = raw.match(/^color-mix\(\s*in\s+srgb\s*,\s*var\((--[a-z0-9-]+)\)\s+([\d.]+)%\s*,\s*transparent\s*\)$/i);
    if (mix) return { color: mix[1], opacity: parseFloat(mix[2]) };
    return null;
  };
  for (const v of SECTIONDIVIDER_VARIANTS) {
    const slot = `--sectiondivider-${v}-gradient`;
    if (slot in objectPart) continue;
    const angleKey = `${slot}-angle`;
    const has1 = stringPart[`${slot}-stop-1-color`] !== undefined;
    const has2 = stringPart[`${slot}-stop-2-color`] !== undefined;
    const has3 = stringPart[`${slot}-stop-3-color`] !== undefined;
    if (!has1 && !has2 && !has3) continue;
    const stops: { position: number; color: string; opacity?: number }[] = [];
    const positionDefaults = [0, 50, 100];
    for (let i = 1; i <= 3; i++) {
      const c = parseStopColor(stringPart[`${slot}-stop-${i}-color`]);
      if (!c) continue;
      const pos = parsePosition(stringPart[`${slot}-stop-${i}-position`], positionDefaults[i - 1]);
      stops.push({ position: pos, color: c.color, ...(c.opacity !== undefined ? { opacity: c.opacity } : {}) });
    }
    if (stops.length < 2) continue;
    objectPart[slot] = {
      kind: 'gradient',
      value: {
        type: 'linear',
        angle: parseAngle(stringPart[angleKey]),
        stops,
      },
    };
  }
}

/**
 * Disk-shape → in-memory split. Routes legacy single-bucket aliases that
 * carry literal-valued knobs (per `KNOWN_COMPONENT_CONFIG_KEYS`) into the
 * config bucket, and wraps the remainder as `CssVarRef` discriminated unions.
 */
function splitAliasesAndConfig(
  rawAliases: Record<string, AliasDiskValue>,
  rawConfig: Record<string, unknown> | undefined,
): { aliases: Record<string, CssVarRef>; config: Record<string, unknown> } {
  const aliases: Record<string, CssVarRef> = {};
  const config: Record<string, unknown> = { ...(rawConfig ?? {}) };
  for (const [key, value] of Object.entries(rawAliases)) {
    if (typeof value !== 'string') {
      if (value.kind === 'gradient') {
        aliases[key] = { kind: 'gradient', value: value.value as GradientAliasValue };
      }
      continue;
    }
    if (KNOWN_COMPONENT_CONFIG_KEYS.has(key)) {
      if (config[key] === undefined) config[key] = value;
      continue;
    }
    aliases[key] = value.startsWith('--')
      ? { kind: 'token', name: value }
      : { kind: 'literal', value };
  }
  return { aliases, config };
}

/**
 * Replace a component's slice with a loaded config file's contents. Uses
 * `mutate()` so the load is one undoable entry; updates the dirty baseline
 * so the post-load state reads clean for this component.
 *
 * `schemaVersion` is the stamp on the loaded file (0 for legacy files
 * with no stamp). The runner applies any migrations between that and
 * `CURRENT_COMPONENT_SCHEMA_VERSION` before the slice is stored — in-memory
 * state is always at the current version.
 */
export function loadComponentActive(
  component: string,
  activeFile: string,
  aliases: Record<string, AliasDiskValue>,
  config?: Record<string, unknown>,
  schemaVersion: number = 0,
): void {
  const migrated = migrateComponentAliases(component, aliases, config, schemaVersion);
  const split = splitAliasesAndConfig(migrated.aliases, migrated.config);
  mutate(`load ${component}/${activeFile}`, (s) => {
    s.components[component] = { activeFile, aliases: { ...split.aliases }, config: { ...split.config } };
  });
  setSavedComponentBaseline(component, componentBaseline(split));
  notifyComponentSavedChanged();
}

export interface ComponentSeed {
  activeFile: string;
  aliases: Record<string, AliasDiskValue>;
  config?: Record<string, unknown>;
  schemaVersion?: number;
}

/**
 * Boot-path hydration from the server's /api/component-configs fetch. No
 * history entry, no dirty flag — components are clean relative to disk.
 *
 * Each seed may carry a `schemaVersion`; absent entries are treated as 0
 * and migrated up to current.
 */
export function seedComponentsFromApi(
  configs: Record<string, ComponentSeed>,
): void {
  store.update((s) => {
    s.components = {};
    for (const [comp, cfg] of Object.entries(configs)) {
      const migrated = migrateComponentAliases(comp, cfg.aliases, cfg.config, cfg.schemaVersion ?? 0);
      const split = splitAliasesAndConfig(migrated.aliases, migrated.config);
      s.components[comp] = { activeFile: cfg.activeFile, aliases: { ...split.aliases }, config: { ...split.config } };
      setSavedComponentBaseline(comp, componentBaseline(split));
    }
    return s;
  });
  notifyComponentSavedChanged();
  schedulePersist();
}

// ── Theme load / save ──────────────────────────────────────────────────────

/**
 * Per-domain loader: routes a freshly-loaded theme's `cssVariables` bag
 * into typed state on `next`, then removes the routed entries so the
 * remainder lands as the catch-all `cssVars` bag. Each loader owns its
 * domain's parser + name list; this table is the only place editorStore
 * needs to know about the per-slice loading contract.
 */
type DomainLoader = (next: EditorState, rawVars: Record<string, string>) => void;

const domainLoaders: Record<string, DomainLoader> = {
  columns: loadColumnsFromVars,
  overlays: loadOverlaysFromVars,
  shadows: loadShadowsFromVars,
  components: loadComponentsFromVars,
};

/**
 * Replace state with a loaded theme. Clears history and marks saved —
 * "open a different document" semantics. Undo cannot cross a theme load.
 *
 * Reads `theme.schemaVersion` (absent = 0) and runs theme migrations up to
 * `CURRENT_THEME_SCHEMA_VERSION` before splitting the bag into domains.
 */
export function loadFromFile(theme: Theme): void {
  const next = emptyState();
  next.palettes = renamePrimaryPaletteKey(structuredClone(theme.editorConfigs ?? {}));
  next.fonts.sources = structuredClone(theme.fontSources ?? []);
  next.fonts.stacks  = structuredClone(theme.fontStacks  ?? []);
  const rawVars = runMigrations(
    'theme',
    theme.schemaVersion ?? 0,
    theme.cssVariables ?? {},
  );
  // Route domain-owned entries out of the catch-all bag into typed state.
  // Order doesn't matter — each loader claims a disjoint set of var names
  // (or in components' case, vars that wouldn't have been in the theme to
  // begin with).
  for (const load of Object.values(domainLoaders)) load(next, rawVars);
  next.cssVars = rawVars;
  resetHistoryForLoad();
  store.set(next);
  schedulePersist();
}

/**
 * Serialize current state for saving. Domains with their own typed state
 * (columns, overlays, shadows) fold derived vars into `cssVariables` only
 * when they diverge from defaults; the catch-all `cssVars` bag carries
 * everything not yet migrated to a typed domain.
 *
 * Stamps the file with `CURRENT_THEME_SCHEMA_VERSION` so future loads can
 * skip migrations the file is already past.
 */
export function toTheme(state: EditorState, meta: { name: string }): Theme {
  const now = new Date().toISOString();
  const cssVariables: Record<string, string> = { ...state.cssVars };
  if (!columnsEqualsDefault(state.columns)) {
    Object.assign(cssVariables, columnsToVars(state.columns));
  }
  if (!overlaysEqualsDefault(state.overlays)) {
    Object.assign(cssVariables, overlaysToVars(state.overlays));
  }
  if (state.shadows.tokens.length > 0) {
    Object.assign(cssVariables, shadowsToVars(state.shadows));
  }
  return {
    name: meta.name,
    createdAt: now,
    updatedAt: now,
    editorConfigs: state.palettes,
    cssVariables,
    fontSources: state.fonts.sources,
    fontStacks: state.fonts.stacks,
    schemaVersion: CURRENT_THEME_SCHEMA_VERSION,
  };
}

// ── Persistence ────────────────────────────────────────────────────────────
//
// `schedulePersist` + `hydrate` + the eager-hydrate gate live in
// `./editorPersistence`. The barrel re-exports `initializeEditorStore` for
// API parity.

export { initializeEditorStore };
/** Idempotent host hook — call once during boot. Alias for `initializeEditorStore`
 *  matching the `module.init()` convention used by `cssVarSync` / `router` /
 *  `columnsOverlay` so `main.ts` can call them uniformly. */
export const init = initializeEditorStore;

// ── Test-only reset ────────────────────────────────────────────────────────

/**
 * Test-only: clear all history + transient session/transaction state and
 * reset the store to `emptyState()`. Not exported from the public barrel.
 */
export function __resetForTests(): void {
  __resetCoreForTests();
  __resetRendererCacheForTests();
  __resetComponentsForTests();
}

// ── Wiring ─────────────────────────────────────────────────────────────────
//
// `setPersistHook(schedulePersist)` lets editorCore's mutate/undo/redo
// debounce-persist through the same path. `ensureHydrated()` runs the
// eager localStorage load (pre-Svelte-mount so children see persisted
// state in onMount). `installRenderer()` runs the `store.subscribe(...)`
// wiring legacy `import '.../editorStore'` paths depended on; it must run
// *after* this module's exports are initialized — the renderer imports
// `editorState` back from editorCore, and calling it earlier would TDZ
// because of the circular import.
setPersistHook(schedulePersist);
ensureHydrated();
export { deriveCssVars } from './editorRenderer';
installRenderer();
