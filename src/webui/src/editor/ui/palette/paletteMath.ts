import { hexToOklch, oklchToHex, gamutClamp } from '../../core/palettes/oklch';
import { type CurveAnchor, makeAnchor, sampleCurve } from '../curveEngine';

export const GRAY_FALLBACK = '#808080';
export const DEFAULT_TINT_CHROMA = 0.04;

export interface Step {
  name: string;
  position: number;
  lightness?: number;
  saturation?: number;
}

export interface Scale {
  title: string;
  isText: boolean;
  steps: Step[];
}

export interface GrayStep {
  label: string;
  hue: number;
  saturation: number;
  lightness: number;
}

export interface PaletteStepDef {
  label: string;
  lightness: number;
}

export type CurveOffset = Record<string, number>;
export type ScaleCurves = Record<string, { lightness: CurveAnchor[]; saturation: CurveAnchor[] }>;

export const DEFAULT_PALETTE_LIGHTNESS = (): CurveAnchor[] => [makeAnchor(0, 95, 5), makeAnchor(100, 8, 5)];
export const DEFAULT_PALETTE_SATURATION = (): CurveAnchor[] => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)];
export const DEFAULT_GRAY_LIGHTNESS = (): CurveAnchor[] => [makeAnchor(0, 92, 5), makeAnchor(100, 3, 5)];
export const DEFAULT_GRAY_SATURATION = (): CurveAnchor[] => [makeAnchor(0, 20, 30), makeAnchor(100, 20, 30)];

export const defaultScaleCurves: Record<string, { lightness: () => CurveAnchor[]; saturation: () => CurveAnchor[] }> = {
  Surfaces: {
    lightness: () => [makeAnchor(0, 15, 5), makeAnchor(100, 47, 5)],
    saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)],
  },
  Borders: {
    lightness: () => [makeAnchor(0, 25, 5), makeAnchor(100, 80, 5)],
    saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 100, 30)],
  },
  Text: {
    lightness: () => [makeAnchor(0, 120, 30), makeAnchor(100, 55, 30)],
    saturation: () => [makeAnchor(0, 100, 30), makeAnchor(100, 15, 30)],
  },
};

export function defaultScaleCurvesObject(): ScaleCurves {
  return {
    Surfaces: { lightness: defaultScaleCurves.Surfaces.lightness(), saturation: defaultScaleCurves.Surfaces.saturation() },
    Borders: { lightness: defaultScaleCurves.Borders.lightness(), saturation: defaultScaleCurves.Borders.saturation() },
    Text: { lightness: defaultScaleCurves.Text.lightness(), saturation: defaultScaleCurves.Text.saturation() },
  };
}

export const paletteStepLightness: PaletteStepDef[] = [
  { label: '100', lightness: 95 },
  { label: '200', lightness: 88 },
  { label: '300', lightness: 78 },
  { label: '400', lightness: 68 },
  { label: '500', lightness: 57 },
  { label: '600', lightness: 49 },
  { label: '700', lightness: 41 },
  { label: '800', lightness: 32 },
  { label: '850', lightness: 25 },
  { label: '900', lightness: 17 },
  { label: '950', lightness: 8 },
];

export const graySteps: GrayStep[] = [
  { label: '100', hue: 240, saturation: 5,  lightness: 92 },
  { label: '200', hue: 220, saturation: 13, lightness: 84 },
  { label: '300', hue: 216, saturation: 12, lightness: 72 },
  { label: '400', hue: 240, saturation: 5,  lightness: 61 },
  { label: '500', hue: 240, saturation: 5,  lightness: 50 },
  { label: '600', hue: 240, saturation: 5,  lightness: 42 },
  { label: '700', hue: 240, saturation: 5,  lightness: 34 },
  { label: '800', hue: 240, saturation: 10, lightness: 25 },
  { label: '850', hue: 229, saturation: 20, lightness: 18 },
  { label: '900', hue: 240, saturation: 30, lightness: 10 },
  { label: '950', hue: 229, saturation: 34, lightness: 3 },
];

export const scales: Scale[] = [
  {
    title: 'Surfaces',
    isText: false,
    steps: [
      { name: 'lowest',  position: -1 },
      { name: 'lower',   position: -2/3 },
      { name: 'low',     position: -1/3 },
      { name: 'default', position: 0 },
      { name: 'high',    position: 1/3 },
      { name: 'higher',  position: 2/3 },
      { name: 'highest', position: 1 },
    ]
  },
  {
    title: 'Borders',
    isText: false,
    steps: [
      { name: 'faint',   position: -1 },
      { name: 'subtle',  position: -0.5 },
      { name: 'default', position: 0 },
      { name: 'medium',  position: 0.5 },
      { name: 'strong',  position: 1 },
    ]
  },
  {
    title: 'Text',
    isText: true,
    steps: [
      { name: 'primary',   position: 0 },
      { name: 'secondary', position: 0 },
      { name: 'tertiary',  position: 0 },
      { name: 'muted',     position: 0 },
      { name: 'disabled',  position: 0 },
    ]
  }
];

export const paletteStepKey = (label: string) => `Palette-${label}`;
export const grayStepKey = (label: string) => `gray-${label}`;
export const stepKey = (scaleTitle: string, stepName: string) => `${scaleTitle}-${stepName}`;
export const scaleCurveKey = (scaleTitle: string, channel: 'lightness' | 'saturation') => `${scaleTitle}-${channel}`;

