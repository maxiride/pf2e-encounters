<script lang="ts">
  import { hexToOklch, oklchToHex, gamutClamp } from '../core/palettes/oklch';
  import InlineEditActions from '../../system/components/InlineEditActions.svelte';
  import Button from '../../system/components/Button.svelte';

  

  
  interface Props {
    color: string;
    title?: string | null;
    showRemoveOverride?: boolean;
    onColorChange?: (hex: string) => void;
    onConfirm?: () => void;
    onCancel?: () => void;
    onRemoveOverride?: () => void;
    /**
   * Optional pointerdown hook for slider drags — lets parents open a store
   * transaction so the whole drag collapses to one undo step. If the parent
   * doesn't route slider writes through the editor store, leave this unset.
   */
    onSliderStart?: () => void;
    // Hue-chroma mode props (for neutral/gray base editing)
    mode?: 'hsl' | 'hue-chroma';
    hue?: number;
    chroma?: number;
    onHueChromaChange?: (hue: number, chroma: number) => void;
    actions?: import('svelte').Snippet;
  }

  let {
    color,
    title = null,
    showRemoveOverride = false,
    onColorChange = () => {},
    onConfirm = () => {},
    onCancel = () => {},
    onRemoveOverride = () => {},
    onSliderStart = () => {},
    mode = 'hsl',
    hue = 0,
    chroma = 0.04,
    onHueChromaChange = () => {},
    actions
  }: Props = $props();

  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  const PREVIEW_LIGHTNESS = 0.55;
  const CHROMA_MAX = 0.15;

  // --- HSL helpers (used in hsl mode) ---

  function hexToHsl(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  function hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  // --- HSL mode reactives ---

  let hsl = $derived(hexToHsl(color));

  function hueGrad(s: number, l: number): string {
    return `linear-gradient(to right, ${
      [0, 60, 120, 180, 240, 300, 360].map(h => `hsl(${h},${s}%,${l}%)`).join(',')
    })`;
  }

  function satGrad(h: number, l: number): string {
    return `linear-gradient(to right, hsl(${h},0%,${l}%), hsl(${h},100%,${l}%))`;
  }

  function lightGrad(h: number, s: number): string {
    return `linear-gradient(to right, hsl(${h},${s}%,0%), hsl(${h},${s}%,50%), hsl(${h},${s}%,100%))`;
  }

  function updateHsl(component: 0 | 1 | 2, value: number) {
    const current = hexToHsl(color);
    current[component] = value;
    onColorChange(hslToHex(current[0], current[1], current[2]));
  }

  // --- Hue-chroma mode reactives ---

  let previewHex = $derived(mode === 'hue-chroma'
    ? (() => { const c = gamutClamp(PREVIEW_LIGHTNESS, chroma, hue); return oklchToHex(c.l, c.c, c.h); })()
    : color);

  let hueGradient = $derived((() => {
    const _c = chroma;
    const displayChroma = Math.max(_c, CHROMA_MAX);
    const stops = Array.from({ length: 13 }, (_, i) => {
      const h = (i / 12) * 360;
      const c = gamutClamp(PREVIEW_LIGHTNESS, displayChroma, h);
      return oklchToHex(c.l, c.c, c.h);
    });
    return `linear-gradient(to right, ${stops.join(',')})`;
  })());

  let chromaGradient = $derived((() => {
    const _h = hue;
    const stops = Array.from({ length: 8 }, (_, i) => {
      const c = (i / 7) * CHROMA_MAX;
      const clamped = gamutClamp(PREVIEW_LIGHTNESS, c, _h);
      return oklchToHex(clamped.l, clamped.c, clamped.h);
    });
    return `linear-gradient(to right, ${stops.join(',')})`;
  })());

  // --- Shared ---

  async function pickScreenColor() {
    if (!hasEyeDropper) return;
    try {
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      const hex = result.sRGBHex.toLowerCase();
      if (mode === 'hue-chroma') {
        const oklch = hexToOklch(hex);
        onHueChromaChange(Math.round(oklch.h), Math.round(oklch.c * 1000) / 1000);
      } else {
        onColorChange(hex);
      }
    } catch {
      // user cancelled the eyedropper
    }
  }

  let hexEditing = $state(false);
  let hexDraft = $state('');

  function startHexEdit() {
    hexDraft = previewHex;
    hexEditing = true;
  }

  function autoFocus(node: HTMLElement) { node.focus(); }

  function commitHex() {
    const v = hexDraft.startsWith('#') ? hexDraft : `#${hexDraft}`;
    if (/^#[0-9a-f]{6}$/i.test(v)) {
      const hex = v.toLowerCase();
      if (mode === 'hue-chroma') {
        const oklch = hexToOklch(hex);
        onHueChromaChange(Math.round(oklch.h), Math.round(oklch.c * 1000) / 1000);
      } else {
        onColorChange(hex);
      }
    }
    hexEditing = false;
  }

  function handleHexKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') commitHex();
    if (e.key === 'Escape') hexEditing = false;
  }
