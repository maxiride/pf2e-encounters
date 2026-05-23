<script lang="ts">
  /**
   * 2D shape control for a radial gradient. Two independent stretch
   * factors (X and Y, both 1 → 8) define the ellipse's semi-axes; rendering
   * uses `base * aspectX` and `base * aspectY` so the data also encodes
   * size (both = 8 is a circle 8× bigger than both = 1).
   *
   * Three concurrent affordances stay synced:
   *   - 2D pad with a draggable handle that lives at (aspectX, aspectY).
   *     The visible ellipse is drawn with semi-axes equal to the handle's
   *     offset from center, so the dot you drag IS the corner of the shape.
   *   - Horizontal slider beneath the pad — drags X only.
   *   - Vertical slider beside the pad — drags Y only.
   *
   * Range chosen so 1 = "no stretch" and 8 = "8× stretch" — same units the
   * user sees in the W : H ratio readout.
   */
  import UIPillButton from '../../ui/UIPillButton.svelte';
  interface Props {
    /** Horizontal stretch (1 = unscaled, default). */
    x?: number;
    /** Vertical stretch (1 = unscaled, default). */
    y?: number;
    /** Edge length of the square pad in px. Sliders extend the bounding box. */
    size?: number;
    /** Clamp bounds for each axis. */
    min?: number;
    max?: number;
    onchange?: (payload: { x: number; y: number }) => void;
  }

  let {
    x = $bindable(1),
    y = $bindable(1),
    size = 80,
    min = 1,
    max = 8,
    onchange,
  }: Props = $props();

  let padEl: HTMLDivElement | undefined = $state();
  let xSliderEl: HTMLDivElement | undefined = $state();
  let ySliderEl: HTMLDivElement | undefined = $state();
  let drag: 'pad' | 'x' | 'y' | null = $state(null);

  // Quadrant the handle currently lives in. The stored aspect values are
  // always positive (CSS radial-gradient semi-axes must be), but the dot can
  // be dragged into any of the four quadrants. The ellipse is symmetric, so
  // mirroring the handle reads as "this corner" — the rendered shape is
  // identical. Sign is session-local; on reload the dot defaults to top-right.
  let signX = $state(1);
  let signY = $state(1);

  /** Inset (px) the pad uses to keep the corner handle inside its border.
   *  Sliders use a separate inset since their end-labels sit outside the
   *  rail entirely now. */
  const PAD_INSET = 6;
  const SLIDER_INSET = 0;

  function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
  }

  /** Snap near-integer values so the user can land cleanly on {1,2,…,8}. */
  function snap(v: number): number {
    const rounded = Math.round(v);
    if (Math.abs(v - rounded) < 0.05) return rounded;
    return Math.round(v * 10) / 10;
  }

  function emit(nx: number, ny: number) {
    const cx = clamp(snap(nx), min, max);
    const cy = clamp(snap(ny), min, max);
    if (cx === x && cy === y) return;
    x = cx;
    y = cy;
    onchange?.({ x: cx, y: cy });
  }

  /** Pad pointer → (aspectX, aspectY). The pointer's signed distance from
   *  center decides the quadrant; magnitude maps linearly into (min, max).
   *  signX/signY are updated here so the handle renders in the quadrant the
   *  user actually dragged to, even though the returned aspect values stay
   *  positive. Clamping at the edges is handled by `emit`. */
  function aspectFromPad(e: PointerEvent): { x: number; y: number } {
    const rect = padEl!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const span = rect.width / 2 - PAD_INSET;
    const dx = e.clientX - cx;
    const dy = cy - e.clientY;
    if (dx !== 0) signX = dx >= 0 ? 1 : -1;
    if (dy !== 0) signY = dy >= 0 ? 1 : -1;
    const nx = min + (Math.abs(dx) / span) * (max - min);
    const ny = min + (Math.abs(dy) / span) * (max - min);
    return { x: nx, y: ny };
  }

  function valueFromLinearSlider(el: HTMLDivElement, clientPx: number, axis: 'h' | 'v'): number {
    const rect = el.getBoundingClientRect();
    const len = axis === 'h' ? rect.width - 2 * SLIDER_INSET : rect.height - 2 * SLIDER_INSET;
    const pos = axis === 'h'
      ? clientPx - (rect.left + SLIDER_INSET)
      : (rect.bottom - SLIDER_INSET) - clientPx;
    const t = clamp(pos / len, 0, 1);
    return min + t * (max - min);
  }

  function onPadDown(e: PointerEvent) {
    drag = 'pad';
    padEl!.setPointerCapture(e.pointerId);
    const { x: nx, y: ny } = aspectFromPad(e);
    emit(nx, ny);
  }
  function onXDown(e: PointerEvent) {
    drag = 'x';
    xSliderEl!.setPointerCapture(e.pointerId);
    emit(valueFromLinearSlider(xSliderEl!, e.clientX, 'h'), y);
  }
  function onYDown(e: PointerEvent) {
    drag = 'y';
    ySliderEl!.setPointerCapture(e.pointerId);
    emit(x, valueFromLinearSlider(ySliderEl!, e.clientY, 'v'));
  }

  function onMove(e: PointerEvent) {
    if (drag === 'pad') {
      const { x: nx, y: ny } = aspectFromPad(e);
      emit(nx, ny);
    } else if (drag === 'x') {
      emit(valueFromLinearSlider(xSliderEl!, e.clientX, 'h'), y);
    } else if (drag === 'y') {
      emit(x, valueFromLinearSlider(ySliderEl!, e.clientY, 'v'));
    }
  }
  function onUp(e: PointerEvent) {
    if (!drag) return;
    const target = drag === 'pad' ? padEl! : drag === 'x' ? xSliderEl! : ySliderEl!;
    target.releasePointerCapture(e.pointerId);
    drag = null;
  }

  /** Position of the pad handle and the rendered ellipse's bounding corner.
   *  Aspect values map to pixel magnitudes; signX/signY pick which of the
   *  ellipse's four corners the handle sits on. The ellipse itself is always
   *  centered with positive semi-axes (it's symmetric, so the shape reads
   *  identically in any quadrant). */
  let pad = $derived.by(() => {
    const span = size / 2 - PAD_INSET;
    const tx = (x - min) / (max - min);
    const ty = (y - min) / (max - min);
    const rx = tx * span;
    const ry = ty * span;
    const center = size / 2;
    return { center, rx, ry, handleX: center + signX * rx, handleY: center - signY * ry };
  });

  let xThumb = $derived(((x - min) / (max - min)));
  let yThumb = $derived(((y - min) / (max - min)));

  function parseAxisInput(raw: string): number | null {
    const n = parseFloat(raw.trim());
    return Number.isFinite(n) ? n : null;
  }

  function onXInput(e: Event) {
    const v = parseAxisInput((e.target as HTMLInputElement).value);
    if (v !== null) emit(v, y);
  }
  function onYInput(e: Event) {
    const v = parseAxisInput((e.target as HTMLInputElement).value);
    if (v !== null) emit(x, v);
  }
