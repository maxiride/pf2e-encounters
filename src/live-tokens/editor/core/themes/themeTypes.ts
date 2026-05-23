import type { CurveAnchor } from '../../ui/curveEngine';

export type GradientStyle = 'linear' | 'radial' | 'conic';

export interface GradientStop {
  position: number;
  paletteLabel: string;
}

export interface PaletteConfig {
  baseColor: string;
  tintHue: number;
  tintChroma?: number;
  lightnessCurve: CurveAnchor[];
  saturationCurve: CurveAnchor[];
  grayLightnessCurve: CurveAnchor[];
  graySaturationCurve: CurveAnchor[];
  scaleCurves: Record<string, { lightness: CurveAnchor[]; saturation: CurveAnchor[] }>;
  curveOffset: Record<string, number>;
  overrides: Record<string, string>;
  snappedScales: string[];
  emptyMode?: 'solid' | 'gradient';
  emptyStep?: string;
  gradientStyle?: GradientStyle;
  gradientAngle?: number;
  gradientReverse?: boolean;
  gradientStops?: GradientStop[];
  gradientSize?: 'page' | 'window';
  anchorToBase?: boolean;
  /**
   * Set to true by importers when they overlay `cssVariables[--color-{ns}-*]`
   * without owning the typed-state curves. The storage-layer reconciler uses
   * it as an opt-in switch: snap `baseColor` (or `tintHue`+`tintChroma` for
   * gray palettes) to the imported `--color-{ns}-500` anchor and clear the
   * flag. Editor-authored themes never set this, so the reconciler is a
   * strict no-op for them.
   *
   * Persists on disk for first-load reconciliation. After reconcile strips
   * the palette-derived keys from `cssVariables`, subsequent reconciles find
   * no anchor and become idempotent no-ops regardless of the flag's value.
   */
  _imported?: boolean;
}

export type FontSourceKind = 'google' | 'typekit' | 'css-url' | 'font-face';

export interface FontFamily {
  id: string;
  name: string;
  cssName: string;
  weights?: number[];
  italics?: boolean;
}

export interface FontSource {
  id: string;
  kind: FontSourceKind;
  url?: string;
  cssText?: string;
  families: FontFamily[];
  label?: string;
}

export type SystemCascadePreset = 'system-ui-sans' | 'system-ui-serif' | 'system-ui-mono';
export type GenericFamily = 'sans-serif' | 'serif' | 'monospace' | 'cursive' | 'fantasy';
export type FontStackVariable = '--font-display' | '--font-sans' | '--font-serif' | '--font-mono';

export type FontStackSlot =
  | { kind: 'project'; familyId: string }
  | { kind: 'system'; preset: SystemCascadePreset }
  | { kind: 'generic'; value: GenericFamily };

export interface FontStack {
  variable: FontStackVariable;
  slots: FontStackSlot[];
}

export interface Theme {
  name: string;
  createdAt: string;
  updatedAt: string;
  editorConfigs: Record<string, PaletteConfig>;
  cssVariables: Record<string, string>;
  fontSources?: FontSource[];
  fontStacks?: FontStack[];
  /**
   * Server-attached file-name marker for round-tripping the file identity
   * back to the client. Set by `themeFileApi`'s GET handlers; read by
   * `themeInit` to seed `activeFileName`. Optional and not persisted to disk.
   */
  _fileName?: string;
  /**
   * Migration stamp. Absent on legacy files, treated as 0; the loader runs
   * any registered theme migrations whose `fromVersion >= file.schemaVersion`.
   * Save paths stamp the current value so resaved files skip past
   * migrations.
   */
  schemaVersion?: number;
}

export interface ThemeMeta {
  name: string;
  fileName: string;
  updatedAt: string;
  isActive: boolean;
}

/** On-disk shape of a single alias entry. Plain strings carry the bulk of
 *  aliases (token refs like `--surface-canvas-low` or literal CSS like `4px`);
 *  the gradient object shape is the structured payload for component-owned
 *  gradients that can't compress to a single string. */
export type AliasDiskValue =
  | string
  | { kind: 'gradient'; value: { type: 'linear' | 'radial' | 'solid' | 'none'; angle: number; radius?: number; centerX?: number; aspectX?: number; aspectY?: number; stops: { position: number; color: string; opacity?: number }[] } };

export interface ComponentConfig {
  name: string;
  component: string;
  createdAt: string;
  updatedAt: string;
  aliases: Record<string, AliasDiskValue>;
  config?: Record<string, unknown>;
  /**
   * Server-attached file-name marker. Same role as `Theme._fileName`. Set by
   * the component-configs GET handlers; not persisted to disk.
   */
  _fileName?: string;
  /**
   * Migration stamp. Absent on legacy files, treated as 0. See `Theme.schemaVersion`.
   */
  schemaVersion?: number;
}

export interface ComponentConfigMeta {
  name: string;
  fileName: string;
  updatedAt: string;
  isActive: boolean;
  isProduction: boolean;
}

/**
 * Manifest that captures an entire site state — the active theme plus the
 * active config for every component. Loading a manifest flips the relevant
 * `_active.json` pointers; the underlying theme + component-config files stay
 * the source of truth, so editing them flows through any manifest that
 * references them. The currently-active manifest is the live snapshot: theme
 * and component Adopts auto-patch its refs on the server.
 */
export interface Manifest {
  name: string;
  createdAt: string;
  updatedAt: string;
  /** File basename (no `.json`) of the theme this manifest pins. */
  theme: string;
  /** Map of componentId → config file basename. Components omitted here fall
   *  back to "default" at apply time. */
  componentConfigs: Record<string, string>;
  /** Server-attached file-name marker. Same role as `Theme._fileName`. */
  _fileName?: string;
}

/**
 * Transport artifact for sharing a manifest with someone else. Self-contained:
 * the bundle inlines the referenced theme and every non-default component
 * config so the receiver doesn't need anything else on disk to apply it.
 *
 * Bundles are *not* stored under `manifests/` — they're transient downloads /
 * uploads. Local manifests stay lightweight pointer files; bundles are the
 * import/export envelope. See temp/manifest-robustness-plan.md §11.
 *
 * `componentConfigs` is keyed by `${component}/${configName}` so a single map
 * carries multiple components. Entries whose manifest value is `"default"`
 * are deliberately omitted — the receiver's local `default.json` is the
 * live-tokens package's canonical default, and shipping the sender's default
 * would risk version-divergence with no clean conflict story.
 */
export interface ManifestBundle {
  /** Discriminator for safe identification of bundle JSON files. */
  kind: 'manifest-bundle';
  /** Bumps when the bundle envelope shape changes. Start at 1. */
  schemaVersion: 1;
  /** Sender's `@motion-proto/live-tokens` package version. Receiver can
   *  compare to its own to warn about compatibility drift. */
  liveTokensVersion: string;
  /** ISO timestamp of when the bundle was exported. */
  exportedAt: string;
  /** Full pointer-form manifest (same shape as on-disk manifest files). */
  manifest: Manifest;
  /** Full content of the theme that `manifest.theme` references. */
  theme: Theme;
  /** Full content of each non-default component config referenced by
   *  `manifest.componentConfigs`, keyed by `${component}/${configName}`. */
  componentConfigs: Record<string, ComponentConfig>;
}

export interface ManifestMeta {
  name: string;
  fileName: string;
  updatedAt: string;
  isActive: boolean;
  /** `true` only for `default` — the protected baseline. Cannot be written
   *  to or deleted, and theme/component Adopts cannot patch into it. */
  isProtected: boolean;
}
