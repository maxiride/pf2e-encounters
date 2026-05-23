/**
 * Source adapter for the visual gradient editor.
 *
 * `GradientEditor.svelte` was originally hard-wired to the theme-level
 * gradient library (`state.gradients.tokens`). Components that own their
 * own structured gradients (e.g. SectionDivider's per-variant slot) live
 * in `state.components[...].aliases[...]` as a `kind: 'gradient'` ref.
 *
 * Wrapping both behind one source interface lets the editor read + write
 * either backing store without leaking knowledge of which it's editing.
 * The store-derived `current` field reactively exposes the current value;
 * the mutator methods funnel each change through `mutate`, so undo /
 * persistence still cover the edit identically to direct API calls.
 */
import { derived, get, type Readable } from 'svelte/store';
import { editorState } from './editorStore';
import type { GradientType, GradientTokenStop, GradientAliasValue, CssVarRef } from './editorTypes';
import {
  setGradient,
  setGradientType,
  setGradientAngle,
  setGradientCenterX,
  setGradientAspect,
  setGradientStop,
  addGradientStop,
  removeGradientStop,
} from '../themes/slices/gradients';
import { setComponentAlias } from '../themes/slices/components';
import { mutate } from './editorCore';

export interface GradientSourceSnapshot {
  type: GradientType;
  angle: number;
  /** Horizontal center for radial gradients, 0–100. */
  centerX?: number;
  /** Per-axis stretch factors for the radial ellipse (1 = unscaled). */
  aspectX?: number;
  aspectY?: number;
  stops: GradientTokenStop[];
}

export interface GradientSource {
  /** Reactive readable of the current gradient value (or undefined if missing). */
  current: Readable<GradientSourceSnapshot | undefined>;
  setAll(next: GradientSourceSnapshot): void;
  setType(type: GradientType): void;
  setAngle(angle: number): void;
  setCenterX(centerX: number): void;
  setAspect(aspect: { x: number; y: number }): void;
  setStop(index: number, partial: Partial<GradientTokenStop>): void;
  addStop(stop: GradientTokenStop): void;
  removeStop(index: number): void;
}

/** Adapter for `--gradient-N` library tokens in `state.gradients.tokens`. */
export function themeGradientSource(variable: string): GradientSource {
  const current = derived(editorState, ($s) => {
    const t = $s.gradients.tokens.find((g) => g.variable === variable);
    if (!t) return undefined;
    return {
      type: t.type,
      angle: t.angle,
      centerX: t.centerX,
      aspectX: t.aspectX,
      aspectY: t.aspectY,
      stops: t.stops.map((s) => ({ ...s })),
    };
  });
  return {
    current,
    setAll: (next) => setGradient(variable, next),
    setType: (t) => setGradientType(variable, t),
    setAngle: (a) => setGradientAngle(variable, a),
    setCenterX: (x) => setGradientCenterX(variable, x),
    setAspect: (a) => setGradientAspect(variable, a),
    setStop: (i, p) => setGradientStop(variable, i, p),
    addStop: (s) => addGradientStop(variable, s),
    removeStop: (i) => removeGradientStop(variable, i),
  };
}

function readComponentGradient(component: string, varName: string): GradientAliasValue | undefined {
  const ref = get(editorState).components[component]?.aliases[varName];
  return ref?.kind === 'gradient' ? ref.value : undefined;
}

function writeComponentGradient(component: string, varName: string, value: GradientAliasValue): void {
  const ref: CssVarRef = { kind: 'gradient', value };
  setComponentAlias(component, varName, ref);
}

