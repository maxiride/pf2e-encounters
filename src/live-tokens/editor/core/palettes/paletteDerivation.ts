/**
 * Pure palette → CSS-variable derivation.
 *
 * Mirrors the logic that previously lived only inside `PaletteEditor.svelte`'s
 * reactive emission, but as standalone functions so the editor store can emit
 * palette-derived vars at boot without requiring any editor component to be
 * mounted. Without this module the disabled-state preview (and any other
 * `var(--surface-neutral)` consumer) reads a stale value on reload until the
 * user opens the LiveEditorOverlay and mounts the PaletteEditors.
 *
 * The PaletteEditor still owns *editing* preview (draft hex picked but not
 * yet committed to overrides). Once committed via the store, this module
 * derives the same CSS vars from the persisted config.
 */

import { hexToOklch, oklchToHex, gamutClamp } from './oklch';
import { type CurveAnchor, sampleCurve, makeAnchor } from '../../ui/curveEngine';
import type { PaletteConfig } from '../themes/themeTypes';

export type PaletteMode = 'chromatic' | 'gray';

export interface PaletteSpec {
  label: string;
  cssNamespace: string;
  mode: PaletteMode;
  emptySelector?: boolean;
  initialColor: string;
}

/**
 * Single source of truth for which palettes exist and how their CSS namespaces
 * map. Was previously hardcoded inside `VariablesTab.svelte`; centralising it
 * here lets the store seed boot-time vars without depending on the UI tree.
 */
export const PALETTE_SPECS: readonly PaletteSpec[] = [
  { label: 'Neutral',    cssNamespace: 'neutral',   mode: 'gray',      initialColor: '#808080' },
  { label: 'Alternate',  cssNamespace: 'alternate', mode: 'gray',      initialColor: '#808080' },
  { label: 'Background', cssNamespace: 'canvas',    mode: 'chromatic', emptySelector: true, initialColor: '#1a1a2e' },
  { label: 'Brand',      cssNamespace: 'brand',     mode: 'chromatic', initialColor: '#c93636' },
  { label: 'Accent',     cssNamespace: 'accent',    mode: 'chromatic', initialColor: '#f49e0b' },
  { label: 'Special',    cssNamespace: 'special',   mode: 'chromatic', initialColor: '#8b5cf6' },
  { label: 'Info',       cssNamespace: 'info',      mode: 'chromatic', initialColor: '#3077e8' },
  { label: 'Success',    cssNamespace: 'success',   mode: 'chromatic', initialColor: '#21c45d' },
  { label: 'Warning',    cssNamespace: 'warning',   mode: 'chromatic', initialColor: '#e66e1a' },
  { label: 'Danger',     cssNamespace: 'danger',    mode: 'chromatic', initialColor: '#e8304f' },
] as const;

const PALETTE_STEPS = [
  { label: '100' }, { label: '200' }, { label: '300' }, { label: '400' },
  { label: '500' }, { label: '600' }, { label: '700' }, { label: '800' },
  { label: '850' }, { label: '900' }, { label: '950' },
];

const GRAY_STEPS = [
  { label: '100' }, { label: '200' }, { label: '300' }, { label: '400' },
  { label: '500' }, { label: '600' }, { label: '700' }, { label: '800' },
  { label: '850' }, { label: '900' }, { label: '950' },
];

interface ScaleStep { name: string; position: number; }
interface Scale { title: string; isText: boolean; steps: ScaleStep[]; }

const SCALES: readonly Scale[] = [
  {
    title: 'Surfaces', isText: false,
    steps: [
      { name: 'lowest',  position: -1 },
      { name: 'lower',   position: -2 / 3 },
      { name: 'low',     position: -1 / 3 },
      { name: 'default', position: 0 },
      { name: 'high',    position: 1 / 3 },
      { name: 'higher',  position: 2 / 3 },
      { name: 'highest', position: 1 },
    ],
  },
  {
    title: 'Borders', isText: false,
    steps: [
      { name: 'faint',   position: -1 },
      { name: 'subtle',  position: -0.5 },
      { name: 'default', position: 0 },
      { name: 'medium',  position: 0.5 },
      { name: 'strong',  position: 1 },
    ],
  },
  {
    title: 'Text', isText: true,
    steps: [
      { name: 'primary',   position: 0 },
      { name: 'secondary', position: 0 },
      { name: 'tertiary',  position: 0 },
      { name: 'muted',     position: 0 },
      { name: 'disabled',  position: 0 },
    ],
  },
];