</script>

<svelte:window onpointermove={onMove} onpointerup={onUp} onpointercancel={onUp} />

<div class="shape-pad">
  <div class="pad-body">
    <div class="grid">
    <div
      bind:this={padEl}
      class="pad"
      class:dragging={drag === 'pad'}
      style="width: {size}px; height: {size}px;"
      onpointerdown={onPadDown}
      role="application"
      aria-label="Drag to set the radial gradient's width and height"
    >
      <span class="axis axis-h" aria-hidden="true"></span>
      <span class="axis axis-v" aria-hidden="true"></span>
      <svg class="ellipse" viewBox="0 0 {size} {size}" aria-hidden="true">
        <ellipse
          cx={pad.center}
          cy={pad.center}
          rx={Math.max(3, pad.rx)}
          ry={Math.max(3, pad.ry)}
          fill="none"
          stroke="currentColor"
          stroke-width="1"
        />
        <line
          x1={pad.center}
          y1={pad.center}
          x2={pad.handleX}
          y2={pad.handleY}
          stroke="currentColor"
          stroke-width="1"
          stroke-dasharray="2 2"
          opacity="0.4"
        />
      </svg>
      <span
        class="handle"
        class:dragging={drag === 'pad'}
        style="left: {pad.handleX}px; top: {pad.handleY}px;"
        aria-hidden="true"
      ></span>
    </div>

    <div
      bind:this={ySliderEl}
      class="slider slider-v"
      class:dragging={drag === 'y'}
      style="height: {size}px;"
      onpointerdown={onYDown}
      role="slider"
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={y}
      aria-label="Vertical stretch"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); emit(x, y + 0.5); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); emit(x, y - 0.5); }
      }}
    >
      <span class="track" aria-hidden="true"></span>
      <span class="thumb" style="bottom: calc({yThumb * 100}% - 4px);" aria-hidden="true"></span>
    </div>

    <div
      bind:this={xSliderEl}
      class="slider slider-h"
      class:dragging={drag === 'x'}
      style="width: {size}px;"
      onpointerdown={onXDown}
      role="slider"
      aria-orientation="horizontal"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={x}
      aria-label="Horizontal stretch"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); emit(x - 0.5, y); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); emit(x + 0.5, y); }
      }}
    >
      <span class="track" aria-hidden="true"></span>
      <span class="thumb" style="left: calc({xThumb * 100}% - 4px);" aria-hidden="true"></span>
    </div>
    </div>

    <div class="readouts">
      <label class="num-field">
        <span class="num-label">W</span>
        <input
          type="number"
          min={min}
          max={max}
          step="0.1"
          value={x}
          onchange={onXInput}
        />
      </label>
      <label class="num-field">
        <span class="num-label">H</span>
        <input
          type="number"
          min={min}
          max={max}
          step="0.1"
          value={y}
          onchange={onYInput}
        />
      </label>
      <UIPillButton
        variant="secondary"
        size="compact"
        icon="fa-arrows-rotate"
        title="Reset to circle (1 : 1)"
        disabled={x === 1 && y === 1}
        onclick={() => emit(1, 1)}
      />
    </div>
  </div>