</script>

<div class="hsl-panel">
  <div class="hsl-panel-header">
    <div class="hsl-preview" style="background: {previewHex}"></div>
    {#if hasEyeDropper}
      <button
        class="eyedropper-btn"
        type="button"
        title="Pick color from screen"
        onclick={pickScreenColor}
      ><i class="fas fa-eye-dropper"></i></button>
    {/if}
    {#if title}
      <span class="hsl-panel-title">{title}</span>
    {/if}
    {#if hexEditing}
      <input
        class="hsl-hex-input"
        type="text"
        bind:value={hexDraft}
        onkeydown={handleHexKeydown}
        onblur={commitHex}
        maxlength="7"
        use:autoFocus
      />
    {:else}
      <button class="hsl-hex" onclick={startHexEdit} title="Click to edit hex">{previewHex}</button>
    {/if}
    {#if mode === 'hue-chroma'}
      <code class="hsl-values">oklch({PREVIEW_LIGHTNESS}, {chroma.toFixed(3)}, {Math.round(hue)})</code>
    {:else}
      <code class="hsl-values">hsl({hsl[0]}, {hsl[1]}%, {hsl[2]}%)</code>
    {/if}
    {@render actions?.()}
    <div class="hsl-panel-actions">
      {#if showRemoveOverride}
        <Button
          variant="danger"
          size="small"
          icon="fas fa-trash"
          on:click={onRemoveOverride}
        >Remove override</Button>
      {/if}
      <InlineEditActions
        onSave={onConfirm}
        onCancel={onCancel}
        saveTitle="Apply changes"
        cancelTitle="Discard changes"
      />
    </div>
  </div>
  <div class="hsl-sliders">
    {#if mode === 'hue-chroma'}
      <div class="hsl-slider-row">
        <span class="hsl-slider-label">H</span>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="slider-track" style="background: {hueGradient}" onpointerdown={onSliderStart}>
          <input type="range" min="0" max="360" value={hue}
            oninput={(e) => onHueChromaChange(+e.currentTarget.value, chroma)} />
        </div>
        <input
          class="hsl-slider-input"
          type="number"
          min="0"
          max="360"
          value={hue}
          onchange={(e) => onHueChromaChange(Math.min(360, Math.max(0, +e.currentTarget.value)), chroma)}
        /><span class="hsl-slider-unit">&deg;</span>
      </div>
      <div class="hsl-slider-row">
        <span class="hsl-slider-label">C</span>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="slider-track" style="background: {chromaGradient}" onpointerdown={onSliderStart}>
          <input type="range" min="0" max={CHROMA_MAX} step="0.001" value={chroma}
            oninput={(e) => onHueChromaChange(hue, +e.currentTarget.value)} />
        </div>
        <input
          class="hsl-slider-input chroma-input"
          type="number"
          min="0"
          max={CHROMA_MAX}
          step="0.001"
          value={chroma.toFixed(3)}
          onchange={(e) => onHueChromaChange(hue, Math.min(CHROMA_MAX, Math.max(0, +e.currentTarget.value)))}
        />
      </div>
    {:else}
      <div class="hsl-slider-row">
        <span class="hsl-slider-label">H</span>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="slider-track" style="background: {hueGrad(hsl[1], hsl[2])}" onpointerdown={onSliderStart}>
          <input type="range" min="0" max="360" value={hsl[0]}
            oninput={(e) => updateHsl(0, +e.currentTarget.value)} />
        </div>
        <input
          class="hsl-slider-input"
          type="number"
          min="0"
          max="360"
          value={hsl[0]}
          onchange={(e) => updateHsl(0, Math.min(360, Math.max(0, +e.currentTarget.value)))}
        /><span class="hsl-slider-unit">&deg;</span>
      </div>
      <div class="hsl-slider-row">
        <span class="hsl-slider-label">S</span>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="slider-track" style="background: {satGrad(hsl[0], hsl[2])}" onpointerdown={onSliderStart}>
          <input type="range" min="0" max="100" value={hsl[1]}
            oninput={(e) => updateHsl(1, +e.currentTarget.value)} />
        </div>
        <input
          class="hsl-slider-input"
          type="number"
          min="0"
          max="100"
          value={hsl[1]}
          onchange={(e) => updateHsl(1, Math.min(100, Math.max(0, +e.currentTarget.value)))}
        /><span class="hsl-slider-unit">%</span>
      </div>
      <div class="hsl-slider-row">
        <span class="hsl-slider-label">L</span>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="slider-track" style="background: {lightGrad(hsl[0], hsl[1])}" onpointerdown={onSliderStart}>
          <input type="range" min="0" max="100" value={hsl[2]}
            oninput={(e) => updateHsl(2, +e.currentTarget.value)} />
        </div>
        <input
          class="hsl-slider-input"
          type="number"
          min="0"
          max="100"
          value={hsl[2]}
          onchange={(e) => updateHsl(2, Math.min(100, Math.max(0, +e.currentTarget.value)))}
        /><span class="hsl-slider-unit">%</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .hsl-panel {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .hsl-panel-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    flex-wrap: wrap;
  }

  .hsl-preview {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
    flex-shrink: 0;
  }

  .eyedropper-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    background: var(--ui-hover);
    color: var(--ui-text-secondary);
    cursor: pointer;
    font-size: var(--ui-font-size-md);
    flex-shrink: 0;

    &:hover {
      background: var(--ui-hover-high);
      color: var(--ui-text-primary);
      border-color: var(--ui-border-higher);
    }
  }

  .hsl-panel-title {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  .hsl-hex {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-accent);
    font-family: var(--ui-font-mono);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2) var(--ui-space-4);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .hsl-hex:hover {
    border-color: var(--ui-border);
    background: var(--ui-surface-low);
  }

  .hsl-hex-input {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-accent);
    font-family: var(--ui-font-mono);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-higher);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2) var(--ui-space-4);
    width: 5.5rem;
    outline: none;
  }

  .hsl-values {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .hsl-panel-actions {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    margin-left: auto;
    flex-wrap: wrap;
  }

  .hsl-sliders {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .hsl-slider-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .hsl-slider-label {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    width: 2.5rem;
    text-align: right;
    flex-shrink: 0;
  }

  .slider-track {
    position: relative;
    height: 1.25rem;
    border-radius: var(--ui-radius-md);
    border: 1px solid var(--ui-border-low);
    flex: 1;
    min-width: 6rem;
  }

  .slider-track input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    background: transparent;
    cursor: pointer;
    border-radius: var(--ui-radius-md);
  }

  .slider-track input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 0.5rem;
    height: 1.25rem;
    border-radius: var(--ui-radius-sm);
    background: white;
    border: 2px solid rgba(0, 0, 0, 0.3);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }

  .slider-track input[type="range"]::-moz-range-thumb {
    width: 0.5rem;
    height: 1.25rem;
    border-radius: var(--ui-radius-sm);
    background: white;
    border: 2px solid rgba(0, 0, 0, 0.3);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }

  .slider-track input[type="range"]::-moz-range-track {
    background: transparent;
    border: none;
  }

  .slider-track input[type="range"]:focus {
    outline: none;
  }

  .slider-track input[type="range"]:focus-visible {
    outline: 2px solid var(--ui-border-high);
    outline-offset: 2px;
  }

  .hsl-slider-input {
    font-size: var(--ui-font-size-md);
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

  .hsl-slider-input.chroma-input {
    width: 3.5rem;
  }

  .hsl-slider-input::-webkit-inner-spin-button,
  .hsl-slider-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .hsl-slider-input:focus {
    outline: none;
    border-color: var(--ui-border-high);
  }

  .hsl-slider-unit {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-muted);
    font-family: var(--ui-font-mono);
    width: 0.75rem;
    flex-shrink: 0;
  }
</style>