export const DEFAULT_PALETTE_LIGHTNESS = (): CurveAnchor[] => [makeAnchor(0, 95, 5), makeAnchor(100, 8, 5)];
export const DEFAULT_PALETTE_SATURATION = (): CurveAnchor[] => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)];
export const DEFAULT_GRAY_LIGHTNESS = (): CurveAnchor[] => [makeAnchor(0, 92, 5), makeAnchor(100, 3, 5)];
export const DEFAULT_GRAY_SATURATION = (): CurveAnchor[] => [makeAnchor(0, 20, 30), makeAnchor(100, 20, 30)];
export const DEFAULT_TINT_CHROMA = 0.04;

export const defaultScaleCurves = {
  Surfaces: {
    lightness:  () => [makeAnchor(0, 15, 5),   makeAnchor(100, 47, 5)],
    saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)],
  },
  Borders: {
    lightness:  () => [makeAnchor(0, 25, 5),   makeAnchor(100, 80, 5)],
    saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)],
  },
  Text: {
    lightness:  () => [makeAnchor(0, 120, 30), makeAnchor(100, 55, 30)],
    saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 15, 30)],
  },
} as const;

function paletteStepKey(label: string): string { return `Palette-${label}`; }
function grayStepKey(label: string): string { return `gray-${label}`; }
function stepKey(scaleTitle: string, stepName: string): string { return `${scaleTitle}-${stepName}`; }

function stepIndexToX(index: number, total: number): number {
  return total > 1 ? (index / (total - 1)) * 100 : 50;
}

function computePaletteColor(
  index: number,
  base: string,
  lightnessCurve: CurveAnchor[],
  saturationCurve: CurveAnchor[],
  curveOffset: Record<string, number>,
): string {
  const { c: baseC, h } = hexToOklch(base);
  const xPos = stepIndexToX(index, PALETTE_STEPS.length);
  const targetL = Math.max(0, Math.min(100, sampleCurve(lightnessCurve, xPos) + (curveOffset.lightness ?? 0))) / 100;
  const satMul = Math.max(0, Math.min(2, (sampleCurve(saturationCurve, xPos) + (curveOffset.saturation ?? 0)) / 100));
  const targetC = baseC * satMul;
  const clamped = gamutClamp(targetL, targetC, h);
  return oklchToHex(clamped.l, clamped.c, clamped.h);
}

function computeGrayColor(
  index: number,
  hue: number,
  chroma: number,
  grayLightnessCurve: CurveAnchor[],
  graySaturationCurve: CurveAnchor[],
  curveOffset: Record<string, number>,
): string {
  const xPos = stepIndexToX(index, GRAY_STEPS.length);
  const lOff = curveOffset['gray-lightness'] ?? 0;
  const sOff = curveOffset['gray-saturation'] ?? 0;
  const targetL = Math.max(0, Math.min(100, sampleCurve(grayLightnessCurve, xPos) + lOff)) / 100;
  const satMul = Math.max(0, Math.min(2, (sampleCurve(graySaturationCurve, xPos) + sOff) / 100));
  const targetC = chroma * satMul;
  const clamped = gamutClamp(targetL, targetC, hue);
  return oklchToHex(clamped.l, clamped.c, clamped.h);
}

function computeDerivedColor(
  step: ScaleStep,
  base: string,
  scaleTitle: string,
  scaleCurves: Record<string, { lightness: CurveAnchor[]; saturation: CurveAnchor[] }>,
  curveOffset: Record<string, number>,
): string {
  const scale = SCALES.find((s) => s.title === scaleTitle)!;
  const idx = scale.steps.indexOf(step);
  const xPos = stepIndexToX(idx, scale.steps.length);
  const defs = defaultScaleCurves[scaleTitle as keyof typeof defaultScaleCurves];
  const lCurve = scaleCurves[scaleTitle]?.lightness ?? defs.lightness();
  const sCurve = scaleCurves[scaleTitle]?.saturation ?? defs.saturation();
  const lOff = curveOffset[`${scaleTitle}-lightness`] ?? 0;
  const sOff = curveOffset[`${scaleTitle}-saturation`] ?? 0;
  const { l: baseL, c: baseC, h: baseH } = hexToOklch(base);
  let targetL: number;
  if (scale.isText) {
    const lMul = Math.max(0, Math.min(2, (sampleCurve(lCurve, xPos) + lOff) / 100));
    targetL = Math.max(0, Math.min(1, baseL * lMul));
  } else {
    targetL = Math.max(0, Math.min(100, sampleCurve(lCurve, xPos) + lOff)) / 100;
  }
  const satMul = Math.max(0, Math.min(2, (sampleCurve(sCurve, xPos) + sOff) / 100));
  const targetC = baseC * satMul;
  const clamped = gamutClamp(targetL, targetC, baseH);
  return oklchToHex(clamped.l, clamped.c, clamped.h);
}

