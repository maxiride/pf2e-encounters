<script lang="ts">
  import { stopPropagation } from 'svelte/legacy';

  import {
    type CurveAnchor, type CurveConfig,
    CURVE_H, CURVE_PAD_Y, CURVE_Y_PAD,
    isCornerAnchor, curveXToSvg, curveYToSvg, svgToX, svgToY,
    evalBezier, buildCurvePath, curveTemplates,
    serializeCurve, deserializeCurve,
  } from './curveEngine';
  import UIPillButton from './UIPillButton.svelte';

  interface Props {
    anchors: CurveAnchor[];
    cfg: CurveConfig;
    stepCount: number;
    padX?: number;
    offset?: number;
    defaultAnchors?: CurveAnchor[] | null;
    lockedAnchorIndex?: number | null;
    onAnchorsChange?: (anchors: CurveAnchor[]) => void;
    onOffsetChange?: (offset: number) => void;
  }

  let {
    anchors,
    cfg,
    stepCount,
    padX = 0,
    offset = 0,
    defaultAnchors = null,
    lockedAnchorIndex = null,
    onAnchorsChange = () => {},
    onOffsetChange = () => {}
  }: Props = $props();

  function resetToDefault() {
    if (!defaultAnchors) return;
    onAnchorsChange(defaultAnchors.map(a => ({ ...a })));
    onOffsetChange(0);
  }

  const CURVE_W_DEFAULT = 720;
  let svgEl: SVGSVGElement | null = $state(null);
  let dims = $state(CURVE_W_DEFAULT);
  let shiftActive = $state(false);

  const clipId = `curve-clip-${Math.random().toString(36).slice(2, 8)}`;

  let w = $derived(dims);
  let offsetPx = $derived(-(offset / ((cfg.yMax - cfg.yMin) * (1 + 2 * CURVE_Y_PAD))) * (CURVE_H - 2 * CURVE_PAD_Y));

  function stepToX(index: number): number {
    return stepCount > 1 ? (index / (stepCount - 1)) * 100 : 50;
  }

  function dynamicViewBox(node: SVGSVGElement) {
    const update = () => {
      const cw = node.clientWidth;
      const ch = node.clientHeight;
      if (cw > 0 && ch > 0) {
        const newW = CURVE_H * (cw / ch);
        if (Math.abs(dims - newW) > 0.5) {
          dims = newW;
        }
      }
    };
    const ro = new ResizeObserver(update);
    ro.observe(node);
    update();
    return { destroy() { ro.disconnect(); } };
  }

  function svgCoords(e: MouseEvent | PointerEvent): { x: number; y: number } {
    if (!svgEl) return { x: 0, y: 0 };
    const rect = svgEl.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (w / rect.width),
      y: (e.clientY - rect.top) * (CURVE_H / rect.height),
    };
  }

  // --- Anchor drag ---

  type DragTarget = {
    kind: 'anchor' | 'handleIn' | 'handleOut';
    index: number;
    breakHandle: boolean;
  };

  let drag: DragTarget | null = null;

  function handlePointerDown(e: PointerEvent, target: Omit<DragTarget, 'breakHandle'>) {
    if (e.altKey && target.kind === 'anchor') {
      if (target.index === lockedAnchorIndex) return; // can't delete locked anchor
      e.stopPropagation();
      removePoint(target.index);
      return;
    }
    const isHandle = target.kind !== 'anchor';
    const a = anchors[target.index];
    const alreadyBroken = isHandle && a && (Math.abs(a.inDx + a.outDx) > 0.01 || Math.abs(a.inDy + a.outDy) > 0.01);
    drag = { ...target, breakHandle: isHandle && (e.altKey || alreadyBroken) };
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
  }

  function handlePointerMove(e: PointerEvent) {
    if (!drag) return;
    const { kind, index: idx, breakHandle } = drag;
    const { x, y } = svgCoords(e);
    const newX = svgToX(x, w, padX);
    const newY = Math.round(svgToY(y, cfg));
    const updated = [...anchors];

    if (kind === 'anchor') {
      if (idx === lockedAnchorIndex) return; // locked: no x/y dragging
      let ax = Math.round(newX);
      if (idx === 0) ax = 0;
      else if (idx === updated.length - 1) ax = 100;
      else ax = Math.max(updated[idx - 1].x + 1, Math.min(updated[idx + 1].x - 1, ax));
      updated[idx] = { ...updated[idx], x: ax, y: newY };
    } else if (kind === 'handleOut') {
      const a = updated[idx];
      const dx = newX - a.x, dy = newY - a.y;
      updated[idx] = breakHandle
        ? { ...a, outDx: dx, outDy: dy }
        : { ...a, outDx: dx, outDy: dy, inDx: -dx, inDy: -dy };
    } else {
      const a = updated[idx];
      const dx = newX - a.x, dy = newY - a.y;
      updated[idx] = breakHandle
        ? { ...a, inDx: dx, inDy: dy }
        : { ...a, inDx: dx, inDy: dy, outDx: -dx, outDy: -dy };
    }
    onAnchorsChange(updated);
  }

  function handlePointerUp() {
    drag = null;
  }

  // --- Insert point ---

  function insertPointOnPath(e: MouseEvent) {
    e.stopPropagation();
    const { x } = svgCoords(e);
    const clickX = svgToX(x, w, padX);

    if (anchors.some(p => Math.abs(p.x - clickX) < 4)) return;

    let seg = 0;
    for (let i = 0; i < anchors.length - 1; i++) {
      if (clickX >= anchors[i].x && clickX <= anchors[i + 1].x) { seg = i; break; }
    }

    const a0 = anchors[seg], a1 = anchors[seg + 1];
    const p0x = a0.x, p0y = a0.y;
    const c0x = a0.x + a0.outDx, c0y = a0.y + a0.outDy;
    const c1x = a1.x + a1.inDx, c1y = a1.y + a1.inDy;
    const p1x = a1.x, p1y = a1.y;

    let lo = 0, hi = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (evalBezier(p0x, p0y, c0x, c0y, c1x, c1y, p1x, p1y, mid).x < clickX) lo = mid; else hi = mid;
    }
    const t = (lo + hi) / 2;

    const q0x = p0x + t * (c0x - p0x), q0y = p0y + t * (c0y - p0y);
    const q1x = c0x + t * (c1x - c0x), q1y = c0y + t * (c1y - c0y);
    const q2x = c1x + t * (p1x - c1x), q2y = c1y + t * (p1y - c1y);
    const r0x = q0x + t * (q1x - q0x), r0y = q0y + t * (q1y - q0y);
    const r1x = q1x + t * (q2x - q1x), r1y = q1y + t * (q2y - q1y);
    const mx = r0x + t * (r1x - r0x), my = r0y + t * (r1y - r0y);

    const updated = [...anchors];
    updated[seg] = { ...updated[seg], outDx: q0x - p0x, outDy: q0y - p0y };
    updated[seg + 1] = { ...updated[seg + 1], inDx: q2x - p1x, inDy: q2y - p1y };
    updated.splice(seg + 1, 0, {
      x: Math.round(mx), y: Math.round(my),
      inDx: r0x - mx, inDy: r0y - my, outDx: r1x - mx, outDy: r1y - my,
    });
    onAnchorsChange(updated);
  }

  function toggleAnchorSmooth(index: number) {
    const a = anchors[index];
    const updated = [...anchors];
    if (isCornerAnchor(a)) {
      updated[index] = { ...a, inDx: -15, inDy: 0, outDx: 15, outDy: 0 };
    } else {
      updated[index] = { ...a, inDx: 0, inDy: 0, outDx: 0, outDy: 0 };
    }
    onAnchorsChange(updated);
  }

  function removePoint(index: number) {
    if (anchors.length <= 2) return;
    onAnchorsChange(anchors.filter((_, i) => i !== index));
  }

  function applyTemplate(tpl: typeof curveTemplates[0]) {
    onAnchorsChange(tpl.anchors(cfg));
  }

  // --- Shift (vertical offset) drag ---

  let shiftDrag: { startClientY: number; startOffset: number; pxPerUnit: number } | null = null;

  function handleShiftPointerDown(e: PointerEvent) {
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const pxPerUnit = rect.height / ((cfg.yMax - cfg.yMin) * (1 + 2 * CURVE_Y_PAD));
    shiftDrag = {
      startClientY: e.clientY,
      startOffset: offset,
      pxPerUnit,
    };
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
  }

  function handleShiftPointerMove(e: PointerEvent) {
    if (!shiftDrag) return;
    const deltaY = shiftDrag.startClientY - e.clientY;
    const deltaValue = deltaY / shiftDrag.pxPerUnit;
    onOffsetChange(Math.round(shiftDrag.startOffset + deltaValue));
  }

  function handleShiftPointerUp() {
    shiftDrag = null;
  }

  // --- Clipboard (system clipboard for cross-editor paste) ---

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(serializeCurve(anchors, offset));
    } catch {
      // clipboard write failed silently
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const data = deserializeCurve(text);
      if (!data) return;
      onAnchorsChange(data.anchors.map(a => ({ ...a })));
      onOffsetChange(data.offset);
    } catch {
      // clipboard read failed or permission denied
    }
  }
