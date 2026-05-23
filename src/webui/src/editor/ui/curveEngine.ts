export interface CurveAnchor {
  x: number;
  y: number;
  inDx: number;
  inDy: number;
  outDx: number;
  outDy: number;
}

export interface CurveConfig {
  yMin: number;
  yMax: number;
  label: string;
  gridLines: number[];
  dashedLines: number[];
}

export interface CurveTemplate {
  name: string;
  icon: string;
  anchors: (cfg: CurveConfig) => CurveAnchor[];
}

export const CURVE_H = 200;
export const CURVE_PAD_Y = 2;
export const CURVE_Y_PAD = 0.2;

export const lightnessCurveConfig: CurveConfig = {
  yMin: 0, yMax: 100,
  label: 'Lightness',
  gridLines: [50],
  dashedLines: [25, 75],
};

export const saturationCurveConfig: CurveConfig = {
  yMin: 0, yMax: 200,
  label: 'Saturation',
  gridLines: [100],
  dashedLines: [50, 150],
};

export const textLightnessCurveConfig: CurveConfig = {
  yMin: 0, yMax: 200,
  label: 'Lightness',
  gridLines: [100],
  dashedLines: [50, 150],
};

export const curveTemplates: CurveTemplate[] = [
  {
    name: 'Flat',
    icon: 'M2,6 L18,6',
    anchors: (cfg) => {
      const mid = (cfg.yMin + cfg.yMax) / 2;
      return [
        { x: 0, y: mid, inDx: 0, inDy: 0, outDx: 30, outDy: 0 },
        { x: 100, y: mid, inDx: -30, inDy: 0, outDx: 0, outDy: 0 },
      ];
    },
  },
  {
    name: 'Peak',
    icon: 'M2,10 L10,2 L18,10',
    anchors: (cfg) => [
      { x: 0, y: cfg.yMin, inDx: 0, inDy: 0, outDx: 15, outDy: 0 },
      { x: 50, y: cfg.yMax / 2, inDx: -15, inDy: 0, outDx: 15, outDy: 0 },
      { x: 100, y: cfg.yMin, inDx: -15, inDy: 0, outDx: 0, outDy: 0 },
    ],
  },
  {
    name: 'Ramp up',
    icon: 'M2,10 L18,2',
    anchors: (cfg) => {
      const lo = cfg.yMax * 0.1;
      const hi = cfg.yMax * 0.9;
      return [
        { x: 0, y: lo, inDx: 0, inDy: 0, outDx: 30, outDy: 0 },
        { x: 100, y: hi, inDx: -30, inDy: 0, outDx: 0, outDy: 0 },
      ];
    },
  },
  {
    name: 'Ramp down',
    icon: 'M2,2 L18,10',
    anchors: (cfg) => {
      const lo = cfg.yMax * 0.1;
      const hi = cfg.yMax * 0.9;
      return [
        { x: 0, y: hi, inDx: 0, inDy: 0, outDx: 30, outDy: 0 },
        { x: 100, y: lo, inDx: -30, inDy: 0, outDx: 0, outDy: 0 },
      ];
    },
  },
];

export function makeAnchor(x: number, y: number, tangentLen = 15): CurveAnchor {
  return { x, y, inDx: -tangentLen, inDy: 0, outDx: tangentLen, outDy: 0 };
}

export function isCornerAnchor(a: CurveAnchor): boolean {
  return a.inDx === 0 && a.inDy === 0 && a.outDx === 0 && a.outDy === 0;
}

export function curveXToSvg(v: number, w: number, padX: number = 0): number {
  return padX + (v / 100) * (w - 2 * padX);
}

export function curveYToSvg(v: number, cfg: CurveConfig): number {
  const range = cfg.yMax - cfg.yMin;
  const dMin = cfg.yMin - CURVE_Y_PAD * range;
  const dMax = cfg.yMax + CURVE_Y_PAD * range;
  return CURVE_H - CURVE_PAD_Y - ((v - dMin) / (dMax - dMin)) * (CURVE_H - 2 * CURVE_PAD_Y);
}