export function scaleToCssVar(scaleTitle: string, stepName: string, cssNamespace: string | null): string | null {
  if (cssNamespace === null) return null;
  if (scaleTitle === 'Surfaces') {
    const suffix = stepName === 'default' ? '' : `-${stepName}`;
    return cssNamespace === 'neutral' ? `--surface-neutral${suffix}` : `--surface-${cssNamespace}${suffix}`;
  }
  if (scaleTitle === 'Borders') {
    const suffix = stepName === 'default' ? '' : `-${stepName}`;
    return cssNamespace === 'neutral' ? `--border-neutral${suffix}` : `--border-${cssNamespace}${suffix}`;
  }
  if (scaleTitle === 'Text') {
    if (cssNamespace === 'neutral') return `--text-${stepName}`;
    return stepName === 'primary' ? `--text-${cssNamespace}` : `--text-${cssNamespace}-${stepName}`;
  }
  return null;
}

export function derivePaletteVars(spec: PaletteSpec, config: PaletteConfig | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!config) return out;

  const baseColor = config.baseColor ?? spec.initialColor;
  const overrides = config.overrides ?? {};
  const curveOffset = config.curveOffset ?? {};
  const scaleCurves = config.scaleCurves ?? {};

  let baseForScales: string;

  if (spec.mode === 'gray') {
    const grayLightnessCurve = config.grayLightnessCurve ?? DEFAULT_GRAY_LIGHTNESS();
    const graySaturationCurve = config.graySaturationCurve ?? DEFAULT_GRAY_SATURATION();
    const tintHue = config.tintHue ?? 240;
    const tintChroma = config.tintChroma ?? DEFAULT_TINT_CHROMA;

    let gray500 = '#808080';
    GRAY_STEPS.forEach((step, index) => {
      const k = grayStepKey(step.label);
      const hex = computeGrayColor(index, tintHue, tintChroma, grayLightnessCurve, graySaturationCurve, curveOffset);
      const effective = (k in overrides) ? overrides[k] : hex;
      out[`--color-${spec.cssNamespace}-${step.label}`] = effective;
      if (step.label === '500') gray500 = hex;
    });
    baseForScales = gray500;
  } else {
    const lightnessCurve = config.lightnessCurve ?? DEFAULT_PALETTE_LIGHTNESS();
    const saturationCurve = config.saturationCurve ?? DEFAULT_PALETTE_SATURATION();

    PALETTE_STEPS.forEach((ps, index) => {
      const k = paletteStepKey(ps.label);
      const hex = computePaletteColor(index, baseColor, lightnessCurve, saturationCurve, curveOffset);
      const effective = (k in overrides) ? overrides[k] : hex;
      out[`--color-${spec.cssNamespace}-${ps.label}`] = effective;
    });
    baseForScales = baseColor;
  }

  for (const scale of SCALES) {
    for (const step of scale.steps) {
      const k = stepKey(scale.title, step.name);
      const hex = (k in overrides)
        ? overrides[k]
        : computeDerivedColor(step, baseForScales, scale.title, scaleCurves, curveOffset);
      const varName = scaleToCssVar(scale.title, step.name, spec.cssNamespace);
      if (varName) out[varName] = hex;
    }
  }

  if (spec.emptySelector) {
    const emptyMode = config.emptyMode ?? 'solid';
    const emptyStep = config.emptyStep ?? '850';
    const gradientStyle = config.gradientStyle ?? 'linear';
    const gradientAngle = config.gradientAngle ?? 180;
    const gradientReverse = config.gradientReverse ?? false;
    const gradientSize = config.gradientSize ?? 'page';
    const gradientStops = config.gradientStops ?? [
      { position: 0, paletteLabel: '800' },
      { position: 100, paletteLabel: '950' },
    ];

    if (emptyMode === 'solid') {
      const stepHex = out[`--color-${spec.cssNamespace}-${emptyStep}`];
      if (stepHex) out['--page-bg'] = stepHex;
      out['--page-bg-attachment'] = 'scroll';
    } else {
      const sortedStops = [...gradientStops].sort((a, b) =>
        gradientReverse ? b.position - a.position : a.position - b.position,
      );
      const stopsCss = sortedStops
        .map((s) => `${out[`--color-${spec.cssNamespace}-${s.paletteLabel}`] ?? '#000000'} ${s.position}%`)
        .join(', ');
      let gradient: string;
      switch (gradientStyle) {
        case 'radial': gradient = `radial-gradient(circle, ${stopsCss})`; break;
        case 'conic':  gradient = `conic-gradient(from ${gradientAngle}deg, ${stopsCss})`; break;
        default:       gradient = `linear-gradient(${gradientAngle}deg, ${stopsCss})`;
      }
      out['--page-bg'] = gradient;
      out['--page-bg-attachment'] = gradientSize === 'window' ? 'fixed' : 'scroll';
    }
  }

  return out;
}

