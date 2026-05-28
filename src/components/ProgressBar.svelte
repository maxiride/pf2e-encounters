<script lang="ts">
  import ProgressBar from '@motion-proto/live-tokens/components/ProgressBar.svelte';

  /**
   * A single color stop along the bar. `at` is the value (0–100) where this
   * color becomes active; the active stage is the highest `at` ≤ current
   * value. Optional `label` renders a tick overlay at that position. Omit
   * the label to define a color-only stop (e.g. an "under threshold" base
   * color at at:0). Set `tickline: false` to keep the label tag but skip
   * the vertical line across the bar (useful at the 0/100 edges).
   */
  export interface ProgressStage {
    at: number;
    color: string;
    label?: string;
    tickline?: boolean;
  }

  type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'info';

  interface Props {
    value?: number;
    label?: string;
    variant?: Variant;
    showIcon?: boolean;
    stages?: ProgressStage[];
  }

  let {
    value = 0,
    label = '',
    variant = 'primary',
    showIcon = true,
    stages,
  }: Props = $props();

  // primary defers to the shipped --progressbar-fill default; the semantic
  // variants point at theme border tokens.
  const variantFill: Record<Variant, string | undefined> = {
    primary: undefined,
    success: '--border-success',
    warning: '--border-warning',
    danger: '--border-danger',
    info: '--border-info',
  };

  let clampedValue = $derived(Math.min(100, Math.max(0, value)));
  let isComplete = $derived(clampedValue >= 100);

  let activeStage = $derived.by(() => {
    if (!stages || stages.length === 0) return null;
    let active = stages[0];
    for (const s of stages) if (s.at <= clampedValue) active = s;
    return active;
  });

  let fillProp = $derived(activeStage?.color ?? variantFill[variant]);
</script>

<div class="encounter-progress" class:has-icon={showIcon && isComplete && !stages} class:has-stages={!!stages}>
  <div class="bar-wrap">
    {#if stages}
      <div class="stages-layer">
        {#each stages as s}
          {#if s.label}
            <div
              class="stage-tag"
              class:at-end={s.at >= 100}
              class:at-start={s.at <= 0}
              style:left="{s.at}%"
            >{s.label}</div>
          {/if}
        {/each}
      </div>
    {/if}
    <ProgressBar {value} {label} fill={fillProp} />
    {#if stages}
      <div class="tickline-layer">
        {#each stages as s}
          {#if s.label && s.tickline !== false}
            {@const atEnd = s.at >= 100}
            {@const atStart = s.at <= 0}
            <span
              class="progress-tickline"
              style:left={atEnd
                ? 'calc(100% - var(--space-12, 12px))'
                : atStart
                  ? 'var(--space-12, 12px)'
                  : `${s.at}%`}
            ></span>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
  {#if showIcon && isComplete && !stages}
    <div class="progress-icon">
      <i class="fas fa-check-circle"></i>
    </div>
  {/if}
</div>

<style>
  .encounter-progress {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
    align-items: center;
  }

  .encounter-progress.has-icon {
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: var(--space-8);
  }

  /* Reserve room above the shipped bar for stage tags. */
  .encounter-progress.has-stages .bar-wrap {
    padding-top: var(--space-32, 32px);
  }

  .bar-wrap {
    position: relative;
    min-width: 0;
  }

  /* Tickline layer overlays *only* the track region. Height + radius come
     from the shipped progressbar tokens so the lines clip to whatever track
     shape the shipped editor configures. */
  .tickline-layer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: var(--progressbar-track-height);
    pointer-events: none;
    overflow: hidden;
    border-radius: var(--progressbar-radius);
  }

  .progress-tickline {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--text-primary, #fff);
    opacity: 0.55;
    transform: translateX(-50%);
  }

  /* Stage tags reuse the live Tooltip tokens so a tick label and a real
     tooltip stay visually identical at any token configuration. The arrow
     bottom corner lands on the top edge of the track (when there's no label
     between). */
  .stages-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: var(--space-32, 32px);
    pointer-events: none;
  }

  .stage-tag {
    position: absolute;
    bottom: 6px;
    transform: translateX(-50%);
    isolation: isolate;
    background: var(--tooltip-surface);
    color: var(--tooltip-text);
    padding:
      var(--tooltip-padding-top, var(--tooltip-padding))
      var(--tooltip-padding-right, calc(var(--tooltip-padding) * 2))
      var(--tooltip-padding-bottom, var(--tooltip-padding))
      var(--tooltip-padding-left, calc(var(--tooltip-padding) * 2));
    border: var(--tooltip-border-width) solid var(--tooltip-border);
    border-radius: var(--tooltip-radius);
    font-family: var(--tooltip-text-font-family);
    font-size: var(--tooltip-text-font-size);
    font-weight: var(--tooltip-text-font-weight);
    line-height: var(--tooltip-text-line-height);
    white-space: nowrap;
    box-shadow: var(--tooltip-shadow);
  }

  .stage-tag::after {
    content: '';
    position: absolute;
    bottom: calc(-4px - var(--tooltip-border-width));
    left: 50%;
    width: 8px;
    height: 8px;
    transform: translateX(-50%) rotate(45deg);
    background: var(--tooltip-surface);
    border-right: var(--tooltip-border-width) solid var(--tooltip-border);
    border-bottom: var(--tooltip-border-width) solid var(--tooltip-border);
    z-index: -1;
  }

  .stage-tag.at-end {
    transform: translateX(-100%);
  }
  .stage-tag.at-end::after {
    left: auto;
    right: var(--space-12, 12px);
    transform: translateX(50%) rotate(45deg);
  }
  .stage-tag.at-start {
    transform: none;
  }
  .stage-tag.at-start::after {
    left: var(--space-12, 12px);
    transform: translateX(-50%) rotate(45deg);
  }

  .progress-icon {
    color: var(--text-success);
    font-size: var(--icon-size-md);
    line-height: 1;
  }
</style>