export function stepIndexToX(index: number): number {
  return (index / (paletteStepLightness.length - 1)) * 100;
}

export function grayStepToX(index: number): number {
  return graySteps.length > 1 ? (index / (graySteps.length - 1)) * 100 : 50;
}

export function scaleStepToX(step: Step, scale: Scale): number {
  const idx = scale.steps.indexOf(step);
  return scale.steps.length > 1 ? (idx / (scale.steps.length - 1)) * 100 : 50;
}

export function injectLockedAnchor(curve: CurveAnchor[], x: number, y: number): { curve: CurveAnchor[]; idx: number; injected: boolean } {
  const existing = curve.findIndex(a => Math.abs(a.x - x) < 0.5);
  if (existing >= 0) {
    if (curve[existing].x === x && Math.abs(curve[existing].y - y) < 0.01) return { curve, idx: existing, injected: false };
    return { curve: curve.map((a, i) => i === existing ? { ...a, x, y } : a), idx: existing, injected: false };
  }
  let insertAt = curve.findIndex(a => a.x > x);
  if (insertAt < 0) insertAt = curve.length;
  return { curve: [...curve.slice(0, insertAt), makeAnchor(x, y, 15), ...curve.slice(insertAt)], idx: insertAt, injected: true };
}

export function removeLockedAnchor(curve: CurveAnchor[], idx: number | null): CurveAnchor[] {
  if (idx === null || idx === 0 || idx === curve.length - 1) return curve;
  return curve.filter((_, i) => i !== idx);
}

export function computeGrayColor(
  index: number,
  hue: number,
  chroma: number,
  lightnessCurve: CurveAnchor[],
  saturationCurve: CurveAnchor[],
  curveOffset: CurveOffset
): string {
  const xPos = grayStepToX(index);
  const lOff = curveOffset['gray-lightness'] ?? 0;
  const sOff = curveOffset['gray-saturation'] ?? 0;

  const targetL = Math.max(0, Math.min(100, sampleCurve(lightnessCurve, xPos) + lOff)) / 100;
  const satMul = Math.max(0, Math.min(2, (sampleCurve(saturationCurve, xPos) + sOff) / 100));
  const targetC = chroma * satMul;

  const clamped = gamutClamp(targetL, targetC, hue);
  return oklchToHex(clamped.l, clamped.c, clamped.h);
}

export function computePaletteColor(
  index: number,
  base: string,
  lightnessCurve: CurveAnchor[],
  saturationCurve: CurveAnchor[],
  curveOffset: CurveOffset
): string {
  const { c: baseC, h } = hexToOklch(base);
  const xPos = stepIndexToX(index);

  const targetL = Math.max(0, Math.min(100, sampleCurve(lightnessCurve, xPos) + (curveOffset['lightness'] ?? 0))) / 100;
  const satMul = Math.max(0, Math.min(2, (sampleCurve(saturationCurve, xPos) + (curveOffset['saturation'] ?? 0)) / 100));
  const targetC = baseC * satMul;

  const clamped = gamutClamp(targetL, targetC, h);
  return oklchToHex(clamped.l, clamped.c, clamped.h);
}

export function computeDerivedColor(
  step: Step,
  base: string,
  scaleTitle: string,
  scaleCurves: ScaleCurves,
  curveOffset: CurveOffset
): string {
  const { l: baseL, c: baseC, h: baseH } = hexToOklch(base);
  const scale = scales.find(s => s.title === scaleTitle)!;
  const xPos = scaleStepToX(step, scale);

  const lCurve = scaleCurves[scaleTitle]?.lightness ?? [];
  const sCurve = scaleCurves[scaleTitle]?.saturation ?? [];
  const lOff = curveOffset[scaleCurveKey(scaleTitle, 'lightness')] ?? 0;
  const sOff = curveOffset[scaleCurveKey(scaleTitle, 'saturation')] ?? 0;

  let targetL: number;
  if (scale.isText) {
    // Text: lightness curve is a multiplier (100 = 1x base lightness)
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

interface PaletteComputed {
  hex: string;
}

// Pick the contiguous window of palette steps (dark-first) whose lightness
// curve best matches this scale's derived lightness curve.
export function snapScaleToPalette(
  scale: Scale,
  baseColor: string,
  scaleCurves: ScaleCurves,
  curveOffset: CurveOffset,
  paletteComputed: ReadonlyArray<PaletteComputed>
): Record<string, string> {
  const n = scale.steps.length;

  const stepL = scale.steps.map(step => {
    const derived = computeDerivedColor(step, baseColor, scale.title, scaleCurves, curveOffset);
    return hexToOklch(derived).l;
  });

  const palDarkFirst = [...paletteComputed].reverse();
  const palLDarkFirst = palDarkFirst.map(ps => hexToOklch(ps.hex).l);

  let bestStart = 0;
  let bestCost = Infinity;
  for (let start = 0; start <= palDarkFirst.length - n; start++) {
    let cost = 0;
    for (let i = 0; i < n; i++) {
      const d = stepL[i] - palLDarkFirst[start + i];
      cost += d * d;
    }
    if (cost < bestCost) {
      bestCost = cost;
      bestStart = start;
    }
  }

  const assigned: Record<string, string> = {};
  for (let i = 0; i < n; i++) {
    assigned[stepKey(scale.title, scale.steps[i].name)] = palDarkFirst[bestStart + i].hex;
  }
  return assigned;
}
