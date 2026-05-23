export { default as LiveEditorOverlay } from './overlay/LiveEditorOverlay.svelte';
export type { NavLink } from './core/routing/navLinkTypes';
export { default as ColumnsOverlay } from './overlay/ColumnsOverlay.svelte';

export { columnsVisible, toggleColumns, init as initColumnsOverlay } from './overlay/columnsOverlay';
export { configureEditor, storageKey } from './core/store/editorConfig';
export { activeFileName } from './core/store/editorConfigStore';
export { init as initRouter, route, navigate } from './core/routing/router';
export { init as initCssVarSync } from './core/cssVarSync';
export { init as initEditorStore } from './core/store/editorStore';

export { setCssVar, removeCssVar } from './core/cssVarSync';

export {
  listThemes,
  loadTheme,
  saveTheme,
  deleteTheme,
  getActiveTheme,
  setActiveFile,
  getProductionInfo,
  setProductionFile,
  sanitizeFileName,
} from './core/themes/themeService';
export type { ProductionInfo } from './core/themes/themeService';

export type {
  PaletteConfig,
  Theme,
  ThemeMeta,
  GradientStyle,
  GradientStop,
  FontSource,
  FontSourceKind,
  FontFamily,
  FontStack,
  FontStackSlot,
  FontStackVariable,
  SystemCascadePreset,
  GenericFamily,
  Manifest,
  ManifestMeta,
} from './core/themes/themeTypes';

export {
  listManifests,
  loadManifest,
  saveManifest,
  deleteManifest,
  getActiveManifest,
  setActiveManifest,
  applyManifest,
  saveAsManifest,
  saveActiveManifest,
} from './core/manifests/manifestService';
export type { ApplyManifestResult } from './core/manifests/manifestService';

export {
  applyFontSources,
  applyFontStacks,
  resolveFontStackValues,
  SYSTEM_CASCADES,
} from './core/fonts/fontLoader';
export { migrateThemeFonts, defaultFontSources, defaultFontStacks } from './core/fonts/fontMigration';

export { hexToOklch, oklchToHex, gamutClamp } from './core/palettes/oklch';
export type { Oklch } from './core/palettes/oklch';

export { initializeTheme } from './core/themes/themeInit';
