import type { PaletteConfig, FontSource, FontStack } from '../themes/themeTypes';

export interface ShadowGlobals {
  angle: number;
  opacityMin: number; opacityMax: number; opacityLocked: boolean;
  distanceMin: number; distanceMax: number;
  blurMin: number; blurMax: number; blurLocked: boolean;
  sizeMin: number; sizeMax: number; sizeLocked: boolean;
  hue: number; saturation: number; lightness: number;
}

export interface ShadowToken {
  variable: string;
  x: number; y: number; blur: number; spread: number;
  opacity: number; hue: number; saturation: number; lightness: number;
  angle: number; distance: number;
}

export interface ShadowOverrideFlags {
  angle: boolean; opacity: boolean; color: boolean;
  distance: boolean; blur: boolean; size: boolean;
}

export interface OverlayToken {
  variable: string; label: string;
  r: number; g: number; b: number; opacity: number;
}

export interface OverlayChannelGlobals {
  hue: number; saturation: number; lightness: number;
  opacityMin: number; opacityMax: number;
}

export interface OverlayGlobals {
  overlay: OverlayChannelGlobals;
  hover: OverlayChannelGlobals;
}

export interface ColumnsState {
  count: number;
  maxWidth: number;
  gutter: number;
  margin: number;
}

/** Gradient render mode.
 *  - `linear` / `radial`: real gradients with N stops + angle (linear) or radius (radial).
 *  - `solid`: collapses to the first stop's color. Angle/radius/extra stops carried in
 *    the payload but ignored by the renderer; toggling back restores the prior shape.
 *  - `none`: transparent. Same carry-forward semantics — payload retained for
 *    round-trip when the user toggles back to a real gradient. */
export type GradientType = 'linear' | 'radial' | 'solid' | 'none';

export interface GradientTokenStop {
  /** 0–100 percentage along the gradient axis. */
  position: number;
  /** CSS variable name the stop resolves through (e.g. '--color-brand-500'). */
  color: string;
  /** When `false`, this stop is an explicit off-palette override: the stop
   *  picker opens to any color (not family-filtered), and the stop is skipped
   *  by family-swap rewrites so its color survives a variant family change.
   *  Defaults to true (follow family) on read; absence is the same as `true`.
   *  Only meaningful for gradients rendered inside a family-aware context. */
  monochrome?: boolean;
  /** 0–100 alpha applied to the stop's color. Defaults to 100 (fully opaque). */
  opacity?: number;
}

export interface GradientToken {
  /** Output CSS variable, e.g. '--gradient-1'. */
  variable: string;
  type: GradientType;
  /** Degrees, applies to linear only. */
  angle: number;
  /** Pixel radius for radial gradients. When absent or zero, the renderer
   *  emits CSS's default ellipse/farthest-corner shape. */
  radius?: number;
  /** Horizontal center position for radial gradients, 0–100. Defaults to 50. */
  centerX?: number;
  /** Horizontal stretch factor for the radial ellipse (1–8). Defaults to 1.
   *  With aspectY, the rendered semi-axes are `radius * aspect*`, so both
   *  shape (ratio) and size are encoded together. Both = 1 keeps the legacy
   *  `circle` render path verbatim. */
  aspectX?: number;
  /** Vertical stretch factor for the radial ellipse (1–8). Defaults to 1. */
  aspectY?: number;
  stops: GradientTokenStop[];
}

/** Structured gradient payload carried inline on a component alias.
 *  Mirrors GradientToken minus `variable` (the alias key itself is the
 *  binding). Used when a component owns a per-instance gradient that
 *  doesn't share the theme-level `--gradient-N` library. */
export interface GradientAliasValue {
  type: GradientType;
  angle: number;
  /** See GradientToken.radius. */
  radius?: number;
  /** See GradientToken.centerX. */
  centerX?: number;
  /** See GradientToken.aspectX. */
  aspectX?: number;
  /** See GradientToken.aspectY. */
  aspectY?: number;
  stops: GradientTokenStop[];
}

export type CssVarRef =
  | { kind: 'token'; name: string }
  | { kind: 'literal'; value: string }
  | { kind: 'gradient'; value: GradientAliasValue };

export interface ComponentSlice {
  activeFile: string;
  aliases: Record<string, CssVarRef>;
  config: Record<string, unknown>;
  unlinked?: string[];
}

/**
 * Single source of truth for everything a saved token file depends on, plus
 * the domain state currently scattered across VariablesTab local `let` fields.
 * View state (tab selection, dialog flags, drag payloads, editing drafts)
 * stays out of this tree.
 */
export interface EditorState {
  palettes: Record<string, PaletteConfig>;
  fonts: { sources: FontSource[]; stacks: FontStack[] };
  shadows: {
    globals: ShadowGlobals;
    tokens: ShadowToken[];
    overrides: Record<string, ShadowOverrideFlags>;
  };
  overlays: {
    tokens: OverlayToken[];
    hoverTokens: OverlayToken[];
    globals: OverlayGlobals;
  };
  columns: ColumnsState;
  components: Record<string, ComponentSlice>;
  gradients: { tokens: GradientToken[] };
  cssVars: Record<string, string>;
}
