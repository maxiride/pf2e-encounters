<script lang="ts">
  import { stopPropagation, createBubbler } from 'svelte/legacy';

  const bubble = createBubbler();
  import { onMount, onDestroy, tick, untrack } from 'svelte';
  import { hexToOklch } from '../core/palettes/oklch';
  import { type CurveAnchor, lightnessCurveConfig, saturationCurveConfig } from './curveEngine';
  import ColorEditPanel from './ColorEditPanel.svelte';
  import OverridesPanel from './palette/OverridesPanel.svelte';
  import UIPillButton from './UIPillButton.svelte';
  import GradientStopEditor from './palette/GradientStopEditor.svelte';
  import ScaleCurveEditor from './palette/ScaleCurveEditor.svelte';
  import PaletteBase from './palette/PaletteBase.svelte';
  import { type EditingState, idleState, BASE_KEY, isEditingBase as isBaseEdit } from './palette/paletteEditorState';
  import {
    type Step, type Scale, type GrayStep, type CurveOffset, type ScaleCurves,
    GRAY_FALLBACK, DEFAULT_TINT_CHROMA,
    DEFAULT_PALETTE_LIGHTNESS, DEFAULT_PALETTE_SATURATION, DEFAULT_GRAY_LIGHTNESS, DEFAULT_GRAY_SATURATION,
    defaultScaleCurves, defaultScaleCurvesObject,
    paletteStepLightness, graySteps, scales,
    paletteStepKey, grayStepKey, stepKey, scaleCurveKey as getScaleCurveKey,
    stepIndexToX,
    injectLockedAnchor, removeLockedAnchor,
    computeGrayColor as computeGrayColorPure,
    computePaletteColor as computePaletteColorPure,
    computeDerivedColor as computeDerivedColorPure,
    snapScaleToPalette as snapScaleToPalettePure,
  } from './palette/paletteMath';
  import type { PaletteConfig, GradientStop } from '../core/themes/themeTypes';
  import { editorState, mutate, setPaletteConfig, beginSliderGesture, beginScope, commitScope, cancelScope, type Scope } from '../core/store/editorStore';
  import { showCopyPopover } from './copyPopover';

  interface Props {
    label: string;
    displayLabel?: string | null;
    initialColor?: string;
    mode?: 'chromatic' | 'gray';
    cssNamespace?: string | null;
    emptySelector?: boolean;
  }

  let {
    label,
    displayLabel = null,
    initialColor = GRAY_FALLBACK,
    mode = 'chromatic',
    cssNamespace = null,
    emptySelector = false
  }: Props = $props();


  function defaultPaletteConfig(): PaletteConfig {
    return {
      baseColor: initialColor,
      tintHue: 240,
      tintChroma: DEFAULT_TINT_CHROMA,
      lightnessCurve: DEFAULT_PALETTE_LIGHTNESS(),
      saturationCurve: DEFAULT_PALETTE_SATURATION(),
      grayLightnessCurve: DEFAULT_GRAY_LIGHTNESS(),
      graySaturationCurve: DEFAULT_GRAY_SATURATION(),
      scaleCurves: defaultScaleCurvesObject(),
      curveOffset: { lightness: 0, saturation: 0 },
      overrides: {},
      snappedScales: [],
      anchorToBase: true,
    };
  }

  function edit<K extends keyof PaletteConfig>(field: K, value: PaletteConfig[K]): void {
    mutate(`${label}: ${String(field)}`, (s) => {
      if (!s.palettes[label]) s.palettes[label] = defaultPaletteConfig();
      (s.palettes[label] as any)[field] = value;
    });
  }

  function patchPalette(patch: Partial<PaletteConfig>, historyLabel: string): void {
    mutate(`${label}: ${historyLabel}`, (s) => {
      if (!s.palettes[label]) s.palettes[label] = defaultPaletteConfig();
      Object.assign(s.palettes[label], patch);
    });
  }

  let lockedLightnessIdx: number | null = $derived.by(() => {
    if (!anchorToBase) return null;
    const x500 = stepIndexToX(4);
    const idx = lightnessCurve.findIndex(a => Math.abs(a.x - x500) < 0.5);
    return idx >= 0 ? idx : null;
  });
  let lockedSaturationIdx: number | null = $derived.by(() => {
    if (!anchorToBase) return null;
    const x500 = stepIndexToX(4);
    const idx = saturationCurve.findIndex(a => Math.abs(a.x - x500) < 0.5);
    return idx >= 0 ? idx : null;
  });

  // Held at component scope so inline header-swatch handlers and the function
  // handlers share one handle for commit/cancel.
  let paletteEditScope: Scope | null = null;

  function openSession() {
    paletteEditScope = beginScope({ label: 'palette session', collapseToOne: true, clipUndoFloor: true });
  }

  function stopColor(stop: GradientStop, pc: typeof paletteComputed): string {
    const ps = pc?.find(p => p.label === stop.paletteLabel);
    return ps ? ps.effective : '#000000';
  }

  function onEmptyModeChange(e: Event) {
    edit('emptyMode', (e.currentTarget as HTMLInputElement).checked ? 'gradient' : 'solid');
  }

  let grayEditorOpen = $state(false);
  let showDerived = $state(false);
  let paletteEditorOpen = $state(false);

  function setLightnessCurve(a: CurveAnchor[]) { edit('lightnessCurve', a); }
  function setSaturationCurve(a: CurveAnchor[]) { edit('saturationCurve', a); }
  function setGrayLightnessCurve(a: CurveAnchor[]) { edit('grayLightnessCurve', a); }
  function setGraySaturationCurve(a: CurveAnchor[]) { edit('graySaturationCurve', a); }

  function handleOffset(key: string, value: number) {
    edit('curveOffset', { ...curveOffset, [key]: value });
  }

  let editing: EditingState = $state(idleState);

  let injectedLightness = false;
  let injectedSaturation = false;

  function computeGrayColor(index: number, hue: number, chroma: number = tintChroma): string {
    return computeGrayColorPure(index, hue, chroma, grayLightnessCurve, graySaturationCurve, curveOffset);
  }

  function computePaletteColor(index: number, base: string): string {
    return computePaletteColorPure(index, base, lightnessCurve, saturationCurve, curveOffset);
  }

  function computeDerivedColor(step: Step, base: string, scaleTitle: string): string {
    return computeDerivedColorPure(step, base, scaleTitle, scaleCurves, curveOffset);
  }

  /**
   * Toggle anchorToBase: inject (or remove) the locked 500 anchor in both
   * curves atomically with the flag flip, so one undo reverses the whole
   * thing. Transient `injectedLightness` / `injectedSaturation` remember
   * whether we created the anchor (vs it already existed) so toggle-off
   * doesn't destroy a user-authored anchor. Not persisted — acceptable drift
   * on reload is that a pre-existing anchor would be preserved on toggle-off.
   */
  function setAnchorToBase(next: boolean) {
    if (next === anchorToBase) return;
    if (next) {
      const x500 = stepIndexToX(4);
      const lResult = injectLockedAnchor(lightnessCurve, x500, hexToOklch(baseColor).l * 100);
      const sResult = injectLockedAnchor(saturationCurve, x500, 100);
      injectedLightness = lResult.injected;
      injectedSaturation = sResult.injected;
      patchPalette({
        anchorToBase: true,
        lightnessCurve: lResult.curve,
        saturationCurve: sResult.curve,
      }, 'anchor on');
    } else {
      const lCurr = lightnessCurve;
      const sCurr = saturationCurve;
      const nextL = injectedLightness ? removeLockedAnchor(lCurr, lockedLightnessIdx) : lCurr;
      const nextS = injectedSaturation ? removeLockedAnchor(sCurr, lockedSaturationIdx) : sCurr;
      injectedLightness = false;
      injectedSaturation = false;
      patchPalette({
        anchorToBase: false,
        lightnessCurve: nextL,
        saturationCurve: nextS,
      }, 'anchor off');
    }
  }



  function startBaseEdit() {
    if (editing.kind === 'editingBase') { confirmEdit(); return; }
    editing = mode === 'gray'
      ? { kind: 'editingBase', snapshotHex: gray500Hex, snapshotTintHue: tintHue, snapshotTintChroma: tintChroma }
      : { kind: 'editingBase', snapshotHex: baseColor, snapshotTintHue: null, snapshotTintChroma: null };
    openSession();
  }

  function handlePaletteClick(ps: { label: string; lightness: number; index: number }) {
    const k = paletteStepKey(ps.label);
    if (editingKey === k) {
      confirmEdit();
      return;
    }
    const current = (k in overrides) ? overrides[k] : computePaletteColor(ps.index, baseColor);
    editing = { kind: 'editingStep', stepKey: k, snapshot: current, draft: current };
    openSession();
  }

  let scaleEditorOpen: Record<string, boolean> = $state({ Surfaces: false, Borders: false, Text: false });

  function toggleScaleEditor(title: string) {
    scaleEditorOpen[title] = !scaleEditorOpen[title];
    scaleEditorOpen = scaleEditorOpen;
  }

  function setScaleCurve(title: string, channel: 'lightness' | 'saturation', a: CurveAnchor[]) {
    const cur = scaleCurves[title] ?? { lightness: defaultScaleCurves[title].lightness(), saturation: defaultScaleCurves[title].saturation() };
    edit('scaleCurves', { ...scaleCurves, [title]: { ...cur, [channel]: a } });
  }

  function handleColorChange(hex: string) {
    if (isEditingBase) {
      // Gray mode's base is derived from tintHue/tintChroma; raw hex only applies to chromatic.
      if (mode === 'chromatic') edit('baseColor', hex);
      return;
    }
    if (editing.kind === 'editingStep') {
      editing = { ...editing, draft: hex };
      if (editing.stepKey in overrides) {
        edit('overrides', { ...overrides, [editing.stepKey]: hex });
      }
    }
  }

  function resetOverride(k: string) {
    if (!(k in overrides)) return;
    const { [k]: _, ...rest } = overrides;
    edit('overrides', rest);
  }

  function handleOverrideClick(k: string, step: Step, scaleTitle: string) {
    if (editingKey === k) {
      confirmEdit();
      return;
    }
    const current = (k in overrides) ? overrides[k] : computeDerivedColor(step, gray500Hex, scaleTitle);
    editing = { kind: 'editingStep', stepKey: k, snapshot: current, draft: current };
    openSession();
  }

  function handleGrayClick(gStep: GrayStep, index: number) {
    const k = grayStepKey(gStep.label);
    if (editingKey === k) {
      confirmEdit();
      return;
    }
    const current = (k in overrides) ? overrides[k] : computeGrayColor(index, tintHue, tintChroma);
    editing = { kind: 'editingStep', stepKey: k, snapshot: current, draft: current };
    openSession();
  }

  async function confirmEdit() {
    if (editingKey) {
      // Accumulate override changes into one patch so the session commit sees
      // a single final state (no intermediate reactive round-trips).
      let nextOverrides = { ...overrides };
      if (editingDraft !== null) {
        const computed = computedValueForKey(editingKey);
        if (computed !== null && editingDraft !== computed) {
          nextOverrides[editingKey] = editingDraft;
        } else if (computed !== null && editingKey in nextOverrides && editingDraft === computed) {
          delete nextOverrides[editingKey];
        }
      }
      for (const scale of scales.filter(s => !s.isText)) {
        if (snappedScales.has(scale.title) && scale.steps.some(s => stepKey(scale.title, s.name) === editingKey)) {
          const assigned = snapScaleToPalette(scale);
          nextOverrides = { ...nextOverrides, ...assigned };
          break;
        }
      }
      if (JSON.stringify(nextOverrides) !== JSON.stringify(overrides)) {
        edit('overrides', nextOverrides);
      }
    }
    editing = idleState;
    // tick() lets the store-derived reactives flush before session commit
    await tick();
    if (paletteEditScope) { commitScope(paletteEditScope); paletteEditScope = null; }
  }

  function cancelEdit() {
    editing = idleState;
    // Restoring the session snapshot pulls baseColor/tintHue/overrides/… back to pre-open.
    if (paletteEditScope) { cancelScope(paletteEditScope); paletteEditScope = null; }
  }

  function removeOverride(k: string) {
    const { [k]: _, ...rest } = overrides;
    edit('overrides', rest);
    if (editingKey === k) { editing = idleState; }
  }

  function computedValueForKey(key: string): string | null {
    const ps = paletteStepLightness.find(p => paletteStepKey(p.label) === key);
    if (ps) {
      const idx = paletteStepLightness.indexOf(ps);
      return computePaletteColor(idx, baseColor);
    }
    const gi = graySteps.findIndex(g => grayStepKey(g.label) === key);
    if (gi >= 0) return computeGrayColor(gi, tintHue, tintChroma);
    for (const scale of scales) {
      for (const step of scale.steps) {
        if (stepKey(scale.title, step.name) === key) {
          return computeDerivedColor(step, gray500Hex, scale.title);
        }
      }
    }
    return null;
  }

  function effectiveColor(k: string, step: Step, scaleTitle: string, _version?: string): string {
    if (editingKey === k && editingDraft !== null) return editingDraft;
    return (k in overrides) ? overrides[k] : computeDerivedColor(step, gray500Hex, scaleTitle);
  }

  let copiedKey: string | null = $state(null);
  function copyHex(k: string, hex: string, event?: MouseEvent) {
    navigator.clipboard.writeText(hex);
    copiedKey = k;
    showCopyPopover(hex, event?.currentTarget ?? null);
    setTimeout(() => { copiedKey = null; }, 1500);
  }

  let copiedLabelKey: string | null = $state(null);
  function copyVarName(k: string, varName: string, event?: MouseEvent) {
    navigator.clipboard.writeText(varName);
    copiedLabelKey = k;
    showCopyPopover(varName, event?.currentTarget ?? null);
    setTimeout(() => { copiedLabelKey = null; }, 1500);
  }

  function snapScaleToPalette(scale: Scale): Record<string, string> {
    return snapScaleToPalettePure(scale, baseColor, scaleCurves, curveOffset, paletteComputed);
  }

  function toggleSnapAll(scale: Scale) {
    if (snappedScales.has(scale.title)) {
      snapPickerKey = null;
      const nextOverrides = { ...overrides };
      for (const step of scale.steps) {
        delete nextOverrides[stepKey(scale.title, step.name)];
      }
      const nextSnapped = [...snappedScales].filter(s => s !== scale.title);
      patchPalette({ snappedScales: nextSnapped, overrides: nextOverrides }, 'unsnap scale');
      if (editingKey && scale.steps.some(s => stepKey(scale.title, s.name) === editingKey)) {
        editing = idleState;
      }
    } else {
      const assigned = snapScaleToPalette(scale);
      const nextSnapped = [...snappedScales, scale.title];
      patchPalette({ snappedScales: nextSnapped, overrides: { ...overrides, ...assigned } }, 'snap scale');
    }
  }

  function clearPaletteOverrides() {
    const next = { ...overrides };
    if (mode === 'gray') {
      for (const step of graySteps) delete next[grayStepKey(step.label)];
    } else {
      for (const ps of paletteStepLightness) delete next[paletteStepKey(ps.label)];
    }
    edit('overrides', next);
  }

  function clearScaleOverrides(scale: Scale) {
    snapPickerKey = null;
    const nextOverrides = { ...overrides };
    for (const step of scale.steps) {
      delete nextOverrides[stepKey(scale.title, step.name)];
    }
    const nextSnapped = [...snappedScales].filter(s => s !== scale.title);
    patchPalette({ snappedScales: nextSnapped, overrides: nextOverrides }, 'clear scale overrides');
    if (editingKey && scale.steps.some(s => stepKey(scale.title, s.name) === editingKey)) {
      editing = idleState;
    }
  }

  let snapPickerKey: string | null = $state(null);

  function handleDocClick(e: MouseEvent) {
    if (!snapPickerKey) return;
    const target = e.target as HTMLElement;
    if (target.closest('.override-slot-wrapper')) return;
    snapPickerKey = null;
  }
  onMount(() => document.addEventListener('click', handleDocClick, true));
  onDestroy(() => document.removeEventListener('click', handleDocClick, true));

  function selectSnapValue(k: string, paletteHex: string, _scaleTitle: string) {
    edit('overrides', { ...overrides, [k]: paletteHex });
    snapPickerKey = null;
  }

  function handleSnappedClick(k: string) {
    if (snapPickerKey === k) {
      snapPickerKey = null;
    } else {
      snapPickerKey = k;
    }
  }

  function resnapScales() {
    if (snappedScales.size === 0) return;
    let changed = false;
    const next = { ...overrides };
    for (const scale of scales.filter(s => !s.isText)) {
      if (!snappedScales.has(scale.title)) continue;
      const assigned = snapScaleToPalette(scale);
      for (const [k, hex] of Object.entries(assigned)) {
        if (next[k] !== hex) {
          next[k] = hex;
          changed = true;
        }
      }
    }
    if (changed) edit('overrides', next);
  }

  export function loadConfig(config: PaletteConfig) {
    setPaletteConfig(label, config);
  }

  // Each field reads `$editorState.palettes[label]` directly. A chained
  // `$derived` of the whole config would return the same object reference on
  // every mutate-in-place store update (Svelte 5 uses `===` equality) and
  // short-circuit the downstream chain — swatches would freeze.
  let baseColor = $derived($editorState.palettes[label]?.baseColor ?? initialColor);
  let tintHue = $derived($editorState.palettes[label]?.tintHue ?? 240);
  let tintChroma = $derived($editorState.palettes[label]?.tintChroma ?? DEFAULT_TINT_CHROMA);
  let lightnessCurve = $derived($editorState.palettes[label]?.lightnessCurve ?? DEFAULT_PALETTE_LIGHTNESS());
  let saturationCurve = $derived($editorState.palettes[label]?.saturationCurve ?? DEFAULT_PALETTE_SATURATION());
  let grayLightnessCurve = $derived($editorState.palettes[label]?.grayLightnessCurve ?? DEFAULT_GRAY_LIGHTNESS());
  let graySaturationCurve = $derived($editorState.palettes[label]?.graySaturationCurve ?? DEFAULT_GRAY_SATURATION());
  let scaleCurves = $derived($editorState.palettes[label]?.scaleCurves ?? defaultScaleCurvesObject());
  let curveOffset = $derived($editorState.palettes[label]?.curveOffset ?? { lightness: 0, saturation: 0 });
  let overrides = $derived($editorState.palettes[label]?.overrides ?? {});
  let snappedScales = $derived(new Set($editorState.palettes[label]?.snappedScales ?? []));
  let anchorToBase = $derived($editorState.palettes[label]?.anchorToBase ?? true);
  let emptyMode = $derived($editorState.palettes[label]?.emptyMode ?? 'solid');
  let emptyStep = $derived($editorState.palettes[label]?.emptyStep ?? '850');
  let gradientStyle = $derived($editorState.palettes[label]?.gradientStyle ?? 'linear');
  let gradientAngle = $derived($editorState.palettes[label]?.gradientAngle ?? 180);
  let gradientReverse = $derived($editorState.palettes[label]?.gradientReverse ?? false);
  let gradientStops = $derived($editorState.palettes[label]?.gradientStops ?? [
    { position: 0, paletteLabel: '800' },
    { position: 100, paletteLabel: '950' },
  ]);
  let gradientSize = $derived($editorState.palettes[label]?.gradientSize ?? 'page');
  let editingKey = $derived(editing.kind === 'idle' ? null : editing.kind === 'editingBase' ? BASE_KEY : editing.stepKey);
  let editingDraft = $derived(editing.kind === 'editingStep' ? editing.draft : null);
  let grayComputed = $derived((() => {
    const _gl = grayLightnessCurve, _gs = graySaturationCurve, _co = curveOffset, _tc = tintChroma, _th = tintHue;
    return graySteps.map((step, index) => ({
      step,
      index,
      key: grayStepKey(step.label),
      hex: computeGrayColor(index, _th, _tc),
    }));
  })());
  let grayEffective = $derived((() => {
    const _ed = editingDraft, _ek = editingKey, _ov = overrides;
    return grayComputed.map(g => ({
      ...g,
      effective: (_ek === g.key && _ed !== null) ? _ed : (g.key in _ov) ? _ov[g.key] : g.hex,
    }));
  })());
  // Always use the computed (curve-derived) value so derived scales update in
  // realtime when tint changes.
  let gray500Hex = $derived(mode === 'gray'
    ? (grayComputed.find(g => g.step.label === '500')?.hex ?? GRAY_FALLBACK)
    : baseColor);
  // Keep the locked lightness anchor y in sync with baseColor. Idempotent.
  // `lightnessCurve` is read via `untrack` so writing it back via `edit` does
  // not retrigger this effect (Svelte 5 flags the read+write pattern as
  // recursive).
  $effect(() => {
    if (!anchorToBase || lockedLightnessIdx === null || !baseColor) return;
    const targetY = hexToOklch(baseColor).l * 100;
    untrack(() => {
      const idx = lockedLightnessIdx;
      if (idx === null) return;
      const curve = lightnessCurve;
      if (curve[idx] && Math.abs(curve[idx].y - targetY) > 0.01) {
        edit('lightnessCurve', curve.map((a, i) => i === idx ? { ...a, y: targetY } : a));
      }
    });
  });
  let paletteComputed = $derived((() => {
    const _bc = baseColor, _lc = lightnessCurve, _sc = saturationCurve, _co = curveOffset, _ed = editingDraft, _ek = editingKey, _ov = overrides, _ab = anchorToBase;
    return paletteStepLightness.map((ps, index) => {
      const k = paletteStepKey(ps.label);
      const hex = computePaletteColor(index, baseColor);
      const effective = (_ek === k && _ed !== null) ? _ed : (k in _ov) ? _ov[k] : hex;
      return {
        label: ps.label,
        lightness: ps.lightness,
        index,
        key: k,
        hex,
        effective,
      };
    });
  })());
  let gradientBarPreview = $derived.by(() => {
    const pc = paletteComputed;
    const sorted = [...gradientStops].sort((a, b) => gradientReverse ? b.position - a.position : a.position - b.position);
    const stops = sorted.map(s => `${stopColor(s, pc)} ${s.position}%`).join(', ');
    return `linear-gradient(to right, ${stops})`;
  });
  let grayScales = $derived(mode === 'gray' ? scales : []);
  let curveVersion = $derived(JSON.stringify(scaleCurves) + JSON.stringify(curveOffset) + gray500Hex);
  // Chromatic vs gray distinction is only for the `derivedHex` ("Ag" preview /
  // border-color base); `effectiveColor` always uses `gray500Hex` for non-override derivation.
  let derivedHexForBase = $derived((step: Step, scaleTitle: string) => computeDerivedColor(step, baseColor, scaleTitle));
  let derivedHexForGray = $derived((step: Step, scaleTitle: string) => computeDerivedColor(step, gray500Hex, scaleTitle));
  let effectiveHexAny = $derived((k: string, step: Step, scaleTitle: string) => effectiveColor(k, step, scaleTitle, curveVersion));

  let isEditingBase = $derived(isBaseEdit(editing));
  let editingColor = $derived(isEditingBase
    ? (mode === 'gray' ? gray500Hex : baseColor)
    : editingDraft);
  let editingStepInfo = $derived((() => {
    if (!editingKey || isEditingBase) return null;
    if (mode === 'gray') {
      const gs = graySteps.find(s => grayStepKey(s.label) === editingKey);
      if (gs) return { scale: 'Gray', step: gs.label };
    }
    const ps = paletteStepLightness.find(p => paletteStepKey(p.label) === editingKey);
    if (ps) return { scale: 'Palette', step: ps.label };
    for (const scale of scales) {
      for (const step of scale.steps) {
        if (stepKey(scale.title, step.name) === editingKey) {
          return { scale: scale.title, step: step.name };
        }
      }
    }
    return null;
  })());
  let panelOpen = $derived(editingKey !== null && (isEditingBase || (editingDraft !== null && editingStepInfo !== null)));
  let editPanelTitle = $derived(isEditingBase
    ? 'Base Color'
    : editingStepInfo
      ? `${editingStepInfo.scale} \u203A ${editingStepInfo.step}`
      : null);
  $effect(() => {
    // Touch each input so the effect tracks them (resnapScales reads indirectly).
    void baseColor;
    void scaleCurves;
    void lightnessCurve;
    void saturationCurve;
    void curveOffset;
    void snappedScales;
    resnapScales();
  });