</script>

<div class="curve-panel">
  <div class="curve-panel-header">
    <span class="curve-panel-label">{cfg.label}</span>
    <div class="curve-help">
      <button class="curve-help-badge" type="button" aria-label="Curve editor help">
        <i class="fas fa-circle-info" aria-hidden="true"></i>
      </button>
      <div class="curve-help-popover" role="tooltip">
        <div><strong>Click</strong> path to add a point</div>
        <div><strong>&#x2325; Click</strong> a point to remove</div>
        <div><strong>Double-click</strong> a point to toggle smooth/corner</div>
      </div>
    </div>
  </div>
  <div class="curve-container">
    <div class="curve-chart-overlay">
      <UIPillButton
        size="compact"
        variant={shiftActive ? 'default' : 'outline'}
        title="Vertical offset"
        onclick={() => shiftActive = !shiftActive}
      >
        <svg viewBox="0 0 12 20" class="curve-tool-icon">
          <path d="M6,2 L10,7 L7,7 L7,13 L10,13 L6,18 L2,13 L5,13 L5,7 L2,7 Z" />
        </svg>
        <span>Offset{offset !== 0 ? ` ${offset > 0 ? '+' : ''}${offset}` : ''}</span>
      </UIPillButton>
    </div>
    <svg
      bind:this={svgEl}
      class="curve-svg"
      viewBox="0 0 {w} {CURVE_H}"
      use:dynamicViewBox
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={w} height={CURVE_H} />
        </clipPath>
      </defs>

      <!-- Out-of-range shading -->
      <rect x="0" y="0" width={w} height={curveYToSvg(cfg.yMax, cfg)} class="curve-out-of-range" />
      <rect x="0" y={curveYToSvg(cfg.yMin, cfg)} width={w} height={CURVE_H - curveYToSvg(cfg.yMin, cfg)} class="curve-out-of-range" />

      <!-- Step divider lines -->
      {#each Array(stepCount) as _, si}
        <line
          x1={curveXToSvg(stepToX(si), w, padX)}
          y1={CURVE_PAD_Y}
          x2={curveXToSvg(stepToX(si), w, padX)}
          y2={CURVE_H - CURVE_PAD_Y}
          class="curve-step-line"
        />
      {/each}

      <!-- Horizontal grid lines -->
      {#each cfg.gridLines as gl}
        <line x1={padX} y1={curveYToSvg(gl, cfg)} x2={w - padX} y2={curveYToSvg(gl, cfg)} class="curve-grid" />
      {/each}
      {#each cfg.dashedLines as dl}
        <line x1={padX} y1={curveYToSvg(dl, cfg)} x2={w - padX} y2={curveYToSvg(dl, cfg)} class="curve-grid dashed" />
      {/each}

      <!-- Curve content group — offset vertically, clipped -->
      <g transform="translate(0,{offsetPx})" clip-path="url(#{clipId})">
        {#if shiftActive}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <rect
            x="0" y={-CURVE_H} width={w} height={CURVE_H * 3}
            class="shift-overlay"
            onpointerdown={handleShiftPointerDown}
            onpointermove={handleShiftPointerMove}
            onpointerup={handleShiftPointerUp}
          />
        {:else}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <path
            d={buildCurvePath(anchors, cfg, w, padX)}
            class="curve-hit"
            onclick={insertPointOnPath}
          />
        {/if}

        <!-- Visible curve path -->
        <path d={buildCurvePath(anchors, cfg, w, padX)} class="curve-line" />

        <!-- Bezier tangent handles -->
        {#if !shiftActive}
          {#each anchors as pt, i}
            {#if i > 0 && !isCornerAnchor(pt)}
              <line
                x1={curveXToSvg(pt.x, w, padX)} y1={curveYToSvg(pt.y, cfg)}
                x2={curveXToSvg(pt.x + pt.inDx, w, padX)} y2={curveYToSvg(pt.y + pt.inDy, cfg)}
                class="handle-line"
              />
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <circle
                cx={curveXToSvg(pt.x + pt.inDx, w, padX)} cy={curveYToSvg(pt.y + pt.inDy, cfg)}
                r="3.5" class="handle-grip"
                onpointerdown={(e) => handlePointerDown(e, { kind: 'handleIn', index: i })}
                onpointermove={handlePointerMove}
                onpointerup={handlePointerUp}
              />
            {/if}
            {#if i < anchors.length - 1 && !isCornerAnchor(pt)}
              <line
                x1={curveXToSvg(pt.x, w, padX)} y1={curveYToSvg(pt.y, cfg)}
                x2={curveXToSvg(pt.x + pt.outDx, w, padX)} y2={curveYToSvg(pt.y + pt.outDy, cfg)}
                class="handle-line"
              />
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <circle
                cx={curveXToSvg(pt.x + pt.outDx, w, padX)} cy={curveYToSvg(pt.y + pt.outDy, cfg)}
                r="3.5" class="handle-grip"
                onpointerdown={(e) => handlePointerDown(e, { kind: 'handleOut', index: i })}
                onpointermove={handlePointerMove}
                onpointerup={handlePointerUp}
              />
            {/if}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            {#if i === lockedAnchorIndex}
              <path
                d="M{curveXToSvg(pt.x, w, padX)},{curveYToSvg(pt.y, cfg) - 6} l5,6 l-5,6 l-5,-6 Z"
                class="curve-handle locked"
              />
            {:else if isCornerAnchor(pt)}
              <rect
                x={curveXToSvg(pt.x, w, padX) - 4} y={curveYToSvg(pt.y, cfg) - 4}
                width="8" height="8"
                class="curve-handle corner"
                onpointerdown={(e) => handlePointerDown(e, { kind: 'anchor', index: i })}
                onpointermove={handlePointerMove}
                onpointerup={handlePointerUp}
                ondblclick={stopPropagation(() => toggleAnchorSmooth(i))}
              />
            {:else}
              <circle
                cx={curveXToSvg(pt.x, w, padX)} cy={curveYToSvg(pt.y, cfg)}
                r="5" class="curve-handle"
                onpointerdown={(e) => handlePointerDown(e, { kind: 'anchor', index: i })}
                onpointermove={handlePointerMove}
                onpointerup={handlePointerUp}
                ondblclick={stopPropagation(() => toggleAnchorSmooth(i))}
              />
            {/if}
          {/each}
        {/if}
      </g>
    </svg>
  </div>
  <div class="curve-toolbar">
    <div class="curve-toolbar-group">
      <UIPillButton size="compact" variant="outline" title="Copy curve" onclick={copyToClipboard}>Copy</UIPillButton>
      <UIPillButton size="compact" variant="outline" title="Paste curve" onclick={pasteFromClipboard}>Paste</UIPillButton>
    </div>
    <div class="curve-templates">
      {#each curveTemplates as tpl}
        <button
          class="curve-template-btn"
          type="button"
          title={tpl.name}
          onclick={() => applyTemplate(tpl)}
        >
          <svg viewBox="0 0 20 12" class="curve-template-icon">
            <path d={tpl.icon} />
          </svg>
        </button>
      {/each}
    </div>
    <div class="curve-toolbar-group">
      {#if defaultAnchors}
        <UIPillButton size="compact" variant="outline" title="Reset to default" onclick={resetToDefault}>
          Reset
        </UIPillButton>
      {/if}
    </div>
  </div>
</div>

<style>
  .curve-panel {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .curve-panel-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
  }

  .curve-panel-label {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
  }

  .curve-container {
    position: relative;
    width: 100%;
    height: 250px;
    box-sizing: border-box;
  }

  .curve-chart-overlay {
    position: absolute;
    inset: var(--ui-space-8);
    display: flex;
    align-items: flex-end;
    pointer-events: none;
  }

  .curve-chart-overlay > :global(*) {
    pointer-events: auto;
  }

  .curve-help {
    position: relative;
    margin-left: auto;
  }

  .curve-help-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--ui-text-muted);
    cursor: help;
    border-radius: var(--ui-radius-full);
    transition: color var(--ui-transition-fast, 120ms ease);
  }

  .curve-help-badge:hover,
  .curve-help-badge:focus-visible {
    color: var(--ui-text-primary);
    outline: none;
  }

  .curve-help-badge i {
    font-size: var(--ui-font-size-md);
  }

  .curve-help-popover {
    position: absolute;
    top: calc(100% + var(--ui-space-4));
    right: 0;
    display: grid;
    gap: var(--ui-space-4);
    min-width: 14rem;
    padding: var(--ui-space-8) var(--ui-space-12);
    background: var(--ui-surface-highest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    line-height: 1.4;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    opacity: 0;
    transform: translateY(-2px);
    pointer-events: none;
    transition:
      opacity var(--ui-transition-fast, 120ms ease),
      transform var(--ui-transition-fast, 120ms ease);
    z-index: 2;
  }

  .curve-help-popover strong {
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-medium);
  }

  .curve-help:hover .curve-help-popover,
  .curve-help:focus-within .curve-help-popover {
    opacity: 1;
    transform: translateY(0);
  }

  .curve-svg {
    width: 100%;
    height: 100%;
    background: transparent;
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    cursor: crosshair;
    display: block;
  }

  .curve-out-of-range {
    fill: white;
    opacity: 0.04;
    pointer-events: none;
  }

  .curve-grid {
    stroke: var(--ui-border-low);
    stroke-width: 0.5;
    vector-effect: non-scaling-stroke;
  }

  .curve-grid.dashed {
    stroke-dasharray: 3 3;
  }

  .curve-step-line {
    stroke: var(--ui-border-low);
    stroke-width: 0.5;
    vector-effect: non-scaling-stroke;

  }

  .shift-overlay {
    fill: transparent;
    cursor: ns-resize;
    touch-action: none;
  }

  .curve-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 12;
    cursor: copy;
    pointer-events: stroke;
    vector-effect: non-scaling-stroke;
  }

  .curve-line {
    fill: none;
    stroke: var(--ui-text-secondary);
    stroke-width: 1.5;
    pointer-events: none;
    vector-effect: non-scaling-stroke;
  }

  .handle-line {
    stroke: var(--ui-text-muted);
    stroke-width: 0.75;
    pointer-events: none;
    vector-effect: non-scaling-stroke;
  }

  .handle-grip {
    fill: var(--ui-surface-high);
    stroke: var(--ui-text-tertiary);
    stroke-width: 1.5px;
    paint-order: stroke fill;
    cursor: grab;
    touch-action: none;
    vector-effect: non-scaling-stroke;
  }

  .handle-grip:hover {
    fill: var(--ui-text-accent);
    stroke: var(--ui-text-primary);
  }

  .handle-grip:active {
    cursor: grabbing;
  }

  .curve-handle {
    fill: var(--ui-surface-highest);
    stroke: var(--ui-text-primary);
    stroke-width: 2px;
    paint-order: stroke fill;
    cursor: grab;
    touch-action: none;
    vector-effect: non-scaling-stroke;
  }

  .curve-handle:hover {
    fill: var(--ui-text-accent);
  }

  .curve-handle.corner {
    rx: 1;
  }

  .curve-handle:active {
    cursor: grabbing;
  }

  .curve-handle.locked {
    fill: var(--ui-toggle);
    stroke: none;
    cursor: default;
  }

  .curve-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--ui-space-8);
    padding-top: var(--ui-space-2);
  }

  .curve-toolbar-group {
    display: flex;
    align-items: center;
    gap: var(--ui-space-4);
    flex-wrap: wrap;
  }

  .curve-tool-icon {
    width: 0.625rem;
    height: 1rem;
  }

  .curve-tool-icon path {
    fill: currentColor;
  }

  .curve-templates {
    display: flex;
    gap: var(--ui-space-2);
  }

  .curve-template-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1rem;
    padding: 0;
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    background: var(--ui-surface-lowest);
    cursor: pointer;
  }

  .curve-template-btn:hover {
    border-color: var(--ui-border-high);
    background: var(--ui-surface-high);
  }

  .curve-template-icon {
    width: 100%;
    height: 100%;
  }

  .curve-template-icon path {
    fill: none;
    stroke: var(--ui-text-tertiary);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .curve-template-btn:hover .curve-template-icon path {
    stroke: var(--ui-text-primary);
  }
</style>