/** Adapter for component-owned gradients stored inline on a component alias. */
export function componentGradientSource(component: string, varName: string): GradientSource {
  const current = derived(editorState, ($s) => {
    const ref = $s.components[component]?.aliases[varName];
    if (ref?.kind !== 'gradient') return undefined;
    return {
      type: ref.value.type,
      angle: ref.value.angle,
      centerX: ref.value.centerX,
      aspectX: ref.value.aspectX,
      aspectY: ref.value.aspectY,
      stops: ref.value.stops.map((s) => ({ ...s })),
    };
  });
  /** Read-modify-write through `mutate` so each edit is one history entry
   *  and the renderer + persistence cycle pick it up uniformly with the
   *  theme-gradient path. */
  const update = (label: string, mutator: (g: GradientAliasValue) => void): void => {
    mutate(label, (s) => {
      const slice = s.components[component] ?? (s.components[component] = { activeFile: 'default', aliases: {}, config: {} });
      const ref = slice.aliases[varName];
      const base: GradientAliasValue =
        ref?.kind === 'gradient'
          ? {
              type: ref.value.type,
              angle: ref.value.angle,
              ...(ref.value.centerX !== undefined ? { centerX: ref.value.centerX } : {}),
              ...(ref.value.aspectX !== undefined ? { aspectX: ref.value.aspectX } : {}),
              ...(ref.value.aspectY !== undefined ? { aspectY: ref.value.aspectY } : {}),
              stops: ref.value.stops.map((st) => ({ ...st })),
            }
          : { type: 'linear', angle: 135, stops: [] };
      mutator(base);
      slice.aliases[varName] = { kind: 'gradient', value: base };
    });
  };
  return {
    current,
    setAll: (next) => writeComponentGradient(component, varName, {
      type: next.type,
      angle: next.angle,
      ...(next.centerX !== undefined ? { centerX: next.centerX } : {}),
      ...(next.aspectX !== undefined ? { aspectX: next.aspectX } : {}),
      ...(next.aspectY !== undefined ? { aspectY: next.aspectY } : {}),
      stops: next.stops.map((s) => ({ ...s })),
    }),
    setType: (t) => update(`set gradient type ${varName}`, (g) => { g.type = t; }),
    setAngle: (a) => update(`set gradient angle ${varName}`, (g) => { g.angle = a; }),
    setCenterX: (x) => update(`set gradient center ${varName}`, (g) => { g.centerX = x; }),
    setAspect: (a) => update(`set gradient aspect ${varName}`, (g) => {
      // Drop axes that equal 1 so persisted JSON stays minimal and pre-aspect
      // data round-trips unchanged.
      if (a.x === 1) delete g.aspectX;
      else g.aspectX = a.x;
      if (a.y === 1) delete g.aspectY;
      else g.aspectY = a.y;
    }),
    setStop: (i, p) => update(`set gradient stop ${varName}[${i}]`, (g) => {
      const stop = g.stops[i];
      if (!stop) return;
      if (p.position !== undefined) stop.position = p.position;
      if (p.color !== undefined) stop.color = p.color;
      if (p.opacity !== undefined) stop.opacity = p.opacity;
      // `monochrome: true` is the implicit default — drop the field on write
      // so the persisted shape stays minimal. Only the explicit override
      // (`false`) needs to live on the stop.
      if (p.monochrome !== undefined) {
        if (p.monochrome === false) stop.monochrome = false;
        else delete stop.monochrome;
      }
    }),
    addStop: (s) => update(`add gradient stop ${varName}`, (g) => {
      g.stops.push({ ...s });
      g.stops.sort((a, b) => a.position - b.position);
    }),
    removeStop: (i) => update(`remove gradient stop ${varName}[${i}]`, (g) => {
      if (g.stops.length <= 2) return;
      g.stops.splice(i, 1);
    }),
  };
}

/** Snapshot helper for save/cancel flows. */
export function snapshotGradient(source: GradientSource): GradientSourceSnapshot | null {
  const cur = get(source.current);
  if (!cur) return null;
  return {
    type: cur.type,
    angle: cur.angle,
    ...(cur.centerX !== undefined ? { centerX: cur.centerX } : {}),
    ...(cur.aspectX !== undefined ? { aspectX: cur.aspectX } : {}),
    ...(cur.aspectY !== undefined ? { aspectY: cur.aspectY } : {}),
    stops: cur.stops.map((s) => ({ ...s })),
  };
}

/** Read the component-side current gradient value used to seed UI defaults
 *  outside the GradientSource flow (e.g. the Monochrome checkbox derivation). */
export function readComponentGradientSync(component: string, varName: string): GradientAliasValue | undefined {
  return readComponentGradient(component, varName);
}