export function palettesToVars(palettes: Record<string, PaletteConfig>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const spec of PALETTE_SPECS) {
    Object.assign(out, derivePaletteVars(spec, palettes[spec.label]));
  }
  return out;
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

/**
 * Reconcile palette typed state against the catch-all `cssVariables` bag and
 * report the set of variable names the typed slice now owns. Two operations:
 *
 *   - **Snap** (gated by `_imported`): for any palette whose `_imported` flag
 *     is true, the imported `--color-{ns}-500` value is treated as the
 *     authoritative anchor. Chromatic palettes get `baseColor` snapped to it;
 *     gray palettes (Neutral/Alternate) get `tintHue` + `tintChroma` derived
 *     from it via OKLCH. The flag is then cleared. Editor-authored palettes
 *     (no `_imported`) are left untouched — see `temp/manifest-robustness-plan.md`
 *     §9 for why "snap on any divergence" was wrong: it would have flipped
 *     `themes/default.json`'s accent from teal to olive on first read.
 *
 *   - **Consume** (always): every variable the palette's derivation produces
 *     is reported in `consumed` so the caller can strip it from
 *     `cssVariables`. The renderer (`editorRenderer.ts:42`) overlays
 *     `palettesToVars(palettes)` on top of `cssVariables` regardless, so
 *     stripped keys were dead data anyway. Stripping makes the file
 *     invariant explicit: catch-all carries only tokens no typed slice owns.
 *
 * Returns the updated palette map plus the two sets. Pure: no DOM, no I/O,
 * no module state. Idempotent on second call with the same input (no anchor
 * to snap to after first call's strip).
 */
export function reconcilePalettesFromCssVars(
  palettes: Record<string, PaletteConfig>,
  cssVars: Record<string, string>,
): {
  palettes: Record<string, PaletteConfig>;
  consumed: ReadonlySet<string>;
  snapped: ReadonlySet<string>;
} {
  const next: Record<string, PaletteConfig> = structuredClone(palettes);
  const consumed = new Set<string>();
  const snapped = new Set<string>();

  for (const spec of PALETTE_SPECS) {
    const current = next[spec.label];
    if (current === undefined) continue;

    if (current._imported === true) {
      const anchorHex = cssVars[`--color-${spec.cssNamespace}-500`];
      if (anchorHex && HEX_RE.test(anchorHex.trim())) {
        const hex = anchorHex.trim();
        if (spec.mode === 'gray') {
          const { c, h } = hexToOklch(hex);
          next[spec.label] = { ...current, tintHue: h, tintChroma: c, _imported: false };
        } else {
          next[spec.label] = { ...current, baseColor: hex, _imported: false };
        }
        snapped.add(spec.label);
      } else {
        // No anchor in cssVariables to snap to — flag has nothing to do; clear
        // it so subsequent calls don't keep checking. Safe because the renderer
        // is going to overlay palettesToVars anyway.
        next[spec.label] = { ...current, _imported: false };
      }
    }

    for (const k of Object.keys(derivePaletteVars(spec, next[spec.label]))) {
      consumed.add(k);
    }
  }

  return { palettes: next, consumed, snapped };
}
