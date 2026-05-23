<script lang="ts">
  /**
   * Compact rotary control for an angle (0–360°). Drag the dial to rotate;
   * type into the input for an exact value. The internal angle uses the CSS
   * gradient convention (0deg = pointing up, increasing clockwise) so the
   * displayed line orients the way the gradient axis will paint.
   */
  interface Props {
    value?: number;
    label?: string;
    size?: number;
    /** 'horizontal' (default) lays the label, dial, input, and degree mark on a
     *  single line. 'vertical' stacks the dial above the input — used when the
     *  dial sits in its own column with a section header providing the label. */
    orientation?: 'horizontal' | 'vertical';
    onchange?: (payload: { value: number }) => void;
  }

  let { value = $bindable(0), label = 'Angle', size = 44, orientation = 'horizontal', onchange }: Props = $props();

  let dialEl: HTMLDivElement | undefined = $state();
  let dragging = $state(false);

  function normalize(deg: number): number {
    const r = Math.round(deg) % 360;
    return r < 0 ? r + 360 : r;
  }

  function emit(next: number) {
    const n = normalize(next);
    if (n === value) return;
    value = n;
    onchange?.({ value: n });
  }

  function angleFromEvent(e: PointerEvent): number {
    const rect = dialEl!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    // atan2 yields 0 at +x axis, increasing counterclockwise. Convert to the
    // CSS gradient convention (0 at +y up, clockwise positive).
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  }

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    dialEl!.setPointerCapture(e.pointerId);
    emit(angleFromEvent(e));
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    emit(angleFromEvent(e));
  }
  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    dialEl!.releasePointerCapture(e.pointerId);
  }

  function onInputChange(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    if (Number.isFinite(v)) emit(v);
  }

  let indicatorTransform = $derived(`rotate(${value}deg)`);
</script>

<div class="angle-dial-row" class:vertical={orientation === 'vertical'}>
  {#if label && orientation === 'horizontal'}
    <span class="dial-label">{label}:</span>
  {/if}
  <div
    bind:this={dialEl}
    class="dial"
    class:dragging
    style="width: {size}px; height: {size}px;"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    role="slider"
    aria-valuemin="0"
    aria-valuemax="360"
    aria-valuenow={value}
    aria-label={label}
    tabindex="0"
    onkeydown={(e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); emit(value - 1); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); emit(value + 1); }
    }}
  >
    <div class="indicator" style="transform: {indicatorTransform}"></div>
    <div class="hub"></div>
  </div>
  <div class="num-row" style={orientation === 'vertical' ? `width: ${size}px;` : ''}>
    <input
      class="num"
      type="number"
      min="0"
      max="360"
      step="1"
      value={value}
      onchange={onInputChange}
    />
    <span class="suffix">°</span>
  </div>
</div>

<style>
  .angle-dial-row {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }
  /* Stacked layout: dial centered, input + degree mark on the row below. Used
     when the dial sits in its own grid column with an external section label. */
  .angle-dial-row.vertical {
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-6);
  }

  .num-row {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  /* Vertical mode: lock the row to the dial's width and overlay the degree
     mark inside the input's right padding so the input fills the column
     instead of the row growing past the dial. */
  .angle-dial-row.vertical .num-row {
    position: relative;
    display: block;
  }
  .angle-dial-row.vertical .num {
    width: 100%;
    box-sizing: border-box;
    padding-right: 1.25rem;
  }
  .angle-dial-row.vertical .suffix {
    position: absolute;
    right: var(--ui-space-6);
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .dial-label {
    user-select: none;
  }

  .dial {
    position: relative;
    border-radius: 50%;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border);
    cursor: grab;
    flex: none;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  }

  .dial:focus-visible {
    outline: 2px solid var(--ui-border-focus, var(--color-brand-500));
    outline-offset: 2px;
  }

  .dial.dragging {
    cursor: grabbing;
  }

  /* Indicator: a 1px-wide line from center to edge. Origin is the bottom
     center so rotating by N degrees points the line N degrees clockwise from
     12 o'clock, matching CSS `linear-gradient(Ndeg, ...)`. */
  .indicator {
    position: absolute;
    left: 50%;
    bottom: 50%;
    width: 2px;
    height: 50%;
    margin-left: -1px;
    background: var(--ui-text-primary);
    border-radius: 1px;
    transform-origin: 50% 100%;
    pointer-events: none;
  }

  .hub {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 4px;
    height: 4px;
    margin-left: -2px;
    margin-top: -2px;
    border-radius: 50%;
    background: var(--ui-text-primary);
    pointer-events: none;
  }

  .num {
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

  .num::-webkit-outer-spin-button,
  .num::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  .suffix {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    user-select: none;
  }
</style>
