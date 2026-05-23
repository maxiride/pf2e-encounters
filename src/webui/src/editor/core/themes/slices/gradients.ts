/**
 * Gradients slice — fixed four-slot scale (--gradient-1 … --gradient-4),
 * each rendering to a single CSS var. Stops carry token-name references
 * (`--color-brand-500`); the renderer wraps them in `var(...)` so palette
 * edits flow through.
 */
import type { EditorState, GradientToken, GradientTokenStop, GradientType, GradientAliasValue } from '../../store/editorTypes';
import { mutate } from '../../store/editorCore';

export function makeDefaultGradients(): GradientToken[] {
  return [
    {
      variable: '--gradient-1',
      type: 'linear',
      angle: 90,
      stops: [
        { position: 0, color: '--color-brand-500' },
        { position: 100, color: '--color-accent-500' },
      ],
    },
    {
      variable: '--gradient-2',
      type: 'linear',
      angle: 135,
      stops: [
        { position: 0, color: '--color-brand-500' },
        { position: 100, color: '--color-special-500' },
      ],
    },
    {
      variable: '--gradient-3',
      type: 'linear',
      angle: 90,
      stops: [
        { position: 0, color: '--color-success-500' },
        { position: 100, color: '--color-info-500' },
      ],
    },
    {
      variable: '--gradient-4',
      type: 'linear',
      angle: 45,
      stops: [
        { position: 0, color: '--color-danger-500' },
        { position: 100, color: '--color-warning-500' },
      ],
    },
  ];
}

function formatGradientStop(s: GradientTokenStop): string {
  return `${formatGradientStopColor(s)} ${s.position}%`;
}

/** Stops portion only — used by the palette selector to materialize a
 *  linear-gradient with a per-slot angle override while keeping the token's
 *  stop list (and its `var(--color-…)` refs, which propagate palette edits). */
export function formatGradientStops(t: GradientToken): string {
  return t.stops.map(formatGradientStop).join(', ');
}

/** Serialize a structured gradient value (theme token or component-owned)
 *  into a CSS background declaration.
 *  - `none`   → `transparent` (no background paint).
 *  - `solid`  → the first stop's color (no gradient function).
 *  - `linear` → `linear-gradient(<angle>, <stops>)`.
 *  - `radial` → `radial-gradient(<shape> at <centerX>% 50%, <stops>)`.
 *               centerX defaults to 50. Shape is `circle [radius]` when the
 *               aspect ratio is 1 (or absent); for aspect ≠ 1 we emit
 *               `ellipse rx ry` anchored to `radius || 100px`, area-preserved
 *               so the R=1 boundary is continuous with the legacy circle. */
export function formatGradientValue(v: GradientAliasValue): string {
  if (v.type === 'none') return 'transparent';
  if (v.type === 'solid') {
    const first = v.stops[0];
    if (!first) return 'transparent';
    return formatGradientStopColor(first);
  }
  const stops = v.stops.map(formatGradientStop).join(', ');
  if (v.type === 'linear') return `linear-gradient(${v.angle}deg, ${stops})`;
  const cx = v.centerX ?? 50;
  return `radial-gradient(${formatRadialShape(v)} at ${cx}% 50%, ${stops})`;
}

/** Default base radius (px) when the gradient has no explicit `radius` but
 *  needs concrete dimensions to express its aspect ratio. Chosen as a
 *  pleasant-looking mid-size that reads as a "soft glow" inside typical
 *  component containers; the user can dial `radius` to override. */
const DEFAULT_RADIAL_BASE_PX = 100;

function formatRadialShape(v: GradientAliasValue): string {
  const ax = v.aspectX ?? 1;
  const ay = v.aspectY ?? 1;
  if (ax === 1 && ay === 1) {
    return v.radius && v.radius > 0 ? `circle ${v.radius}px` : 'circle';
  }
  const base = v.radius && v.radius > 0 ? v.radius : DEFAULT_RADIAL_BASE_PX;
  const rx = base * ax;
  const ry = base * ay;
  return `ellipse ${rx.toFixed(2)}px ${ry.toFixed(2)}px`;
}