</script>

<div class="palette-editor" style="--editor-base: {mode === 'gray' ? gray500Hex : baseColor}">
  <PaletteBase
    {label}
    {displayLabel}
    {mode}
    {baseColor}
    {gray500Hex}
    {tintHue}
    {tintChroma}
    {anchorToBase}
    {isEditingBase}
    {panelOpen}
    {editingColor}
    {editPanelTitle}
    {copiedKey}
    onStartEdit={startBaseEdit}
    onConfirm={confirmEdit}
    onCancel={cancelEdit}
    onColorChange={handleColorChange}
    onTintChange={(h, c) => patchPalette({ tintHue: h, tintChroma: c }, 'tint hue/chroma')}
    onAnchorToBaseChange={setAnchorToBase}
    onCopyBaseHex={copyHex}
  />

  {#if mode === 'chromatic'}
  <!-- Palette + Text row -->
  <div class="scales-row">
    <div class="scale-section">
      <div class="scale-header">
        <h4 class="scale-title">Palette</h4>
        {#if emptySelector}
          <label class="empty-mode-toggle">
            <input
              type="checkbox"
              checked={emptyMode === 'gradient'}
              onchange={onEmptyModeChange}
            />
            <span>Gradient</span>
          </label>
        {/if}
        <UIPillButton size="compact" variant="outline" onclick={clearPaletteOverrides}>Clear Overrides</UIPillButton>
        <UIPillButton size="compact" variant="outline" onclick={() => paletteEditorOpen = !paletteEditorOpen}>
          {paletteEditorOpen ? 'Close' : 'Edit'}
        </UIPillButton>
      </div>
      <div class="swatch-grid" style="--swatch-cols: {paletteStepLightness.length + 2}">
        <div class="step-column">
          <button class="step-label copyable-label" class:copied={copiedLabelKey === 'palette-white'} type="button" onclick={(e) => copyVarName('palette-white', `--color-${cssNamespace}-white`, e)}>
            {copiedLabelKey === 'palette-white' ? 'copied!' : 'white'}
          </button>
          <div class="swatch gray-swatch bookend" style="background: #ffffff"></div>
        </div>
        {#each paletteComputed as ps}
          <div class="step-column">
            <button class="step-label copyable-label" class:copied={copiedLabelKey === ps.key} type="button" onclick={(e) => copyVarName(ps.key, `--color-${cssNamespace}-${ps.label}`, e)}>
              {copiedLabelKey === ps.key ? 'copied!' : ps.label}
            </button>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
              class="swatch gray-swatch"
              class:active={editingKey === ps.key}
              class:overridden={ps.key in overrides}
              style="background: {ps.effective}"
              onclick={() => handlePaletteClick({ label: ps.label, lightness: ps.lightness, index: ps.index })}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && handlePaletteClick({ label: ps.label, lightness: ps.lightness, index: ps.index })}
            >
              {#if ps.key in overrides}
                <span class="override-dot" title="Palette override"></span>
              {/if}
              {#if emptySelector && emptyMode === 'solid'}
                <input
                  type="checkbox"
                  class="empty-check"
                  checked={emptyStep === ps.label}
                  onclick={stopPropagation(() => edit('emptyStep', ps.label))}
                  onkeydown={stopPropagation(bubble('keydown'))}
                  title="Page background"
                />
              {/if}
            </div>
            <button
              class="step-hex"
              class:copied={copiedKey === ps.key}
              type="button"
              onclick={(e) => copyHex(ps.key, ps.effective, e)}
            >{copiedKey === ps.key ? 'copied!' : ps.effective}</button>
          </div>
        {/each}
        <div class="step-column">
          <button class="step-label copyable-label" class:copied={copiedLabelKey === 'palette-black'} type="button" onclick={(e) => copyVarName('palette-black', `--color-${cssNamespace}-black`, e)}>
            {copiedLabelKey === 'palette-black' ? 'copied!' : 'black'}
          </button>
          <div class="swatch gray-swatch bookend" style="background: #000000"></div>
        </div>
      {#if paletteEditorOpen}
        <div class="curve-grid-span" style="grid-column: 2 / {paletteStepLightness.length + 2}">
          <ScaleCurveEditor
            curveKey="lightness"
            anchors={lightnessCurve}
            cfg={lightnessCurveConfig}
            stepCount={paletteStepLightness.length}
            defaults={DEFAULT_PALETTE_LIGHTNESS()}
            offset={curveOffset['lightness'] ?? 0}
            lockedAnchorIndex={lockedLightnessIdx}
            onAnchorsChange={setLightnessCurve}
            onOffsetChange={handleOffset}
          />
          <ScaleCurveEditor
            curveKey="saturation"
            anchors={saturationCurve}
            cfg={saturationCurveConfig}
            stepCount={paletteStepLightness.length}
            defaults={DEFAULT_PALETTE_SATURATION()}
            offset={curveOffset['saturation'] ?? 0}
            lockedAnchorIndex={lockedSaturationIdx}
            onAnchorsChange={setSaturationCurve}
            onOffsetChange={handleOffset}
          />
        </div>
      {/if}
      </div>

      {#if emptySelector && emptyMode === 'gradient'}
        <GradientStopEditor
          {gradientStyle}
          {gradientAngle}
          {gradientSize}
          {gradientReverse}
          {gradientStops}
          {gradientBarPreview}
          {paletteComputed}
          onSetGradientStyle={(v) => edit('gradientStyle', v)}
          onSetGradientSize={(v) => edit('gradientSize', v)}
          onSetGradientAngle={(v) => edit('gradientAngle', v)}
          onSetGradientReverse={(v) => edit('gradientReverse', v)}
          onSetGradientStops={(v) => edit('gradientStops', v)}
        />
      {/if}
    </div>

  </div>

  {:else}
  <!-- Gray mode: palette + text row -->
  <div class="scales-row">
  <div class="scale-section">
    <div class="scale-header">
      <h4 class="scale-title">{displayLabel ?? label}</h4>
      <UIPillButton size="compact" variant="outline" onclick={clearPaletteOverrides}>Clear Overrides</UIPillButton>
      <UIPillButton size="compact" variant="outline" onclick={() => grayEditorOpen = !grayEditorOpen}>
        {grayEditorOpen ? 'Close' : 'Edit'}
      </UIPillButton>
    </div>
    <div class="swatch-grid" style="--swatch-cols: {graySteps.length + 2}">
      <div class="step-column">
        <button class="step-label copyable-label" class:copied={copiedLabelKey === 'gray-white'} type="button" onclick={(e) => copyVarName('gray-white', `--color-${cssNamespace}-white`, e)}>
          {copiedLabelKey === 'gray-white' ? 'copied!' : 'white'}
        </button>
        <div class="swatch gray-swatch bookend" style="background: #ffffff"></div>
      </div>
      {#each grayEffective as g}
        <div class="step-column">
          <button class="step-label copyable-label" class:copied={copiedLabelKey === g.key} type="button" onclick={(e) => copyVarName(g.key, `--color-${cssNamespace}-${g.step.label}`, e)}>
            {copiedLabelKey === g.key ? 'copied!' : g.step.label}
          </button>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div
            class="swatch gray-swatch"
            class:active={editingKey === g.key}
            class:overridden={g.key in overrides}
            style="background: {g.effective}"
            onclick={() => handleGrayClick(g.step, g.index)}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && handleGrayClick(g.step, g.index)}
          >
            {#if g.key in overrides}
              <span class="override-dot" title="Palette override"></span>
            {/if}
          </div>
          <button
            class="step-hex"
            class:copied={copiedKey === g.key}
            type="button"
            onclick={(e) => copyHex(g.key, g.effective, e)}
          >{copiedKey === g.key ? 'copied!' : g.effective}</button>
        </div>
      {/each}
      <div class="step-column">
        <button class="step-label copyable-label" class:copied={copiedLabelKey === 'gray-black'} type="button" onclick={(e) => copyVarName('gray-black', `--color-${cssNamespace}-black`, e)}>
          {copiedLabelKey === 'gray-black' ? 'copied!' : 'black'}
        </button>
        <div class="swatch gray-swatch bookend" style="background: #000000"></div>
      </div>
    {#if grayEditorOpen}
      <div class="curve-grid-span" style="grid-column: 2 / {graySteps.length + 2}">
        <ScaleCurveEditor
          curveKey="gray-lightness"
          anchors={grayLightnessCurve}
          cfg={lightnessCurveConfig}
          stepCount={graySteps.length}
          defaults={DEFAULT_GRAY_LIGHTNESS()}
          offset={curveOffset['gray-lightness'] ?? 0}
          onAnchorsChange={setGrayLightnessCurve}
          onOffsetChange={handleOffset}
        />
        <ScaleCurveEditor
          curveKey="gray-saturation"
          anchors={graySaturationCurve}
          cfg={saturationCurveConfig}
          stepCount={graySteps.length}
          defaults={DEFAULT_GRAY_SATURATION()}
          offset={curveOffset['gray-saturation'] ?? 0}
          onAnchorsChange={setGraySaturationCurve}
          onOffsetChange={handleOffset}
        />
      </div>
    {/if}
    </div>
  </div>
  </div>
  {/if}

  {#snippet overridesPanel(scale: Scale, canSnap: boolean, derivedHexFor: (step: Step, scaleTitle: string) => string)}
    <OverridesPanel
      {scale}
      editorOpen={scaleEditorOpen[scale.title] ?? false}
      snapped={canSnap && snappedScales.has(scale.title)}
      supportsSnap={canSnap}
      {cssNamespace}
      {scaleCurves}
      {curveOffset}
      {defaultScaleCurves}
      {overrides}
      {editingKey}
      {snapPickerKey}
      {copiedKey}
      {copiedLabelKey}
      {paletteComputed}
      {derivedHexFor}
      effectiveHexFor={effectiveHexAny}
      stepKeyFor={stepKey}
      scaleCurveKeyFor={getScaleCurveKey}
      onToggleSnap={toggleSnapAll}
      onClearScaleOverrides={clearScaleOverrides}
      onToggleEditor={toggleScaleEditor}
      onResetOverride={resetOverride}
      onOverrideClick={handleOverrideClick}
      onSnappedClick={handleSnappedClick}
      onSelectSnapValue={selectSnapValue}
      onCopyHex={copyHex}
      onCopyVarName={copyVarName}
      onSetScaleCurve={setScaleCurve}
      onOffsetChange={handleOffset}
    />
  {/snippet}

  <button class="derived-toggle" type="button" onclick={() => showDerived = !showDerived}>
    <i class="fas" class:fa-chevron-right={!showDerived} class:fa-chevron-down={showDerived}></i>
    <span>Text, Surfaces &amp; Borders</span>
  </button>

  {#if showDerived}
    {@const activeScales = mode === 'gray' ? grayScales : scales}
    {@const derivedHexFor = mode === 'gray' ? derivedHexForGray : derivedHexForBase}
    <div class="scales-row">
      {#each activeScales.filter(s => s.isText) as scale}
        {@render overridesPanel(scale, true, derivedHexFor)}
      {/each}
    </div>
    <div class="scales-row">
      {#each activeScales.filter(s => !s.isText) as scale}
        {@render overridesPanel(scale, mode !== 'gray', derivedHexFor)}
      {/each}
    </div>
  {/if}

  <!-- Color Edit Panel (non-base edits) -->
  {#if !isEditingBase && panelOpen && editingColor}
    <ColorEditPanel
      color={editingColor}
      title={editPanelTitle}
      showRemoveOverride={!!editingKey}
      mode={'hsl'}
      hue={tintHue}
      chroma={tintChroma}
      onHueChromaChange={(h, c) => patchPalette({ tintHue: h, tintChroma: c }, 'tint hue/chroma')}
      onColorChange={handleColorChange}
      onConfirm={confirmEdit}
      onCancel={cancelEdit}
      onRemoveOverride={() => editingKey && removeOverride(editingKey)}
      onSliderStart={() => beginSliderGesture(`edit ${label} ${editingKey ?? 'color'}`)}
    />
  {/if}
</div>

<style>
  .palette-editor {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-20);
    padding: var(--ui-space-16) var(--ui-space-16) var(--ui-space-24);
    background: none;
    border: none;
    border-bottom: 1px solid var(--ui-border-low);
    font-family: var(--ui-font-sans);
    min-width: 0;
  }

  .palette-editor:last-child {
    border-bottom: none;
  }

  /* Scale header with edit button */

  .scale-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding-bottom: 0.5rem;
  }

  .derived-toggle {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-4);
    background: none;
    border: none;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-light);
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .derived-toggle:hover {
    color: var(--ui-text-primary);
  }

  .derived-toggle i {
    font-size: var(--ui-font-size-xs);
    width: 0.75rem;
    text-align: center;
  }

  /* Scale layout */

  .scales-row {
    display: flex;
    gap: 3rem;
    flex-wrap: wrap;
    min-width: 0;
  }

  .scale-section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    min-width: 0;
    max-width: 100%;
  }

  .scale-title {
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-bold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-right: 1rem;
  }

  /* Step columns */

  .step-column {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-self: stretch;
    gap: var(--ui-space-2);
    width: auto;
    min-width: 0;
    overflow: visible;
  }

  .step-label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    text-align: center;
    line-height: 1;
    height: var(--ui-font-size-xs);
    display: flex;
    align-items: flex-end;
  }

  .step-label.copyable-label {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
    font-size: var(--ui-font-size-sm);
    justify-content: center;
    transition: color var(--ui-transition-fast);
  }

  .step-label.copyable-label:hover {
    color: var(--ui-text-primary);
  }

  .step-label.copyable-label.copied {
    color: var(--ui-text-accent, var(--ui-text-primary));
  }

  /* Swatches */

  .swatch {
    width: 100%;
    height: 2rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
  }

  /* Step hex values */

  .step-hex {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    padding: 1px var(--ui-space-2);
    border-radius: var(--ui-radius-sm);
    white-space: nowrap;
    background: none;
    border: none;
    text-align: center;
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
    margin-top: var(--ui-space-2);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .step-hex:hover {
    background: var(--ui-surface-highest);
    color: var(--ui-text-primary);
  }

  .step-hex.copied {
    color: var(--ui-text-accent);
  }

  /* Swatch grid */

  .swatch-grid {
    display: grid;
    grid-template-columns: repeat(var(--swatch-cols), minmax(0, 1fr));
    gap: var(--ui-space-4) var(--swatch-gap, var(--ui-space-4));
    align-items: start;
    justify-content: start;
    min-width: 0;
    max-width: calc(var(--swatch-cols) * 4rem + (var(--swatch-cols) - 1) * var(--swatch-gap, var(--ui-space-4)));
  }

  .curve-grid-span {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .swatch.gray-swatch {
    width: 100%;
    height: calc(4rem + var(--ui-space-2));
    cursor: pointer;
    position: relative;
  }

  .swatch.gray-swatch:hover {
    border-color: var(--ui-border-high);
  }

  .swatch.gray-swatch.active {
    border-color: var(--ui-border-higher);
    outline: 2px solid var(--ui-border-high);
    outline-offset: 1px;
  }

  .override-dot {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ui-text-primary);
    border: 1px solid rgba(255, 255, 255, 0.6);
  }

  .empty-mode-toggle {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
  }

  .empty-mode-toggle input {
    margin: 0;
    cursor: pointer;
  }

  .empty-check {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    bottom: 3px;
    right: 3px;
    margin: 0;
    cursor: pointer;
    width: 14px;
    height: 14px;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.3);
    border-radius: 2px;
    opacity: 0.5;
  }

  .empty-check:checked {
    opacity: 1;
  }

  .empty-check:checked::after {
    content: '\2713';
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: var(--ui-font-size-md);
    font-weight: bold;
    color: black;
    line-height: 1;
  }

  /* Narrow desktop: tighten palette editor spacing */
  @media (max-width: 1280px) {
    .palette-editor {
      padding: var(--ui-space-12) var(--ui-space-12) var(--ui-space-20);
    }
    .scales-row {
      gap: var(--ui-space-24);
    }
  }

  @media (max-width: 1024px) {
    .scales-row {
      gap: var(--ui-space-16);
    }
  }
</style>
