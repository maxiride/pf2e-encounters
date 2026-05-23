<script lang="ts">
  /**
   * Shadows section lifted from VariablesTab.
   *
   * Owns: the global light controls (angle dial + min/max ranges with
   * locked single-value mode), the per-token override state (each scale
   * shadow remembers which fields the user has manually pinned), the dial
   * drag scopes, and the bg-picker menu used to preview shadows on
   * different surface tones.
   *
   * Mutations flow through mutate()/beginScope()/commitScope() so undo
   * captures coherent edits. The store's subscriber fans values to :root
   * via cssVarSync.
   */
  import { onMount } from 'svelte';
  import {
    editorState, mutate, beginScope, commitScope, beginSliderGesture,
    seedShadowsFromDom, shadowTokenCss, computeShadowXY,
    SCALE_SHADOW_VARIABLES, defaultShadowOverride,
    type Scope,
  } from '../../core/store/editorStore';
  import type { ShadowToken, ShadowOverrideFlags, EditorState } from '../../core/store/editorTypes';

  interface Props {
    copiedVar?: string | null;
    oncopy?: (variable: string) => void;
  }

  let { copiedVar = null, oncopy }: Props = $props();

  function copy(v: string) { oncopy?.(v); }

  function getShadowOverride(s: EditorState, variable: string): ShadowOverrideFlags {
    let ov = s.shadows.overrides[variable];
    if (!ov) {
      ov = defaultShadowOverride();
      s.shadows.overrides[variable] = ov;
    }
    return ov;
  }

  function shadowTokenValueLabel(t: ShadowToken): string {
    return `${t.x} ${t.y} ${t.blur}px`;
  }

  function interpolateScale<T extends ShadowToken>(
    tokens: T[],
    overrides: Record<string, ShadowOverrideFlags>,
    flag: keyof ShadowOverrideFlags,
    mutateFn: (t: T, frac: number) => void,
  ) {
    const eligible = tokens.filter((t) => SCALE_SHADOW_VARIABLES.has(t.variable) && !(overrides[t.variable]?.[flag]));
    const last = eligible.length - 1;
    eligible.forEach((t, i) => mutateFn(t, last > 0 ? i / last : 0.5));
  }

  function setGlobalAngle(value: number) {
    mutate('set shadow angle', (s) => {
      s.shadows.globals.angle = ((Math.round(value) % 360) + 360) % 360;
      for (const t of s.shadows.tokens) {
        if (!SCALE_SHADOW_VARIABLES.has(t.variable)) continue;
        if (getShadowOverride(s, t.variable).angle) continue;
        t.angle = s.shadows.globals.angle;
        const { x, y } = computeShadowXY(t.angle, t.distance);
        t.x = x; t.y = y;
      }
    });
  }

  function setGlobalOpacity(field: 'opacityMin' | 'opacityMax', value01: number) {
    mutate(`set shadow ${field}`, (s) => {
      const v = Math.max(0, Math.min(1, Math.round(value01 * 100) / 100));
      const g = s.shadows.globals;
      g[field] = v;
      if (g.opacityLocked) g[field === 'opacityMin' ? 'opacityMax' : 'opacityMin'] = v;
      interpolateScale(s.shadows.tokens, s.shadows.overrides, 'opacity', (t, frac) => {
        t.opacity = Math.round((g.opacityMin + frac * (g.opacityMax - g.opacityMin)) * 100) / 100;
      });
    });
  }

  function setGlobalDistance(field: 'distanceMin' | 'distanceMax', value: number) {
    mutate(`set shadow ${field}`, (s) => {
      const g = s.shadows.globals;
      g[field] = Math.max(0, Math.round(value));
      interpolateScale(s.shadows.tokens, s.shadows.overrides, 'distance', (t, frac) => {
        t.distance = Math.round(g.distanceMin + frac * (g.distanceMax - g.distanceMin));
        const { x, y } = computeShadowXY(t.angle, t.distance);
        t.x = x; t.y = y;
      });
    });
  }

  function setGlobalBlur(field: 'blurMin' | 'blurMax', value: number) {
    mutate(`set shadow ${field}`, (s) => {
      const g = s.shadows.globals;
      g[field] = Math.max(0, Math.round(value));
      if (g.blurLocked) g[field === 'blurMin' ? 'blurMax' : 'blurMin'] = g[field];
      interpolateScale(s.shadows.tokens, s.shadows.overrides, 'blur', (t, frac) => {
        t.blur = Math.round(g.blurMin + frac * (g.blurMax - g.blurMin));
      });
    });
  }

  function setGlobalSize(field: 'sizeMin' | 'sizeMax', value: number) {
    mutate(`set shadow ${field}`, (s) => {
      const g = s.shadows.globals;
      g[field] = Math.max(-50, Math.min(50, Math.round(value)));
      if (g.sizeLocked) g[field === 'sizeMin' ? 'sizeMax' : 'sizeMin'] = g[field];
      interpolateScale(s.shadows.tokens, s.shadows.overrides, 'size', (t, frac) => {
        t.spread = Math.round(g.sizeMin + frac * (g.sizeMax - g.sizeMin));
      });
    });
  }

  function setGlobalColor(field: 'hue' | 'saturation' | 'lightness', value: number) {
    mutate(`set shadow ${field}`, (s) => {
      const g = s.shadows.globals;
      const hi = field === 'hue' ? 360 : 100;
      g[field] = Math.max(0, Math.min(hi, Math.round(value)));
      for (const t of s.shadows.tokens) {
        if (!SCALE_SHADOW_VARIABLES.has(t.variable)) continue;
        if (getShadowOverride(s, t.variable).color) continue;
        t.hue = g.hue; t.saturation = g.saturation; t.lightness = g.lightness;
      }
    });
  }

  function toggleLock(field: 'opacityLocked' | 'blurLocked' | 'sizeLocked') {
    mutate(`toggle shadow ${field}`, (s) => {
      const g = s.shadows.globals;
      const next = !g[field];
      g[field] = next;
      if (next) {
        // Clamp max to min when re-locking and re-broadcast the scale edit.
        if (field === 'opacityLocked') {
          g.opacityMax = g.opacityMin;
          interpolateScale(s.shadows.tokens, s.shadows.overrides, 'opacity', (t, frac) => {
            t.opacity = Math.round((g.opacityMin + frac * (g.opacityMax - g.opacityMin)) * 100) / 100;
          });
        } else if (field === 'blurLocked') {
          g.blurMax = g.blurMin;
          interpolateScale(s.shadows.tokens, s.shadows.overrides, 'blur', (t, frac) => {
            t.blur = Math.round(g.blurMin + frac * (g.blurMax - g.blurMin));
          });
        } else {
          g.sizeMax = g.sizeMin;
          interpolateScale(s.shadows.tokens, s.shadows.overrides, 'size', (t, frac) => {
            t.spread = Math.round(g.sizeMin + frac * (g.sizeMax - g.sizeMin));
          });
        }
      }
    });
  }

  /** Locate token at `idx` and run `mut` inside a single `mutate(...)` action.
   *  Token-field handlers below collapse to one or two lines via this helper —
   *  per-field clamp/round semantics stay distinct, but the mutate/find/early-
   *  return prelude doesn't repeat. */
  function withShadowToken(label: string, idx: number, mut: (t: ShadowToken, s: EditorState) => void) {
    mutate(`set shadow token ${label}`, (s) => {
      const t = s.shadows.tokens[idx];
      if (!t) return;
      mut(t, s);
    });
  }

  // Per-token edits set the override flag for the edited field so future
  // global broadcasts skip this token, preserving the user's manual value.
  function setTokenField(idx: number, field: 'angle' | 'distance' | 'spread' | 'blur' | 'opacity', value: number) {
    withShadowToken(field, idx, (t, s) => {
      const ov = getShadowOverride(s, t.variable);
      if (field === 'angle') {
        t.angle = ((Math.round(value) % 360) + 360) % 360;
        const { x, y } = computeShadowXY(t.angle, t.distance);
        t.x = x; t.y = y;
        ov.angle = true;
      } else if (field === 'distance') {
        t.distance = Math.max(0, Math.round(value));
        const { x, y } = computeShadowXY(t.angle, t.distance);
        t.x = x; t.y = y;
        ov.distance = true;
      } else if (field === 'spread') {
        t.spread = Math.max(-50, Math.min(50, Math.round(value)));
        ov.size = true;
      } else if (field === 'blur') {
        t.blur = Math.max(0, Math.round(value));
        ov.blur = true;
      } else {
        t.opacity = Math.max(0, Math.min(1, Math.round(value * 100) / 100));
        ov.opacity = true;
      }
    });
  }

  function setTokenColor(idx: number, field: 'hue' | 'saturation' | 'lightness', value: number) {
    withShadowToken(field, idx, (t, s) => {
      const hi = field === 'hue' ? 360 : 100;
      t[field] = Math.max(0, Math.min(hi, Math.round(value)));
      getShadowOverride(s, t.variable).color = true;
    });
  }

  function resetToGlobal() {
    if (!editingToken || !editingIsScale) return;
    const variable = editingToken.variable;
    mutate('reset shadow token to global', (s) => {
      const scale = s.shadows.tokens.filter((t) => SCALE_SHADOW_VARIABLES.has(t.variable));
      const t = scale.find((x) => x.variable === variable);
      if (!t) return;
      const pos = scale.indexOf(t);
      const last = scale.length - 1;
      const frac = last > 0 ? pos / last : 0.5;
      const g = s.shadows.globals;
      t.hue = g.hue; t.saturation = g.saturation; t.lightness = g.lightness;
      t.angle = g.angle;
      t.distance = Math.round(g.distanceMin + frac * (g.distanceMax - g.distanceMin));
      t.blur = Math.round(g.blurMin + frac * (g.blurMax - g.blurMin));
      t.spread = Math.round(g.sizeMin + frac * (g.sizeMax - g.sizeMin));
      t.opacity = Math.round((g.opacityMin + frac * (g.opacityMax - g.opacityMin)) * 100) / 100;
      const { x, y } = computeShadowXY(t.angle, t.distance);
      t.x = x; t.y = y;
      s.shadows.overrides[variable] = defaultShadowOverride();
    });
  }

  // HSL gradient helpers (read from globals for their background-color cues).
  let sg = $derived($editorState.shadows.globals);
  let shadowHueGrad = $derived(`linear-gradient(to right, ${
    [0, 60, 120, 180, 240, 300, 360].map(h => `hsl(${h},${sg.saturation}%,${sg.lightness}%)`).join(',')
  })`);
  let shadowSatGrad = $derived(`linear-gradient(to right, hsl(${sg.hue},0%,${sg.lightness}%), hsl(${sg.hue},100%,${sg.lightness}%))`);
  let shadowLightGrad = $derived(`linear-gradient(to right, hsl(${sg.hue},${sg.saturation}%,0%), hsl(${sg.hue},${sg.saturation}%,50%), hsl(${sg.hue},${sg.saturation}%,100%))`);

  let editingShadow: string | null = $state(null);

  let shadowTokens = $derived($editorState.shadows.tokens);
  let editingToken = $derived(editingShadow ? shadowTokens.find(t => t.variable === editingShadow) ?? null : null);
  let editingIdx = $derived(editingToken ? shadowTokens.indexOf(editingToken) : -1);
  let editingIsScale = $derived(editingToken ? SCALE_SHADOW_VARIABLES.has(editingToken.variable) : false);

  function angleFromPointer(event: PointerEvent, dialEl: SVGSVGElement): number {
    const rect = dialEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return Math.round(angle);
  }

  // Dial drag: open a scope, stream angle edits into it, commit on pointerup
  // (observed on window so an off-dial release still commits).
  let dialDragIdx: number | null = null;
  let dialDragScope: Scope | null = null;
  function handleDialDown(event: PointerEvent, idx: number) {
    dialDragIdx = idx;
    const svg = event.currentTarget as SVGSVGElement;
    svg.setPointerCapture(event.pointerId);
    dialDragScope = beginScope({ label: 'drag shadow angle', collapseToOne: true, clipUndoFloor: false });
    setTokenField(idx, 'angle', angleFromPointer(event, svg));
  }
  function handleDialMove(event: PointerEvent, idx: number) {
    if (dialDragIdx !== idx) return;
    const svg = event.currentTarget as SVGSVGElement;
    setTokenField(idx, 'angle', angleFromPointer(event, svg));
  }
  function handleDialUp() {
    if (dialDragIdx === null) return;
    dialDragIdx = null;
    if (dialDragScope) { commitScope(dialDragScope); dialDragScope = null; }
  }

  let globalDialDrag = false;
  let globalDialScope: Scope | null = null;
  function handleGlobalDialDown(event: PointerEvent) {
    globalDialDrag = true;
    const svg = event.currentTarget as SVGSVGElement;
    svg.setPointerCapture(event.pointerId);
    globalDialScope = beginScope({ label: 'drag global shadow angle', collapseToOne: true, clipUndoFloor: false });
    setGlobalAngle(angleFromPointer(event, svg));
  }
  function handleGlobalDialMove(event: PointerEvent) {
    if (!globalDialDrag) return;
    const svg = event.currentTarget as SVGSVGElement;
    setGlobalAngle(angleFromPointer(event, svg));
  }
  function handleGlobalDialUp() {
    if (!globalDialDrag) return;
    globalDialDrag = false;
    if (globalDialScope) { commitScope(globalDialScope); globalDialScope = null; }
  }

  // Background picker for the shadows preview canvas.
  interface ColorGroup {
    label: string;
    colors: { label: string; value: string }[];
  }

  const bgColorGroups: ColorGroup[] = [
    {
      label: 'Surfaces',
      colors: [
        { label: 'Neutral Lowest', value: 'var(--surface-neutral-lowest)' },
        { label: 'Neutral Lower', value: 'var(--surface-neutral-lower)' },
        { label: 'Neutral Low', value: 'var(--surface-neutral-low)' },
        { label: 'Neutral', value: 'var(--surface-neutral)' },
        { label: 'Neutral High', value: 'var(--surface-neutral-high)' },
        { label: 'Neutral Higher', value: 'var(--surface-neutral-higher)' },
        { label: 'Neutral Highest', value: 'var(--surface-neutral-highest)' },
      ]
    },
    {
      label: 'Alternate',
      colors: [
        { label: 'Lowest', value: 'var(--surface-alternate-lowest)' },
        { label: 'Lower', value: 'var(--surface-alternate-lower)' },
        { label: 'Low', value: 'var(--surface-alternate-low)' },
        { label: 'Base', value: 'var(--surface-alternate)' },
        { label: 'High', value: 'var(--surface-alternate-high)' },
        { label: 'Higher', value: 'var(--surface-alternate-higher)' },
        { label: 'Highest', value: 'var(--surface-alternate-highest)' },
      ]
    },
    {
      label: 'Background',
      colors: [
        { label: 'Lowest', value: 'var(--surface-canvas-lowest)' },
        { label: 'Lower', value: 'var(--surface-canvas-lower)' },
        { label: 'Low', value: 'var(--surface-canvas-low)' },
        { label: 'Base', value: 'var(--surface-canvas)' },
        { label: 'High', value: 'var(--surface-canvas-high)' },
        { label: 'Higher', value: 'var(--surface-canvas-higher)' },
        { label: 'Highest', value: 'var(--surface-canvas-highest)' },
      ]
    },
    {
      label: 'Brand',
      colors: [
        { label: 'Lowest', value: 'var(--surface-brand-lowest)' },
        { label: 'Lower', value: 'var(--surface-brand-lower)' },
        { label: 'Low', value: 'var(--surface-brand-low)' },
        { label: 'Base', value: 'var(--surface-brand)' },
        { label: 'High', value: 'var(--surface-brand-high)' },
        { label: 'Higher', value: 'var(--surface-brand-higher)' },
        { label: 'Highest', value: 'var(--surface-brand-highest)' },
      ]
    },
    {
      label: 'Accent',
      colors: [
        { label: 'Lowest', value: 'var(--surface-accent-lowest)' },
        { label: 'Lower', value: 'var(--surface-accent-lower)' },
        { label: 'Low', value: 'var(--surface-accent-low)' },
        { label: 'Base', value: 'var(--surface-accent)' },
        { label: 'High', value: 'var(--surface-accent-high)' },
        { label: 'Higher', value: 'var(--surface-accent-higher)' },
        { label: 'Highest', value: 'var(--surface-accent-highest)' },
      ]
    },
    {
      label: 'Special',
      colors: [
        { label: 'Lowest', value: 'var(--surface-special-lowest)' },
        { label: 'Lower', value: 'var(--surface-special-lower)' },
        { label: 'Low', value: 'var(--surface-special-low)' },
        { label: 'Base', value: 'var(--surface-special)' },
        { label: 'High', value: 'var(--surface-special-high)' },
        { label: 'Higher', value: 'var(--surface-special-higher)' },
        { label: 'Highest', value: 'var(--surface-special-highest)' },
      ]
    },
    {
      label: 'Color Ramps',
      colors: [
        { label: 'Neutral 800', value: 'var(--color-neutral-800)' },
        { label: 'Neutral 700', value: 'var(--color-neutral-700)' },
        { label: 'Neutral 600', value: 'var(--color-neutral-600)' },
        { label: 'Neutral 500', value: 'var(--color-neutral-500)' },
        { label: 'Neutral 400', value: 'var(--color-neutral-400)' },
        { label: 'Neutral 300', value: 'var(--color-neutral-300)' },
        { label: 'Neutral 200', value: 'var(--color-neutral-200)' },
        { label: 'Neutral 100', value: 'var(--color-neutral-100)' },
        { label: 'White', value: '#ffffff' },
      ]
    },
  ];

  let shadowBg = $state('var(--ui-surface-highest)');
  let bgPickerOpen = $state(false);
  let expandedGroup: string | null = $state(null);

  function pickBg(value: string) {
    shadowBg = value;
    bgPickerOpen = false;
    expandedGroup = null;
  }

  function toggleBgPicker() {
    bgPickerOpen = !bgPickerOpen;
    if (!bgPickerOpen) expandedGroup = null;
  }

  // Seed the shadows store from tokens.css on first mount so the editor
  // starts from the runtime baseline.
  onMount(() => {
    seedShadowsFromDom();
  });
