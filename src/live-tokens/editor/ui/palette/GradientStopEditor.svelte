<script lang="ts">
  import { stopPropagation } from 'svelte/legacy';

  import type { GradientStyle, GradientStop } from '../../core/themes/themeTypes';
  import { beginSliderGesture } from '../../core/store/editorStore';

  /**
   * Gradient style + stop editor (the bar, draggable handles, and selected-
   * stop controls). All persistent gradient state lives in the parent's
   * palette config; this component receives values + dispatches edits via
   * callback props. Drag state (`draggingStopIndex`) and `selectedStopIndex`
   * are owned here because they are pure interaction state — never persisted.
   *
   * The drag handlers wrap edits in `beginSliderGesture` so the editor's
   * undo coalescer treats one drag as one history entry, matching the
   * behaviour of the inline implementation it replaces.
   */

  interface PaletteStep { label: string; hex: string }


  interface Props {
    gradientStyle: GradientStyle;
    gradientAngle: number;
    gradientSize: 'page' | 'window';
    gradientReverse: boolean;
    gradientStops: GradientStop[];
    gradientBarPreview: string;
    paletteComputed: PaletteStep[];
    onSetGradientStyle: (style: GradientStyle) => void;
    onSetGradientSize: (size: 'page' | 'window') => void;
    onSetGradientAngle: (angle: number) => void;
    onSetGradientReverse: (reverse: boolean) => void;
    onSetGradientStops: (stops: GradientStop[]) => void;
  }

  let {
    gradientStyle,
    gradientAngle,
    gradientSize,
    gradientReverse,
    gradientStops,
    gradientBarPreview,
    paletteComputed,
    onSetGradientStyle,
    onSetGradientSize,
    onSetGradientAngle,
    onSetGradientReverse,
    onSetGradientStops
  }: Props = $props();

  const gradientStyleOptions: { value: GradientStyle; icon: string; title: string }[] = [
    { value: 'linear', icon: '/', title: 'Linear' },
    { value: 'radial', icon: '○', title: 'Radial' },
    { value: 'conic',  icon: '◔', title: 'Conic' },
  ];

  const gradientSizeOptions: { value: 'page' | 'window'; label: string; title: string }[] = [
    { value: 'page', label: 'Page', title: 'Gradient stretches over the full scrollable page' },
    { value: 'window', label: 'Window', title: 'Gradient stays fixed to the viewport' },
  ];

  let selectedStopIndex = $state(0);
  let draggingStopIndex: number | null = null;

  function stopColor(stop: GradientStop): string {
    const ps = paletteComputed.find(p => p.label === stop.paletteLabel);
    return ps ? ps.hex : '#000000';
  }

  function onAngleInput(e: Event) {
    const v = parseInt((e.currentTarget as HTMLInputElement).value) || 0;
    onSetGradientAngle(v);
  }

  function onReverseChange(e: Event) {
    onSetGradientReverse((e.currentTarget as HTMLInputElement).checked);
  }

  function onStopColorChange(e: Event) {
    const v = (e.currentTarget as HTMLSelectElement).value;
    const next = gradientStops.map((s, idx) => idx === selectedStopIndex ? { ...s, paletteLabel: v } : s);
    onSetGradientStops(next);
  }

  function onStopPositionChange(e: Event) {
    const raw = parseInt((e.currentTarget as HTMLInputElement).value) || 0;
    const v = Math.max(0, Math.min(100, raw));
    const next = gradientStops.map((s, idx) => idx === selectedStopIndex ? { ...s, position: v } : s);
    onSetGradientStops(next);
  }

  function addGradientStop(position: number) {
    const nearest = paletteComputed.reduce((prev, curr) => {
      const prevDist = Math.abs(parseInt(prev.label) - 500);
      const currDist = Math.abs(parseInt(curr.label) - 500);
      return currDist < prevDist ? curr : prev;
    });
    const next = [...gradientStops, { position, paletteLabel: nearest.label }];
    onSetGradientStops(next);
    selectedStopIndex = next.length - 1;
  }

  function removeGradientStop(index: number) {
    if (gradientStops.length <= 2) return;
    const next = gradientStops.filter((_, i) => i !== index);
    onSetGradientStops(next);
    if (selectedStopIndex >= next.length) selectedStopIndex = next.length - 1;
  }

  function handleStopHandleMouseDown(e: MouseEvent, i: number) {
    selectedStopIndex = i;
    draggingStopIndex = i;
    const bar = (e.currentTarget as HTMLElement).parentElement!;
    const rect = bar.getBoundingClientRect();
    beginSliderGesture('drag gradient stop');
    function onMove(me: MouseEvent) {
      if (draggingStopIndex === null) return;
      const newPos = Math.round(Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100)));
      const next = gradientStops.map((s, idx) => idx === draggingStopIndex ? { ...s, position: newPos } : s);
      onSetGradientStops(next);
    }
    function onUp() {
      draggingStopIndex = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleStopBarMouseDown(e: MouseEvent) {
    const bar = (e.currentTarget as HTMLElement);
    const rect = bar.getBoundingClientRect();
    const pos = Math.round(((e.clientX - rect.left) / rect.width) * 100);

    const nearIdx = gradientStops.findIndex(s => Math.abs(s.position - pos) < 4);
    if (nearIdx >= 0) {
      selectedStopIndex = nearIdx;
      draggingStopIndex = nearIdx;
      beginSliderGesture('drag gradient stop');
    } else {
      addGradientStop(Math.max(0, Math.min(100, pos)));
      draggingStopIndex = gradientStops.length - 1;
      beginSliderGesture('drag gradient stop');
    }

    function onMove(me: MouseEvent) {
      if (draggingStopIndex === null) return;
      const newPos = Math.round(Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100)));
      const next = gradientStops.map((s, idx) => idx === draggingStopIndex ? { ...s, position: newPos } : s);
      onSetGradientStops(next);
    }
    function onUp() {
      draggingStopIndex = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
</script>

<div class="gradient-controls">
  <div class="gradient-row">
    <span class="gradient-label">Style:</span>
    <div class="gradient-style-buttons">
      {#each gradientStyleOptions as opt}
        <button
          class="style-btn"
          class:active={gradientStyle === opt.value}
          type="button"
          title={opt.title}
          onclick={() => onSetGradientStyle(opt.value)}
        >{opt.icon}</button>
      {/each}
    </div>
  </div>

  <div class="gradient-row">
    <span class="gradient-label">Angle:</span>
    <input
      class="gradient-angle-input"
      type="number"
      min="0"
      max="360"
      value={gradientAngle}
      oninput={onAngleInput}
    />
    <span class="gradient-unit">deg</span>
    <input
      class="gradient-angle-slider"
      type="range"
      min="0"
      max="360"
      value={gradientAngle}
      oninput={onAngleInput}
    />
  </div>

  <div class="gradient-row">
    <span class="gradient-label">Size:</span>
    <div class="gradient-style-buttons">
      {#each gradientSizeOptions as opt}
        <button
          class="style-btn size-btn"
          class:active={gradientSize === opt.value}
          type="button"
          title={opt.title}
          onclick={() => onSetGradientSize(opt.value)}
        >{opt.label}</button>
      {/each}
    </div>
  </div>

  <div class="gradient-row">
    <label class="gradient-checkbox-label">
      <input type="checkbox" checked={gradientReverse} onchange={onReverseChange} />
      Reverse
    </label>
  </div>

  <!-- Gradient stop bar -->
  <div class="gradient-stop-bar-wrapper">
    <div class="gradient-stop-handles">
      {#each gradientStops as stop, i}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
          class="gradient-stop-handle"
          class:selected={selectedStopIndex === i}
          style="left: {stop.position}%; --stop-color: {stopColor(stop)}"
          onmousedown={stopPropagation((e) => handleStopHandleMouseDown(e as MouseEvent, i))}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') removeGradientStop(i);
          }}
        >
          <div class="stop-swatch" style="background: {stopColor(stop)}"></div>
          <div class="stop-arrow"></div>
        </div>
      {/each}
    </div>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="gradient-stop-bar"
      style="background: {gradientBarPreview}"
      onmousedown={handleStopBarMouseDown}
      role="slider"
      tabindex="0"
      aria-label="Gradient stops"
      aria-valuenow={gradientStops[selectedStopIndex]?.position ?? 0}
      aria-valuemin="0"
      aria-valuemax="100"
    ></div>
  </div>

  <!-- Selected stop controls -->
  {#if gradientStops[selectedStopIndex]}
    <div class="gradient-row stop-controls">
      <span class="gradient-label">Color:</span>
      <select
        class="gradient-select"
        value={gradientStops[selectedStopIndex].paletteLabel}
        onchange={onStopColorChange}
      >
        {#each paletteComputed as ps}
          <option value={ps.label}>{ps.label}</option>
        {/each}
      </select>
      <div class="stop-color-preview" style="background: {stopColor(gradientStops[selectedStopIndex])}"></div>
      <span class="gradient-label">Pos:</span>
      <input
        class="gradient-pos-input"
        type="number"
        min="0"
        max="100"
        value={gradientStops[selectedStopIndex].position}
        onchange={onStopPositionChange}
      />
      <span class="gradient-unit">%</span>
      {#if gradientStops.length > 2}
        <button
          class="stop-remove-btn"
          type="button"
          title="Remove stop"
          onclick={() => removeGradientStop(selectedStopIndex)}
        >&times;</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .gradient-controls {
    margin-top: var(--ui-space-8);
    padding: var(--ui-space-12);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-lg);
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .gradient-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .gradient-label {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-secondary);
    min-width: 36px;
    flex-shrink: 0;
  }

  .gradient-style-buttons {
    display: flex;
    gap: var(--ui-space-2);
  }

  .style-btn {
    width: 28px;
    height: 28px;
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface-lowest);
    color: var(--ui-text-secondary);
    cursor: pointer;
    font-size: var(--ui-font-size-md);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .style-btn.active {
    border-color: var(--ui-text-secondary);
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .style-btn:hover {
    border-color: var(--ui-border-high);
  }

  .size-btn {
    width: auto;
    padding: 0 8px;
  }

  .gradient-angle-input,
  .gradient-pos-input {
    width: 52px;
    padding: 2px 6px;
    font-size: var(--ui-font-size-md);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    text-align: center;
  }

  .gradient-angle-slider {
    flex: 1;
    min-width: 60px;
    height: 4px;
    accent-color: var(--ui-text-secondary);
  }

  .gradient-unit {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
  }

  .gradient-checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
  }

  .gradient-checkbox-label input {
    margin: 0;
    cursor: pointer;
  }

  .gradient-select {
    padding: 2px 6px;
    font-size: var(--ui-font-size-md);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
  }

  .stop-color-preview {
    width: 20px;
    height: 20px;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
    flex-shrink: 0;
  }

  .gradient-stop-bar-wrapper {
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .gradient-stop-handles {
    position: relative;
    height: 28px;
  }

  .gradient-stop-bar {
    position: relative;
    height: 24px;
    border-radius: var(--ui-radius-md);
    border: 1px solid var(--ui-border-low);
    cursor: crosshair;
  }

  .gradient-stop-handle {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: grab;
    z-index: 1;
  }

  .gradient-stop-handle.selected {
    z-index: 2;
  }

  .stop-swatch {
    width: 16px;
    height: 16px;
    border-radius: var(--ui-radius-sm);
    border: 2px solid var(--ui-border-high);
    flex-shrink: 0;
  }

  .gradient-stop-handle.selected .stop-swatch {
    border-color: var(--ui-text-primary);
  }

  .gradient-stop-handle:hover .stop-swatch {
    border-color: var(--ui-text-secondary);
  }

  .stop-arrow {
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid var(--ui-border-high);
  }

  .gradient-stop-handle.selected .stop-arrow {
    border-top-color: var(--ui-text-primary);
  }

  .gradient-stop-handle:hover .stop-arrow {
    border-top-color: var(--ui-text-secondary);
  }

  .stop-controls {
    flex-wrap: wrap;
  }

  .stop-remove-btn {
    width: 20px;
    height: 20px;
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface-lowest);
    color: var(--ui-text-tertiary);
    cursor: pointer;
    font-size: var(--ui-font-size-md);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin-left: auto;
  }

  .stop-remove-btn:hover {
    border-color: var(--ui-border-higher);
    color: var(--ui-text-primary);
  }
</style>
