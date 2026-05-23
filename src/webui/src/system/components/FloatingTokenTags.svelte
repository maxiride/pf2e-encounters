<script module lang="ts">
  export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

  export type TagControl = 'surface' | 'radius' | 'border-color' | 'border-width' | 'font-family';

  /**
   * Where the kite string ties to the box. `inside` anchors are % of the
   * box's footprint; edge anchors are `pos` 0..100 along the named side.
   */
  export type Anchor =
    | { side: AnchorSide; pos: number }
    | { side: 'inside'; x: number; y: number };

  export interface FloatingTag {
    icon?: string;
    /** Initial value; typically a CSS-variable name. */
    label: string;
    /** Tag center, in % of the stage. */
    top: number;
    left: number;
    /** Bob delay, seconds. Negative values offset the start. */
    delay?: number;
    /** Static tilt, degrees. */
    rotate?: number;
    anchor: Anchor;
    /** Visual property of the central box this tag drives. */
    controls?: TagControl;
    /** `top` chip sits above the box and opens down; `bottom` mirrors. */
    placement?: 'top' | 'bottom';
    /** `right-cap` pivots the tilt around the chip's right cap. */
    pivot?: 'center' | 'right-cap';
  }
</script>

<script lang="ts">
  import MenuSelect from './MenuSelect.svelte';
  import { SvelteMap } from 'svelte/reactivity';
  // `.ftt-tag` is hand-rolled (not Badge) so editing badge-* tokens doesn't
  // repaint the playground. The dropdown uses MenuSelect on purpose.
  import './FloatingTokenTags.css';

  interface Props {
    tags?: FloatingTag[];
    duration?: number;
    distance?: number;
    boxSize?: { w: number; h: number };
    autoplay?: boolean;
  }

  const controlLabels: Record<TagControl, string> = {
    'surface':      'Surface color',
    'radius':       'Corner radius',
    'border-color': 'Border color',
    'border-width': 'Border width',
    'font-family':  'Font family',
  };

  // Surfaces use the `-high` step and borders the `-strong` step so the box
  // reads as the figure against the dark canvas. Picks span the hue wheel;
  // `special` is too close to the background to pull weight here.
  const valueOptions: Record<TagControl, string[]> = {
    'surface':      ['--surface-brand-high',  '--surface-accent-high', '--surface-success-high', '--surface-info-high'],
    'radius':       ['--radius-none',         '--radius-lg',           '--radius-2xl',           '--radius-full'],
    'border-color': ['--border-brand-strong', '--border-accent-strong','--border-success-strong','--border-info-strong'],
    'border-width': ['--border-width-1',      '--border-width-2',      '--border-width-3',       '--border-width-5'],
    'font-family':  ['--font-display',        '--font-sans',           '--font-serif',           '--font-mono'],
  };

  const defaultTags: FloatingTag[] = [
    {
      icon: 'fas fa-fill-drip',
      label: '--surface-brand-high',
      top: 15, left: 20, delay: 0,    rotate: 3,
      anchor: { side: 'inside', x: 10, y: 40 },
      controls: 'surface',
      placement: 'top',
      pivot: 'right-cap',
    },
    {
      icon: 'fas fa-font',
      label: '--font-display',
      top: 5, left: 45, delay: -0.9, rotate: 2,
      anchor: { side: 'inside', x: 78, y: 28 },
      controls: 'font-family',
      placement: 'top',
    },
    {
      icon: 'fa-solid fa-bezier-curve',
      label: '--radius-2xl',
      top: 23, left: 75, delay: -1.8, rotate: 2,
      anchor: { side: 'top', pos: 100 },
      controls: 'radius',
      placement: 'top',
    },
    {
      icon: 'fas fa-paint-roller',
      label: '--border-brand-strong',
      top: 79, left: 72, delay: -3.6, rotate: -2,
      anchor: { side: 'bottom', pos: 75 },
      controls: 'border-color',
      placement: 'top',
    },
    {
      icon: 'fas fa-grip-lines',
      label: '--border-width-3',
      top: 79, left: 28, delay: -5.2, rotate: -4,
      anchor: { side: 'bottom', pos: 25 },
      controls: 'border-width',
      placement: 'top',
    },
  ];

  let {
    tags = defaultTags,
    duration = 7,
    distance = 8,
    boxSize = { w: 14, h: 11 },
    autoplay = true,
  }: Props = $props();

  // Two override layers, deliberately desynchronised: `overrides` commits at
  // selection (drives the tag label); `boxOverrides` commits at impact
  // (drives the box's style) so the box swaps in sync with the bloop.
  const defaultLabels = $derived(tags.map(t => t.label));
  let overrides = $state<Record<number, string>>({});
  let boxOverrides = $state<Record<number, string>>({});
  const currentValues = $derived(defaultLabels.map((d, i) => overrides[i] ?? d));
  const boxValues     = $derived(defaultLabels.map((d, i) => boxOverrides[i] ?? d));

  let openIdx = $state<number | null>(null);
  let strobeIdx = $state<number | null>(null);
  let flashingIdx = $state<number | null>(null);
  let bloopActive = $state(false);

  let dragOverrides = $state<Record<number, { top: number; left: number }>>({});
  let draggingIdx = $state<number | null>(null);
  const DRAG_THRESHOLD_PX = 4;
  const dragStart = { px: 0, py: 0, tagIdx: -1, moved: false };

  function tagTop(i: number): number  { return dragOverrides[i]?.top  ?? tags[i].top; }
  function tagLeft(i: number): number { return dragOverrides[i]?.left ?? tags[i].left; }

  type BallState = { startedAt: number; duration: number; pendingValue: string };
  const ballStates = new SvelteMap<number, BallState>();
  // `$state` so `bind:this={ballEls[i]}` is a reactive binding target.
  const ballEls: HTMLSpanElement[] = $state([]);

  let stageEl: HTMLDivElement | undefined = $state();
  let boxEl: HTMLDivElement | undefined = $state();
  const tagEls: HTMLSpanElement[] = $state([]);
  const lineEls: SVGLineElement[] = $state([]);
  const knotEls: HTMLSpanElement[] = $state([]);

  function anchorPoint(
    anchor: Anchor,
    cx = 50,
    cy = 50,
    w = boxSize.w,
    h = boxSize.h,
  ): { x: number; y: number } {
    const halfW = w / 2, halfH = h / 2;
    if (anchor.side === 'inside') {
      return {
        x: cx - halfW + (anchor.x / 100) * w,
        y: cy - halfH + (anchor.y / 100) * h,
      };
    }
    const t = anchor.pos / 100;
    switch (anchor.side) {
      case 'top':    return { x: cx - halfW + t * w, y: cy - halfH };
      case 'bottom': return { x: cx - halfW + t * w, y: cy + halfH };
      case 'left':   return { x: cx - halfW,         y: cy - halfH + t * h };
      case 'right':  return { x: cx + halfW,         y: cy - halfH + t * h };
    }
  }

  // Reads `boxValues` (not `currentValues`) so the box repaints at impact.
  function resolveControl(name: TagControl): string | undefined {
    const idx = tags.findIndex(t => t.controls === name);
    return idx >= 0 ? boxValues[idx] : undefined;
  }
  const surfaceVar     = $derived(resolveControl('surface'));
  const radiusVar      = $derived(resolveControl('radius'));
  const borderColorVar = $derived(resolveControl('border-color'));
  const borderWidthVar = $derived(resolveControl('border-width'));
  const fontFamilyVar  = $derived(resolveControl('font-family'));

  function asVar(name: string | undefined): string | undefined {
    return name ? `var(${name})` : undefined;
  }

  // Kite strings and energy balls are recomputed each frame from the box's
  // measured rect so intrinsic sizing drives anchor placement.
  function syncFrame() {
    if (!stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();
    if (stageRect.width === 0 || stageRect.height === 0) return;

    let boxCx = 50, boxCy = 50;
    let boxW = boxSize.w, boxH = boxSize.h;
    if (boxEl) {
      const br = boxEl.getBoundingClientRect();
      if (br.width > 0 && br.height > 0) {
        boxCx = ((br.left + br.width / 2) - stageRect.left) / stageRect.width * 100;
        boxCy = ((br.top  + br.height / 2) - stageRect.top)  / stageRect.height * 100;
        boxW  = (br.width  / stageRect.width)  * 100;
        boxH  = (br.height / stageRect.height) * 100;
      }
    }

    const now = performance.now();

    for (let i = 0; i < tags.length; i++) {
      const tagEl = tagEls[i];
      const lineEl = lineEls[i];
      if (!tagEl || !lineEl) continue;

      // Tag endpoint: center of the pill's rounded cap on the box-facing side.
      const pill = tagEl.querySelector('.ftt-tag') as HTMLElement | null;
      const target = (pill ?? tagEl) as HTMLElement;
      const r = target.getBoundingClientRect();

      let radius = 0;
      if (pill) {
        const cs = getComputedStyle(pill);
        const raw = parseFloat(cs.borderTopLeftRadius || '0') || 0;
        radius = Math.min(raw, r.height / 2);
      }

      const onRight = tags[i].left > 50;
      const px = onRight ? r.left + radius : r.right - radius;
      const py = r.top + r.height / 2;

      const x1 = (px - stageRect.left) / stageRect.width * 100;
      const y1 = (py - stageRect.top)  / stageRect.height * 100;

      lineEl.setAttribute('x1', x1.toFixed(3));
      lineEl.setAttribute('y1', y1.toFixed(3));

      const a = anchorPoint(tags[i].anchor, boxCx, boxCy, boxW, boxH);
      lineEl.setAttribute('x2', a.x.toFixed(3));
      lineEl.setAttribute('y2', a.y.toFixed(3));
      const knotEl = knotEls[i];
      if (knotEl) {
        knotEl.style.left = `${a.x.toFixed(3)}%`;
        knotEl.style.top  = `${a.y.toFixed(3)}%`;
      }

      const ballEl = ballEls[i];
      const state = ballStates.get(i);
      if (!ballEl) continue;
      if (!state) {
        ballEl.style.opacity = '0';
        continue;
      }
      const elapsed = now - state.startedAt;
      const t = Math.min(1, elapsed / state.duration);
      if (t >= 1) {
        // Commit at impact so the box's appearance changes with the bloop.
        boxOverrides = { ...boxOverrides, [i]: state.pendingValue };
        ballStates.delete(i);
        ballEl.style.opacity = '0';
        triggerBloop();
        continue;
      }
      const x2 = parseFloat(lineEl.getAttribute('x2') || '0');
      const y2 = parseFloat(lineEl.getAttribute('y2') || '0');
      const eased = 1 - Math.pow(1 - t, 3);
      const bx = x1 + (x2 - x1) * eased;
      const by = y1 + (y2 - y1) * eased;
      ballEl.style.left = `${bx.toFixed(3)}%`;
      ballEl.style.top  = `${by.toFixed(3)}%`;
      ballEl.style.opacity = '1';
    }
  }

  $effect(() => {
    let rafId = 0;
    const loop = () => {
      syncFrame();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  });

  function pickValue(i: number, value: string) {
    openIdx = null;
    strobeIdx = null;
    overrides = { ...overrides, [i]: value };
    flashingIdx = i;
    window.setTimeout(() => {
      if (flashingIdx === i) flashingIdx = null;
    }, 500);
    ballStates.set(i, { startedAt: performance.now(), duration: 520, pendingValue: value });
  }

  function triggerBloop() {
    bloopActive = true;
    window.setTimeout(() => { bloopActive = false; }, 480);
  }

  // Any click pauses auto-cycle for at least this long.
  const USER_HOLD_MS = 4000;
  let lastUserActionAt = 0;
  function noteUserAction() {
    lastUserActionAt = performance.now();
  }

  function clickTag(i: number) {
    if (!tags[i].controls) return;
    noteUserAction();
    openIdx = openIdx === i ? null : i;
  }

  function userPick(i: number, value: string) {
    // The matching dropdown item is also rendered disabled; this is a safety net.
    if (currentValues[i] === value) return;
    noteUserAction();
    pickValue(i, value);
  }

  function onTagPointerDown(i: number, e: PointerEvent) {
    dragStart.px = e.clientX;
    dragStart.py = e.clientY;
    dragStart.tagIdx = i;
    dragStart.moved = false;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onTagPointerMove(i: number, e: PointerEvent) {
    if (dragStart.tagIdx !== i || !stageEl) return;
    const dx = e.clientX - dragStart.px;
    const dy = e.clientY - dragStart.py;
    if (!dragStart.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      dragStart.moved = true;
      draggingIdx = i;
      openIdx = null;
      noteUserAction();
    }
    if (dragStart.moved) {
      const r = stageEl.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top)  / r.height) * 100;
      dragOverrides = { ...dragOverrides, [i]: { top: y, left: x } };
    }
  }

  function onTagPointerUp(i: number, e: PointerEvent) {
    if (dragStart.tagIdx !== i) return;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    if (dragStart.moved) {
      const p = dragOverrides[i];
      // eslint-disable-next-line no-console
      console.log(
        `[${i}] ${tags[i].controls ?? '?'}: top: ${p.top.toFixed(1)}, left: ${p.left.toFixed(1)},`,
      );
    } else {
      clickTag(i);
    }
    draggingIdx = null;
    dragStart.tagIdx = -1;
    dragStart.moved = false;
  }

  let autoAlive = false;
  let lastAutoTagIdx: number | null = null;
  const sleep = (ms: number) => new Promise(r => window.setTimeout(r, ms));

  const STROBE_STEP_MS = 125;
  const BREATH_MS = 250;

  async function autoLoop() {
    while (autoAlive) {
      await sleep(2400 + Math.random() * 2400);
      if (!autoAlive) break;

      // Hold off while the user is interacting; re-check on each fresh click.
      while (autoAlive) {
        const sinceUser = performance.now() - lastUserActionAt;
        if (sinceUser >= USER_HOLD_MS) break;
        await sleep(USER_HOLD_MS - sinceUser);
      }
      if (!autoAlive) break;

      if (openIdx !== null) continue;

      // Never the same tag twice in a row.
      const tagCandidates = tags
        .map((_, idx) => idx)
        .filter(idx => idx !== lastAutoTagIdx && tags[idx].controls);
      if (tagCandidates.length === 0) continue;
      const i = tagCandidates[Math.floor(Math.random() * tagCandidates.length)];
      const tag = tags[i];
      const opts = valueOptions[tag.controls!];

      // Never the same token twice in a row.
      const currentIdx = opts.indexOf(currentValues[i]);
      const candidates = opts
        .map((_, k) => k)
        .filter(k => k !== currentIdx);
      if (candidates.length === 0) continue;
      const finalIdx = candidates[Math.floor(Math.random() * candidates.length)];

      openIdx = i;

      // Let the menu sit open before any highlight appears.
      await sleep(BREATH_MS);
      if (!autoAlive || openIdx !== i) continue;

      // Step from the top down to the chosen item.
      for (let k = 0; k <= finalIdx; k++) {
        if (!autoAlive || openIdx !== i) break;
        strobeIdx = k;
        await sleep(STROBE_STEP_MS);
      }
      if (!autoAlive || openIdx !== i) continue;

      // Blink twice on the selection.
      for (let blink = 0; blink < 2; blink++) {
        if (!autoAlive || openIdx !== i) break;
        strobeIdx = null;
        await sleep(STROBE_STEP_MS);
        if (!autoAlive || openIdx !== i) break;
        strobeIdx = finalIdx;
        await sleep(STROBE_STEP_MS);
      }
      if (!autoAlive || openIdx !== i) continue;

      pickValue(i, opts[finalIdx]);
      lastAutoTagIdx = i;
    }
  }

  $effect(() => {
    if (!autoplay) return;
    autoAlive = true;
    autoLoop();
    return () => { autoAlive = false; };
  });
</script>

<div
  class="ftt-stage"
  bind:this={stageEl}
  style:--ftt-bob-duration="{duration}s"
  style:--ftt-bob-distance="{-distance}px"
>
  <svg class="ftt-strings" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {#each tags as tag, i (i)}
      {@const a = anchorPoint(tag.anchor)}
      <line
        bind:this={lineEls[i]}
        x1={tag.left} y1={tag.top}
        x2={a.x}      y2={a.y}
        class="ftt-string"
        class:ftt-live={ballStates.has(i)}
      />
    {/each}
  </svg>

  <!-- Box is intrinsically sized to content + padding; boxSize is a floor. -->
  <div
    bind:this={boxEl}
    class="ftt-box"
    class:ftt-bloop={bloopActive}
    style:min-width="{boxSize.w}%"
    style:min-height="{boxSize.h}%"
    style:background={asVar(surfaceVar)}
    style:border-radius={asVar(radiusVar)}
    style:border-color={asVar(borderColorVar)}
    style:border-width={asVar(borderWidthVar)}
  >
    <span
      class="ftt-box-label"
      style:font-family={asVar(fontFamilyVar)}
    >I'm a button</span>
  </div>

  {#each tags as tag, i (i)}
    {@const a = anchorPoint(tag.anchor)}
    <span
      bind:this={knotEls[i]}
      class="ftt-knot"
      style:left="{a.x}%"
      style:top="{a.y}%"
      aria-hidden="true"
    ></span>
  {/each}

  {#each tags as _t, i (i)}
    <span class="ftt-energy-ball" bind:this={ballEls[i]} aria-hidden="true"></span>
  {/each}

  {#each tags as tag, i (i)}
    <span
      bind:this={tagEls[i]}
      class="ftt-float"
      class:ftt-flash={flashingIdx === i}
      class:ftt-open={openIdx === i}
      class:ftt-dragging={draggingIdx === i}
      data-placement={tag.placement ?? 'top'}
      data-pivot={tag.pivot ?? 'center'}
      style:top="{tagTop(i)}%"
      style:left="{tagLeft(i)}%"
      style:animation-delay="{tag.delay ?? 0}s"
      style:--ftt-rot="{tag.rotate ?? 0}deg"
    >
      {#if tag.controls}
        <span class="ftt-float-property">{controlLabels[tag.controls]}</span>
      {/if}
      <span class="ftt-chip-host">
        <button
          type="button"
          class="ftt-tag-trigger"
          onpointerdown={(e) => onTagPointerDown(i, e)}
          onpointermove={(e) => onTagPointerMove(i, e)}
          onpointerup={(e) => onTagPointerUp(i, e)}
          aria-haspopup="listbox"
          aria-expanded={openIdx === i}
        >
          <span class="ftt-tag">
            {#if tag.icon}<span class="ftt-tag-icon"><i class={tag.icon}></i></span>{/if}
            <span class="ftt-tag-label">{currentValues[i]}</span>
          </span>
        </button>

        {#if openIdx === i && tag.controls}
          {@const opts = valueOptions[tag.controls]}
          {@const strobeValue = strobeIdx !== null ? opts[strobeIdx] : null}
          <div class="ftt-dropdown-wrap">
            <MenuSelect
              items={opts.map((opt) => ({ value: opt, label: opt }))}
              value={currentValues[i]}
              forceHoverValue={strobeValue}
              onchange={(v) => userPick(i, v)}
            />
          </div>
        {/if}
      </span>
    </span>
  {/each}
</div>