export function svgToX(px: number, w: number, padX: number = 0): number {
  return Math.max(0, Math.min(100, ((px - padX) / (w - 2 * padX)) * 100));
}

export function svgToY(py: number, cfg: CurveConfig): number {
  const range = cfg.yMax - cfg.yMin;
  const dMin = cfg.yMin - CURVE_Y_PAD * range;
  const dMax = cfg.yMax + CURVE_Y_PAD * range;
  const raw = dMin + ((CURVE_H - CURVE_PAD_Y - py) / (CURVE_H - 2 * CURVE_PAD_Y)) * (dMax - dMin);
  return Math.max(cfg.yMin, Math.min(cfg.yMax, raw));
}

export function evalBezier(
  p0x: number, p0y: number, c0x: number, c0y: number,
  c1x: number, c1y: number, p1x: number, p1y: number, t: number,
): { x: number; y: number } {
  const u = 1 - t, u2 = u * u, u3 = u2 * u;
  const t2 = t * t, t3 = t2 * t;
  return {
    x: u3 * p0x + 3 * u2 * t * c0x + 3 * u * t2 * c1x + t3 * p1x,
    y: u3 * p0y + 3 * u2 * t * c0y + 3 * u * t2 * c1y + t3 * p1y,
  };
}

export function sampleCurve(anchors: CurveAnchor[], xPos: number): number {
  if (anchors.length === 0) return 0;
  if (anchors.length === 1) return anchors[0].y;
  if (xPos <= anchors[0].x) return anchors[0].y;
  if (xPos >= anchors[anchors.length - 1].x) return anchors[anchors.length - 1].y;

  let seg = 0;
  while (seg < anchors.length - 2 && anchors[seg + 1].x < xPos) seg++;

  const a0 = anchors[seg], a1 = anchors[seg + 1];
  const p0x = a0.x, p0y = a0.y;
  const c0x = a0.x + a0.outDx, c0y = a0.y + a0.outDy;
  const c1x = a1.x + a1.inDx, c1y = a1.y + a1.inDy;
  const p1x = a1.x, p1y = a1.y;

  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const pt = evalBezier(p0x, p0y, c0x, c0y, c1x, c1y, p1x, p1y, mid);
    if (pt.x < xPos) lo = mid; else hi = mid;
  }
  return evalBezier(p0x, p0y, c0x, c0y, c1x, c1y, p1x, p1y, (lo + hi) / 2).y;
}

// --- Clipboard serialization ---

const CLIPBOARD_PREFIX = 'mp-curve:';

export function serializeCurve(anchors: CurveAnchor[], offset: number): string {
  return CLIPBOARD_PREFIX + JSON.stringify({ anchors, offset });
}

export function deserializeCurve(text: string): { anchors: CurveAnchor[]; offset: number } | null {
  if (!text.startsWith(CLIPBOARD_PREFIX)) return null;
  try {
    const data = JSON.parse(text.slice(CLIPBOARD_PREFIX.length));
    if (!Array.isArray(data.anchors) || typeof data.offset !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function buildCurvePath(anchors: CurveAnchor[], cfg: CurveConfig, w: number, padX: number = 0): string {
  if (anchors.length < 2) return '';
  let d = `M${curveXToSvg(anchors[0].x, w, padX)},${curveYToSvg(anchors[0].y, cfg)}`;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a0 = anchors[i], a1 = anchors[i + 1];
    d += ` C${curveXToSvg(a0.x + a0.outDx, w, padX)},${curveYToSvg(a0.y + a0.outDy, cfg)} ${curveXToSvg(a1.x + a1.inDx, w, padX)},${curveYToSvg(a1.y + a1.inDy, cfg)} ${curveXToSvg(a1.x, w, padX)},${curveYToSvg(a1.y, cfg)}`;
  }
  return d;
}