</script>

<section class="section shadows-section" id="shadows" style="background: {shadowBg};">
  <h2 class="section-title">Shadows</h2>

  <div class="shadows-layout">
  <div class="shadows-main">
  <div class="shadows-grid">
    {#each shadowTokens.filter(t => SCALE_SHADOW_VARIABLES.has(t.variable)) as token}
      <div class="shadow-item" class:active={editingShadow === token.variable}>
        <div class="shadow-box" style="box-shadow: {shadowTokenCss(token)};"></div>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{shadowTokenValueLabel(token)}</span>
        </div>
        <button class="shadow-edit-btn" onclick={() => editingShadow = editingShadow === token.variable ? null : token.variable}>
          {editingShadow === token.variable ? 'Close' : 'Edit'}
        </button>
      </div>
    {/each}
  </div>

  <div class="shadows-grid">
    {#each shadowTokens.filter(t => !SCALE_SHADOW_VARIABLES.has(t.variable)) as token}
      <div class="shadow-item" class:active={editingShadow === token.variable}>
        <div class="shadow-box" style="box-shadow: {shadowTokenCss(token)};"></div>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{shadowTokenValueLabel(token)}</span>
        </div>
        <button class="shadow-edit-btn" onclick={() => editingShadow = editingShadow === token.variable ? null : token.variable}>
          {editingShadow === token.variable ? 'Close' : 'Edit'}
        </button>
      </div>
    {/each}
  </div>

  </div><!-- /.shadows-main -->

  <!-- Shadow editor sidebar -->
  <div class="global-shadow-editor">
  {#if editingToken}
    <div class="editor-header">
      <h4 class="global-shadow-title">{editingToken.variable}</h4>
      <button class="shadow-edit-btn" onclick={() => editingShadow = null}>Close</button>
    </div>
    {#if editingIsScale}
      <button class="reset-btn" onclick={resetToGlobal}>Reset to Global</button>
    {/if}
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="Direction the light source is coming from — controls which side the shadow falls on">Angle</span>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <svg class="angle-dial" viewBox="0 0 48 48" width="48" height="48"
        onpointerdown={(e) => handleDialDown(e, editingIdx)}
        onpointermove={(e) => handleDialMove(e, editingIdx)}
        onpointerup={handleDialUp}
      >
        <circle cx="24" cy="24" r="20" class="dial-ring" />
        <line x1="24" y1="24"
          x2={24 + 18 * Math.cos(editingToken.angle * Math.PI / 180)}
          y2={24 - 18 * Math.sin(editingToken.angle * Math.PI / 180)}
          class="dial-line" />
        <circle
          cx={24 + 18 * Math.cos(editingToken.angle * Math.PI / 180)}
          cy={24 - 18 * Math.sin(editingToken.angle * Math.PI / 180)}
          r="3" class="dial-handle" />
      </svg>
      <input class="shadow-slider-input" type="number" min="0" max="360"
        value={editingToken.angle}
        onchange={(e) => setTokenField(editingIdx, 'angle', +e.currentTarget.value)} />
      <span class="shadow-slider-unit">&deg;</span>
    </div>
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="How far the shadow is cast from the element — simulates height off the surface">Dist</span>
      <input type="range" min="0" max="60" value={editingToken.distance}
        onpointerdown={() => beginSliderGesture('edit shadow distance')}
        oninput={(e) => setTokenField(editingIdx, 'distance', +e.currentTarget.value)} />
      <input class="shadow-slider-input" type="number" min="0" max="100"
        value={editingToken.distance}
        onchange={(e) => setTokenField(editingIdx, 'distance', +e.currentTarget.value)} />
      <span class="shadow-slider-unit">px</span>
    </div>
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread</span>
      <input type="range" min="-50" max="50" value={editingToken.spread}
        onpointerdown={() => beginSliderGesture('edit shadow spread')}
        oninput={(e) => setTokenField(editingIdx, 'spread', +e.currentTarget.value)} />
      <input class="shadow-slider-input" type="number" min="-50" max="50"
        value={editingToken.spread}
        onchange={(e) => setTokenField(editingIdx, 'spread', +e.currentTarget.value)} />
      <span class="shadow-slider-unit">px</span>
    </div>
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur</span>
      <input type="range" min="0" max="100" value={editingToken.blur}
        onpointerdown={() => beginSliderGesture('edit shadow blur')}
        oninput={(e) => setTokenField(editingIdx, 'blur', +e.currentTarget.value)} />
      <input class="shadow-slider-input" type="number" min="0" max="100"
        value={editingToken.blur}
        onchange={(e) => setTokenField(editingIdx, 'blur', +e.currentTarget.value)} />
      <span class="shadow-slider-unit">px</span>
    </div>
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op.</span>
      <input type="range" min="0" max="100" value={Math.round(editingToken.opacity * 100)}
        onpointerdown={() => beginSliderGesture('edit shadow opacity')}
        oninput={(e) => setTokenField(editingIdx, 'opacity', +e.currentTarget.value / 100)} />
      <input class="shadow-slider-input" type="number" min="0" max="100"
        value={Math.round(editingToken.opacity * 100)}
        onchange={(e) => setTokenField(editingIdx, 'opacity', +e.currentTarget.value / 100)} />
      <span class="shadow-slider-unit">%</span>
    </div>
    <div class="global-color-group">
      <div class="global-color-swatch" style="background: hsl({editingToken.hue}, {editingToken.saturation}%, {editingToken.lightness}%);"></div>
      <div class="global-color-sliders">
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Hue — the base color of the shadow (0°=red, 120°=green, 240°=blue)">H</span>
          <div class="slider-track" style="background: {shadowHueGrad}">
            <input type="range" min="0" max="360" value={editingToken.hue}
              onpointerdown={() => beginSliderGesture('edit shadow hue')}
              oninput={(e) => setTokenColor(editingIdx, 'hue', +e.currentTarget.value)} />
          </div>
          <input class="shadow-slider-input" type="number" min="0" max="360"
            value={editingToken.hue}
            onchange={(e) => setTokenColor(editingIdx, 'hue', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">&deg;</span>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Saturation — 0% is gray, 100% is full color intensity">S</span>
          <div class="slider-track" style="background: linear-gradient(to right, hsl({editingToken.hue},0%,{editingToken.lightness}%), hsl({editingToken.hue},100%,{editingToken.lightness}%))">
            <input type="range" min="0" max="100" value={editingToken.saturation}
              onpointerdown={() => beginSliderGesture('edit shadow saturation')}
              oninput={(e) => setTokenColor(editingIdx, 'saturation', +e.currentTarget.value)} />
          </div>
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={editingToken.saturation}
            onchange={(e) => setTokenColor(editingIdx, 'saturation', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">%</span>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Lightness — 0% is black, 100% is white">L</span>
          <div class="slider-track" style="background: linear-gradient(to right, hsl({editingToken.hue},{editingToken.saturation}%,0%), hsl({editingToken.hue},{editingToken.saturation}%,50%), hsl({editingToken.hue},{editingToken.saturation}%,100%))">
            <input type="range" min="0" max="100" value={editingToken.lightness}
              onpointerdown={() => beginSliderGesture('edit shadow lightness')}
              oninput={(e) => setTokenColor(editingIdx, 'lightness', +e.currentTarget.value)} />
          </div>
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={editingToken.lightness}
            onchange={(e) => setTokenColor(editingIdx, 'lightness', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">%</span>
        </div>
      </div>
    </div>
    <div class="shadow-css-output">
      <code>{shadowTokenCss(editingToken)}</code>
      <button class="shadow-copy-btn" onclick={() => copy(shadowTokenCss(editingToken))}>
        {copiedVar === shadowTokenCss(editingToken) ? 'Copied!' : 'Copy CSS'}
      </button>
    </div>
  {:else}
    <h4 class="global-shadow-title">Global Light</h4>
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="Direction the light source is coming from — controls which side the shadow falls on">Angle</span>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <svg class="angle-dial" viewBox="0 0 48 48" width="48" height="48"
        onpointerdown={handleGlobalDialDown}
        onpointermove={handleGlobalDialMove}
        onpointerup={handleGlobalDialUp}
      >
        <circle cx="24" cy="24" r="20" class="dial-ring" />
        <line x1="24" y1="24"
          x2={24 + 18 * Math.cos(sg.angle * Math.PI / 180)}
          y2={24 - 18 * Math.sin(sg.angle * Math.PI / 180)}
          class="dial-line" />
        <circle
          cx={24 + 18 * Math.cos(sg.angle * Math.PI / 180)}
          cy={24 - 18 * Math.sin(sg.angle * Math.PI / 180)}
          r="3" class="dial-handle" />
      </svg>
      <input class="shadow-slider-input" type="number" min="0" max="360"
        value={sg.angle}
        onchange={(e) => setGlobalAngle(+e.currentTarget.value)} />
      <span class="shadow-slider-unit">&deg;</span>
    </div>
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="How far the shadow is cast — simulates height off the surface">Dist Min</span>
      <input type="range" min="0" max="60" value={sg.distanceMin}
        onpointerdown={() => beginSliderGesture('drag global dist min')}
        oninput={(e) => setGlobalDistance('distanceMin', +e.currentTarget.value)} />
      <input class="shadow-slider-input" type="number" min="0" max="100"
        value={sg.distanceMin}
        onchange={(e) => setGlobalDistance('distanceMin', +e.currentTarget.value)} />
      <span class="shadow-slider-unit">px</span>
    </div>
    <div class="global-shadow-row">
      <span class="shadow-slider-label" title="How far the shadow is cast — simulates height off the surface">Dist Max</span>
      <input type="range" min="0" max="60" value={sg.distanceMax}
        onpointerdown={() => beginSliderGesture('drag global dist max')}
        oninput={(e) => setGlobalDistance('distanceMax', +e.currentTarget.value)} />
      <input class="shadow-slider-input" type="number" min="0" max="100"
        value={sg.distanceMax}
        onchange={(e) => setGlobalDistance('distanceMax', +e.currentTarget.value)} />
      <span class="shadow-slider-unit">px</span>
    </div>
    {#if sg.sizeLocked}
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread</span>
        <input type="range" min="-50" max="50" value={sg.sizeMin}
          onpointerdown={() => beginSliderGesture('drag global spread')}
          oninput={(e) => setGlobalSize('sizeMin', +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="-50" max="50"
          value={sg.sizeMin}
          onchange={(e) => setGlobalSize('sizeMin', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
        <button class="lock-btn" title="Unlock min/max" onclick={() => toggleLock('sizeLocked')}>
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 10-4 0v2z" fill="currentColor"/></svg>
        </button>
      </div>
    {:else}
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread Min</span>
        <input type="range" min="-50" max="50" value={sg.sizeMin}
          onpointerdown={() => beginSliderGesture('drag global spread min')}
          oninput={(e) => setGlobalSize('sizeMin', +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="-50" max="50"
          value={sg.sizeMin}
          onchange={(e) => setGlobalSize('sizeMin', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
        <button class="lock-btn unlocked" title="Lock to single value" onclick={() => toggleLock('sizeLocked')}>
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M10 7V5a2 2 0 10-4 0v.5H4V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h7z" fill="currentColor"/></svg>
        </button>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="Grows or shrinks the shadow before blurring — positive makes it larger than the element, negative makes it smaller">Spread Max</span>
        <input type="range" min="-50" max="50" value={sg.sizeMax}
          onpointerdown={() => beginSliderGesture('drag global spread max')}
          oninput={(e) => setGlobalSize('sizeMax', +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="-50" max="50"
          value={sg.sizeMax}
          onchange={(e) => setGlobalSize('sizeMax', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
    {/if}
    {#if sg.blurLocked}
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur</span>
        <input type="range" min="0" max="100" value={sg.blurMin}
          onpointerdown={() => beginSliderGesture('drag global blur')}
          oninput={(e) => setGlobalBlur('blurMin', +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={sg.blurMin}
          onchange={(e) => setGlobalBlur('blurMin', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
        <button class="lock-btn" title="Unlock min/max" onclick={() => toggleLock('blurLocked')}>
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 10-4 0v2z" fill="currentColor"/></svg>
        </button>
      </div>
    {:else}
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur Min</span>
        <input type="range" min="0" max="100" value={sg.blurMin}
          onpointerdown={() => beginSliderGesture('drag global blur min')}
          oninput={(e) => setGlobalBlur('blurMin', +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={sg.blurMin}
          onchange={(e) => setGlobalBlur('blurMin', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
        <button class="lock-btn unlocked" title="Lock to single value" onclick={() => toggleLock('blurLocked')}>
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M10 7V5a2 2 0 10-4 0v.5H4V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h7z" fill="currentColor"/></svg>
        </button>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How soft the shadow edge is — higher values make a wider, more diffused shadow">Blur Max</span>
        <input type="range" min="0" max="100" value={sg.blurMax}
          onpointerdown={() => beginSliderGesture('drag global blur max')}
          oninput={(e) => setGlobalBlur('blurMax', +e.currentTarget.value)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={sg.blurMax}
          onchange={(e) => setGlobalBlur('blurMax', +e.currentTarget.value)} />
        <span class="shadow-slider-unit">px</span>
      </div>
    {/if}
    {#if sg.opacityLocked}
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op.</span>
        <input type="range" min="0" max="100" value={Math.round(sg.opacityMin * 100)}
          onpointerdown={() => beginSliderGesture('drag global opacity')}
          oninput={(e) => setGlobalOpacity('opacityMin', +e.currentTarget.value / 100)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={Math.round(sg.opacityMin * 100)}
          onchange={(e) => setGlobalOpacity('opacityMin', +e.currentTarget.value / 100)} />
        <span class="shadow-slider-unit">%</span>
        <button class="lock-btn" title="Unlock min/max" onclick={() => toggleLock('opacityLocked')}>
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h4V5a2 2 0 10-4 0v2z" fill="currentColor"/></svg>
        </button>
      </div>
    {:else}
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op. Min</span>
        <input type="range" min="0" max="100" value={Math.round(sg.opacityMin * 100)}
          onpointerdown={() => beginSliderGesture('drag global opacity min')}
          oninput={(e) => setGlobalOpacity('opacityMin', +e.currentTarget.value / 100)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={Math.round(sg.opacityMin * 100)}
          onchange={(e) => setGlobalOpacity('opacityMin', +e.currentTarget.value / 100)} />
        <span class="shadow-slider-unit">%</span>
        <button class="lock-btn unlocked" title="Lock to single value" onclick={() => toggleLock('opacityLocked')}>
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M10 7V5a2 2 0 10-4 0v.5H4V5a4 4 0 118 0v2h1a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h7z" fill="currentColor"/></svg>
        </button>
      </div>
      <div class="global-shadow-row">
        <span class="shadow-slider-label" title="How visible the shadow is — 0% is invisible, 100% is fully opaque">Op. Max</span>
        <input type="range" min="0" max="100" value={Math.round(sg.opacityMax * 100)}
          onpointerdown={() => beginSliderGesture('drag global opacity max')}
          oninput={(e) => setGlobalOpacity('opacityMax', +e.currentTarget.value / 100)} />
        <input class="shadow-slider-input" type="number" min="0" max="100"
          value={Math.round(sg.opacityMax * 100)}
          onchange={(e) => setGlobalOpacity('opacityMax', +e.currentTarget.value / 100)} />
        <span class="shadow-slider-unit">%</span>
      </div>
    {/if}
    <div class="global-color-group">
      <div class="global-color-swatch" style="background: hsl({sg.hue}, {sg.saturation}%, {sg.lightness}%);"></div>
      <div class="global-color-sliders">
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Hue — the base color of the shadow (0°=red, 120°=green, 240°=blue)">H</span>
          <div class="slider-track" style="background: {shadowHueGrad}">
            <input type="range" min="0" max="360" value={sg.hue}
              onpointerdown={() => beginSliderGesture('drag global hue')}
              oninput={(e) => setGlobalColor('hue', +e.currentTarget.value)} />
          </div>
          <input class="shadow-slider-input" type="number" min="0" max="360"
            value={sg.hue}
            onchange={(e) => setGlobalColor('hue', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">&deg;</span>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Saturation — 0% is gray, 100% is full color intensity">S</span>
          <div class="slider-track" style="background: {shadowSatGrad}">
            <input type="range" min="0" max="100" value={sg.saturation}
              onpointerdown={() => beginSliderGesture('drag global saturation')}
              oninput={(e) => setGlobalColor('saturation', +e.currentTarget.value)} />
          </div>
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={sg.saturation}
            onchange={(e) => setGlobalColor('saturation', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">%</span>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label" title="Lightness — 0% is black, 100% is white">L</span>
          <div class="slider-track" style="background: {shadowLightGrad}">
            <input type="range" min="0" max="100" value={sg.lightness}
              onpointerdown={() => beginSliderGesture('drag global lightness')}
              oninput={(e) => setGlobalColor('lightness', +e.currentTarget.value)} />
          </div>
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={sg.lightness}
            onchange={(e) => setGlobalColor('lightness', +e.currentTarget.value)} />
          <span class="shadow-slider-unit">%</span>
        </div>
      </div>
    </div>
    <button class="bg-picker-btn" onclick={toggleBgPicker}>BG</button>
    {#if bgPickerOpen}
      <div class="bg-picker-menu">
        {#each bgColorGroups as group}
          <button class="bg-group-header" onclick={() => expandedGroup = expandedGroup === group.label ? null : group.label}>
            <span>{group.label}</span>
            <span class="bg-group-arrow">{expandedGroup === group.label ? '▴' : '▾'}</span>
          </button>
          {#if expandedGroup === group.label}
            <div class="bg-group-colors">
              {#each group.colors as color}
                <button class="bg-color-option" onclick={() => pickBg(color.value)}>
                  <span class="bg-color-swatch" style="background: {color.value};"></span>
                  <span>{color.label}</span>
                </button>
              {/each}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}
  </div>
  </div><!-- /.shadows-layout -->
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-24);
  }

  .section-title {
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 2px solid var(--ui-border-high);
  }

  .token-info {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .token-variable.copyable {
    all: unset;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .token-variable.copyable:hover {
    color: var(--ui-text-accent);
  }

  .token-variable.copyable.copied {
    color: var(--ui-text-success);
  }

  .token-value {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-muted);
  }

  /* Shadows */
  .shadows-section {
    background: var(--ui-surface-highest);
    padding: var(--ui-space-16);
    border-radius: var(--ui-radius-lg);
    position: relative;
  }

  .shadows-layout {
    display: flex;
    gap: var(--ui-space-16);
    align-items: flex-start;
  }

  .shadows-main {
    flex: 1;
    min-width: 0;
  }

  .shadows-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--ui-space-16);
  }

  .shadow-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .shadow-item.active {
    outline: 2px solid var(--ui-text-accent);
    outline-offset: var(--ui-space-4);
    border-radius: var(--ui-radius-md);
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .reset-btn {
    all: unset;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--ui-space-4) var(--ui-space-8);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    text-align: center;
    transition: color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .reset-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-high);
  }

  .shadow-box {
    width: 4rem;
    height: 4rem;
    background: var(--ui-surface-high);
    border-radius: var(--ui-radius-md);
  }

  .shadow-item .token-info {
    align-items: center;
    text-align: center;
  }

  .shadow-edit-btn {
    all: unset;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--ui-space-2) var(--ui-space-8);
    border-radius: var(--ui-radius-sm);
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
  }

  .shadow-edit-btn:hover {
    color: var(--ui-text-accent);
    background: var(--ui-surface-low);
  }

  .shadow-slider-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    width: 4rem;
    text-align: right;
    flex-shrink: 0;
  }

  .shadow-slider-input {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    width: 2.5rem;
    text-align: right;
    flex-shrink: 0;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2) var(--ui-space-4);
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .shadow-slider-input::-webkit-inner-spin-button,
  .shadow-slider-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .shadow-slider-input:focus {
    outline: none;
    border-color: var(--ui-border-high);
  }

  .shadow-slider-unit {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    font-family: var(--ui-font-mono);
    width: 1rem;
    flex-shrink: 0;
  }

  /* Angle dial */
  .angle-dial {
    cursor: pointer;
    touch-action: none;
    flex-shrink: 0;
  }

  .dial-ring {
    fill: none;
    stroke: var(--ui-border-low);
    stroke-width: 1.5;
  }

  .dial-line {
    stroke: var(--ui-text-secondary);
    stroke-width: 1.5;
    stroke-linecap: round;
  }

  .dial-handle {
    fill: var(--ui-text-accent);
    stroke: none;
  }

  .angle-dial:hover .dial-ring {
    stroke: var(--ui-border-high);
  }

  .angle-dial:hover .dial-handle {
    fill: var(--ui-text-primary);
  }

  .shadow-css-output {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    margin-top: var(--ui-space-4);
    padding-top: var(--ui-space-8);
    border-top: 1px solid var(--ui-border-low);
  }

  .shadow-css-output code {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-accent);
    font-family: var(--ui-font-mono);
    word-break: break-all;
  }

  .shadow-copy-btn {
    all: unset;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--ui-space-2) var(--ui-space-6);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    text-align: center;
    transition: color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .shadow-copy-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-high);
  }

  /* Global shadow editor */
  .global-shadow-editor {
    position: sticky;
    top: var(--ui-space-12);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    width: 18rem;
  }

  .global-shadow-title {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    margin: 0;
  }

  .global-shadow-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .lock-btn {
    all: unset;
    cursor: pointer;
    color: var(--ui-text-muted);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: var(--ui-space-2);
    border-radius: var(--ui-radius-sm);
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
  }

  .lock-btn:hover {
    color: var(--ui-text-primary);
    background: var(--ui-surface-low);
  }

  .lock-btn.unlocked {
    color: var(--ui-text-accent);
  }

  .global-shadow-row .shadow-slider-label {
    width: 3rem;
  }

  .global-shadow-row input[type="range"] {
    flex: 1;
    min-width: 4rem;
    accent-color: var(--ui-text-accent);
    height: 4px;
    cursor: pointer;
  }

  .slider-track {
    flex: 1;
    min-width: 4rem;
    position: relative;
    height: 12px;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
  }

  .slider-track input[type="range"] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }

  .slider-track input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 10px;
    height: 14px;
    border-radius: 2px;
    background: white;
    border: 1px solid var(--ui-border-low);
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    cursor: pointer;
  }

  .slider-track input[type="range"]::-moz-range-thumb {
    width: 10px;
    height: 14px;
    border-radius: 2px;
    background: white;
    border: 1px solid var(--ui-border-low);
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    cursor: pointer;
  }

  .slider-track input[type="range"]::-moz-range-track {
    background: transparent;
    border: none;
  }

  .global-color-group {
    display: flex;
    gap: var(--ui-space-8);
    align-items: stretch;
  }

  .global-color-swatch {
    width: 2rem;
    flex-shrink: 0;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
  }

  .global-color-sliders {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .bg-picker-btn {
    all: unset;
    font-size: var(--ui-font-size-xs);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--ui-space-4) var(--ui-space-8);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface-low);
    transition: color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .bg-picker-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-high);
  }

  .bg-picker-menu {
    position: absolute;
    bottom: calc(100% + var(--ui-space-4));
    left: 0;
    width: 14rem;
    max-width: calc(100vw - 2rem);
    max-height: 24rem;
    overflow-y: auto;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    padding: var(--ui-space-4);
    display: flex;
    flex-direction: column;
    z-index: 10;
  }

  .bg-group-header {
    all: unset;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--ui-space-6) var(--ui-space-8);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    cursor: pointer;
    border-radius: var(--ui-radius-sm);
    transition: background var(--ui-transition-fast);
  }

  .bg-group-header:hover {
    background: var(--ui-surface-high);
  }

  .bg-group-arrow {
    font-size: 0.65rem;
    color: var(--ui-text-muted);
  }

  .bg-group-colors {
    display: flex;
    flex-direction: column;
    padding-left: var(--ui-space-8);
  }

  .bg-color-option {
    all: unset;
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-4) var(--ui-space-8);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    cursor: pointer;
    border-radius: var(--ui-radius-sm);
    transition: background var(--ui-transition-fast);
  }

  .bg-color-option:hover {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .bg-color-swatch {
    width: 1rem;
    height: 1rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
    flex-shrink: 0;
  }
</style>