</div>

<style>
  /* Two-column body: pad + sliders on the left, W/H/Reset on the right.
     The section header ("Gradient shape") is owned by GradientEditor so it
     can sit on the same baseline as the parent's section label. */
  .shape-pad {
    display: inline-flex;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
  }

  .pad-body {
    display: inline-flex;
    align-items: flex-start;
    gap: var(--ui-space-12);
  }

  /* Pad in the top-left, Y slider snugged to its right edge, X slider
     snugged to its bottom edge. Zero gaps so the rails read as extensions
     of the pad's own axis lines rather than separate widgets. */
  .grid {
    display: grid;
    grid-template-columns: max-content max-content;
    grid-template-rows: max-content max-content;
    gap: 0;
    align-items: start;
  }

  .pad {
    position: relative;
    grid-row: 1;
    grid-column: 1;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    cursor: crosshair;
    color: var(--ui-text-primary);
    touch-action: none;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  }
  .pad:focus-visible { outline: 2px solid var(--ui-text-primary); outline-offset: 2px; }
  .pad.dragging { cursor: grabbing; }

  /* Faint center cross — anchors the gradient origin and shows the user
     where the (1,1) state lives (handle parks right at the cross). */
  .axis {
    position: absolute;
    background: var(--ui-border-low);
    pointer-events: none;
  }
  .axis-h { left: 4px; right: 4px; top: 50%; height: 1px; }
  .axis-v { top: 4px; bottom: 4px; left: 50%; width: 1px; }

  .ellipse {
    position: absolute;
    inset: 0;
    pointer-events: none;
    color: var(--ui-text-primary);
  }

  /* Bigger, brighter dot than v1 + a subtle outer ring on hover so it reads
     as "this is the thing you grab." The dashed line back to center makes
     the relationship between handle position and shape semi-axes legible. */
  .handle {
    position: absolute;
    width: 11px;
    height: 11px;
    margin-left: -5.5px;
    margin-top: -5.5px;
    border-radius: 50%;
    background: var(--ui-text-primary);
    border: 2px solid var(--ui-surface-lowest);
    box-shadow: 0 0 0 1px var(--ui-text-primary), 0 0 6px rgba(255, 255, 255, 0.15);
    cursor: grab;
    pointer-events: none;
    transition: box-shadow var(--ui-transition-fast);
  }
  .pad:hover .handle {
    box-shadow: 0 0 0 1px var(--ui-text-primary), 0 0 10px rgba(255, 255, 255, 0.25);
  }
  .handle.dragging,
  .pad.dragging .handle {
    cursor: grabbing;
    box-shadow: 0 0 0 2px var(--ui-text-primary), 0 0 12px rgba(255, 255, 255, 0.35);
  }

  /* Slider rails. Each rail hugs the pad edge it represents: X under the
     pad's bottom, Y to the right of the pad's right edge. The thumbs are
     small arrow triangles whose tips touch the rail — they read as "this
     points at the value" instead of a dot drifting along the rail. */
  .slider {
    position: relative;
    flex: none;
    cursor: pointer;
    touch-action: none;
  }
  .slider:focus-visible { outline: 2px solid var(--ui-text-primary); outline-offset: 2px; }

  /* Horizontal slider: rail along the very top (flush against the pad's
     bottom border), arrow thumb sits below pointing up at the rail. */
  .slider-h {
    grid-row: 2;
    grid-column: 1;
    height: 14px;
  }
  /* Vertical slider: rail along the very left (flush against the pad's
     right border), arrow thumb sits to the right pointing left at the
     rail. */
  .slider-v {
    grid-row: 1;
    grid-column: 2;
    width: 14px;
  }

  .track {
    position: absolute;
    background: var(--ui-border);
  }
  .slider-h .track { left: 0; right: 0; top: 0; height: 1px; border-radius: 1px; }
  .slider-v .track { top: 0; bottom: 0; left: 0; width: 1px; border-radius: 1px; }

  /* Arrow thumb — CSS triangle. The transparent borders create the legs
     and the colored border creates the tip. We use `border-bottom` to make
     the tip point UP, `border-right` to make it point LEFT. */
  .thumb {
    position: absolute;
    width: 0;
    height: 0;
    pointer-events: none;
  }
  .slider-h .thumb {
    top: 2px;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-bottom: 6px solid var(--ui-text-primary);
  }
  .slider-v .thumb {
    left: 2px;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-right: 6px solid var(--ui-text-primary);
  }
  .slider.dragging .thumb {
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.35));
  }


  /* Vertical stack beside the pad: W input, H input, Reset. Right-aligned
     so the input field's right edges and the Reset button's right edge all
     share a single vertical line — reads as a tidy aligned column. */
  .readouts {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--ui-space-6);
  }

  .num-field {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    color: var(--ui-text-secondary);
  }
  .num-label {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
  }
  .num-field input {
    width: 3.25rem;
    padding: var(--ui-space-2) var(--ui-space-6);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
    text-align: right;
  }
  .num-field input::-webkit-outer-spin-button,
  .num-field input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }


</style>