/** Resolve a stop's color + opacity into a CSS color value without the
 *  trailing `${position}%`. Shared by the gradient-stop formatter (which
 *  appends the position) and the solid path (which doesn't). */
function formatGradientStopColor(s: GradientTokenStop): string {
  const base = s.color.startsWith('--') ? `var(${s.color})` : s.color;
  const opacity = s.opacity ?? 100;
  return opacity >= 100
    ? base
    : `color-mix(in srgb, ${base} ${opacity}%, transparent)`;
}

function formatGradient(t: GradientToken): string {
  return formatGradientValue({
    type: t.type,
    angle: t.angle,
    centerX: t.centerX,
    aspectX: t.aspectX,
    aspectY: t.aspectY,
    stops: t.stops,
  });
}

export function gradientsToVars(g: EditorState['gradients']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of g.tokens) out[t.variable] = formatGradient(t);
  return out;
}

function findGradient(s: EditorState, variable: string): GradientToken | undefined {
  return s.gradients.tokens.find((t) => t.variable === variable);
}

/** Replace a gradient's type, angle, centerX, aspect, and stops in one shot.
 *  Used by the editor to restore a pre-edit snapshot on Cancel. */
export function setGradient(
  variable: string,
  next: { type: GradientType; angle: number; centerX?: number; aspectX?: number; aspectY?: number; stops: GradientTokenStop[] },
): void {
  mutate(`replace gradient ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (!t) return;
    t.type = next.type;
    t.angle = next.angle;
    t.centerX = next.centerX;
    t.aspectX = next.aspectX;
    t.aspectY = next.aspectY;
    t.stops = next.stops.map((st) => ({ ...st }));
  });
}

export function setGradientType(variable: string, type: GradientType): void {
  mutate(`set gradient type ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (t) t.type = type;
  });
}

export function setGradientAngle(variable: string, angle: number): void {
  mutate(`set gradient angle ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (t) t.angle = angle;
  });
}

export function setGradientCenterX(variable: string, centerX: number): void {
  mutate(`set gradient center ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (t) t.centerX = centerX;
  });
}

export function setGradientAspect(variable: string, aspect: { x: number; y: number }): void {
  mutate(`set gradient aspect ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (!t) return;
    // Drop axes that equal 1 (the legacy circle baseline) so the persisted
    // shape stays minimal and old data round-trips unchanged.
    if (aspect.x === 1) delete t.aspectX;
    else t.aspectX = aspect.x;
    if (aspect.y === 1) delete t.aspectY;
    else t.aspectY = aspect.y;
  });
}

export function setGradientStop(variable: string, index: number, stop: Partial<GradientTokenStop>): void {
  mutate(`set gradient stop ${variable}[${index}]`, (s) => {
    const t = findGradient(s, variable);
    if (!t || !t.stops[index]) return;
    if (stop.position !== undefined) t.stops[index].position = stop.position;
    if (stop.color !== undefined) t.stops[index].color = stop.color;
    if (stop.opacity !== undefined) t.stops[index].opacity = stop.opacity;
  });
}

export function addGradientStop(variable: string, stop: GradientTokenStop): void {
  mutate(`add gradient stop ${variable}`, (s) => {
    const t = findGradient(s, variable);
    if (!t) return;
    t.stops.push(stop);
    t.stops.sort((a, b) => a.position - b.position);
  });
}

export function removeGradientStop(variable: string, index: number): void {
  mutate(`remove gradient stop ${variable}[${index}]`, (s) => {
    const t = findGradient(s, variable);
    if (!t || t.stops.length <= 2) return;
    t.stops.splice(index, 1);
  });
}

export function addGradientToken(token: GradientToken): void {
  mutate(`add gradient ${token.variable}`, (s) => {
    if (findGradient(s, token.variable)) return;
    s.gradients.tokens.push({
      ...token,
      stops: token.stops.map((st) => ({ ...st })),
    });
  });
}

export function removeGradientToken(variable: string): void {
  mutate(`remove gradient ${variable}`, (s) => {
    s.gradients.tokens = s.gradients.tokens.filter((t) => t.variable !== variable);
  });
}
