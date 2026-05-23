/**
 * Overlays slice — overlay + hover RGBA tokens. Defaults are editor-defined
 * (mirror what `VariablesTab` historically initialised into local let state)
 * and diverge from tokens.css by design: the editor starts with a neutral
 * palette and tokens.css continues to win until first edit.
 */
import type { EditorState, OverlayToken } from '../../store/editorTypes';

export function makeDefaultOverlayTokens(): OverlayToken[] {
  return [
    { variable: '--overlay-lowest', label: 'Lowest', r: 0, g: 0, b: 0, opacity: 0.05 },
    { variable: '--overlay-lower',  label: 'Lower',  r: 0, g: 0, b: 0, opacity: 0.1  },
    { variable: '--overlay-low',    label: 'Low',    r: 0, g: 0, b: 0, opacity: 0.2  },
    { variable: '--overlay',        label: 'Base',   r: 0, g: 0, b: 0, opacity: 0.3  },
    { variable: '--overlay-high',   label: 'High',   r: 0, g: 0, b: 0, opacity: 0.5  },
    { variable: '--overlay-higher', label: 'Higher', r: 0, g: 0, b: 0, opacity: 0.7  },
    { variable: '--overlay-highest',label: 'Highest',r: 0, g: 0, b: 0, opacity: 0.95 },
  ];
}

export function makeDefaultHoverTokens(): OverlayToken[] {
  return [
    { variable: '--hover-low',  label: 'Low',  r: 255, g: 255, b: 255, opacity: 0.05 },
    { variable: '--hover',      label: 'Base', r: 255, g: 255, b: 255, opacity: 0.1  },
    { variable: '--hover-high', label: 'High', r: 255, g: 255, b: 255, opacity: 0.15 },
  ];
}

export function makeDefaultOverlaysState(): EditorState['overlays'] {
  return {
    tokens: makeDefaultOverlayTokens(),
    hoverTokens: makeDefaultHoverTokens(),
    globals: {
      overlay: { hue: 0, saturation: 0, lightness: 0, opacityMin: 0.05, opacityMax: 0.95 },
      hover:   { hue: 0, saturation: 0, lightness: 100, opacityMin: 0.05, opacityMax: 0.15 },
    },
  };
}

export const OVERLAY_VAR_NAMES = [
  '--overlay-lowest', '--overlay-lower', '--overlay-low', '--overlay',
  '--overlay-high', '--overlay-higher', '--overlay-highest',
  '--hover-low', '--hover', '--hover-high',
] as const;

// Accepts rgb(), rgba(), and #rrggbb[aa] — themes saved by the editor
// always use rgba(), but loading hand-written files shouldn't break.
export const RGBA_RE = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i;
export const HEX_RE = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;

export function parseRgba(raw: string): { r: number; g: number; b: number; opacity: number } | null {
  const s = raw.trim();
  const m = s.match(RGBA_RE);
  if (m) {
    const r = parseInt(m[1], 10);
    const g = parseInt(m[2], 10);
    const b = parseInt(m[3], 10);
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (![r, g, b].every((n) => Number.isFinite(n) && n >= 0 && n <= 255)) return null;
    return { r, g, b, opacity: Number.isFinite(a) ? a : 1 };
  }
  const h = s.match(HEX_RE);
  if (h) {
    const hex = h[1];
    const alpha = h[2] !== undefined ? parseInt(h[2], 16) / 255 : 1;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      opacity: Math.round(alpha * 100) / 100,
    };
  }
  return null;
}

export function overlayTokenToRgba(t: OverlayToken): string {
  return `rgba(${t.r}, ${t.g}, ${t.b}, ${t.opacity})`;
}

export function overlaysToVars(o: EditorState['overlays']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of o.tokens) out[t.variable] = overlayTokenToRgba(t);
  for (const t of o.hoverTokens) out[t.variable] = overlayTokenToRgba(t);
  return out;
}

function tokensEqualDefault(tokens: OverlayToken[], defaults: OverlayToken[]): boolean {
  if (tokens.length !== defaults.length) return false;
  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i]; const b = defaults[i];
    if (a.variable !== b.variable || a.r !== b.r || a.g !== b.g || a.b !== b.b || a.opacity !== b.opacity) return false;
  }
  return true;
}

/**
 * Same pattern as columns: only emit overlay CSS vars once state diverges
 * from the editor defaults. tokens.css owns the rgba values until the
 * user touches any overlay control (or loads a theme that already
 * contains overrides).
 */
export function overlaysEqualsDefault(o: EditorState['overlays']): boolean {
  return tokensEqualDefault(o.tokens, makeDefaultOverlayTokens())
    && tokensEqualDefault(o.hoverTokens, makeDefaultHoverTokens());
}

export function applyOverlayVarsToState(overlays: EditorState['overlays'], vars: Record<string, string>): void {
  const applyTo = (list: OverlayToken[]) => {
    for (const t of list) {
      const raw = vars[t.variable];
      if (!raw) continue;
      const parsed = parseRgba(raw);
      if (!parsed) continue;
      t.r = parsed.r; t.g = parsed.g; t.b = parsed.b; t.opacity = parsed.opacity;
    }
  };
  applyTo(overlays.tokens);
  applyTo(overlays.hoverTokens);
}

/**
 * Loader: route overlay/hover entries from a freshly-loaded theme's vars
 * bag into `next.overlays` and remove them from the bag. Mutates `next`
 * and `rawVars` in place.
 */
export function loadOverlaysFromVars(
  next: EditorState,
  rawVars: Record<string, string>,
): void {
  applyOverlayVarsToState(next.overlays, rawVars);
  for (const name of OVERLAY_VAR_NAMES) delete rawVars[name];
}
