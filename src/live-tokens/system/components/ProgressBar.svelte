<script lang="ts">
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

  interface Props {
    value?: number;
    label?: string;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    showIcon?: boolean;
    stages?: ProgressStage[];
  }

  let {
    value = 0,
    label = '',
    variant = 'primary',
    showIcon = true,
    stages
  }: Props = $props();

  let clampedValue = $derived(Math.min(100, Math.max(0, value)));
  let isComplete = $derived(clampedValue >= 100);

  let activeStage = $derived.by(() => {
    if (!stages || stages.length === 0) return null;
    let active = stages[0];
    for (const s of stages) if (s.at <= clampedValue) active = s;
    return active;
  });
</script>

<div class="progress {variant}" class:has-label={!!label} class:has-icon={showIcon && isComplete} class:has-stages={!!stages}>
  {#if label}
    <div class="progress-label">
      <span>{label}</span>
      <span class="progress-value">{clampedValue}%</span>
    </div>
  {/if}
  {#if stages}
    <div class="progress-stages">
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
  <div class="progress-track">
    <div
      class="progress-fill {variant}"
      style="width: {clampedValue}%;{activeStage ? ` background: ${activeStage.color};` : ''}"
    ></div>
    {#if stages}
      {#each stages as s}
        {#if s.label && s.tickline !== false}
          <span class="progress-tickline" style:left="{s.at}%"></span>
        {/if}
      {/each}
    {/if}
  </div>
  {#if showIcon && isComplete && !stages}
    <div class="progress-icon">
      <i class="fas fa-check-circle"></i>
    </div>
  {/if}
</div>

<style>
  :global(:root) {
    /* Primary */
    --progressbar-primary-track-surface: var(--surface-neutral-low);
    --progressbar-primary-track-border: var(--border-neutral-faint);
    --progressbar-primary-track-border-width: var(--border-width-1);
    --progressbar-primary-track-height: var(--space-8);
    --progressbar-primary-radius: var(--radius-full);
    --progressbar-primary-fill: var(--gradient-1);
    --progressbar-primary-label: var(--text-secondary);
    --progressbar-primary-label-font-family: var(--font-sans);
    --progressbar-primary-label-font-size: var(--font-size-sm);
    --progressbar-primary-label-font-weight: var(--font-weight-light);
    --progressbar-primary-label-line-height: var(--line-height-md);
    --progressbar-primary-value: var(--text-tertiary);
    --progressbar-primary-value-font-family: var(--font-mono);
    --progressbar-primary-value-font-size: var(--font-size-xs);
    --progressbar-primary-value-font-weight: var(--font-weight-light);
    --progressbar-primary-value-line-height: var(--line-height-md);

    /* Success */
    --progressbar-success-track-surface: var(--surface-neutral-low);
    --progressbar-success-track-border: var(--border-neutral-faint);
    --progressbar-success-track-border-width: var(--border-width-1);
    --progressbar-success-track-height: var(--space-8);
    --progressbar-success-radius: var(--radius-full);
    --progressbar-success-fill: var(--border-success);
    --progressbar-success-label: var(--text-secondary);
    --progressbar-success-label-font-family: var(--font-sans);
    --progressbar-success-label-font-size: var(--font-size-sm);
    --progressbar-success-label-font-weight: var(--font-weight-light);
    --progressbar-success-label-line-height: var(--line-height-md);
    --progressbar-success-value: var(--text-tertiary);
    --progressbar-success-value-font-family: var(--font-mono);
    --progressbar-success-value-font-size: var(--font-size-xs);
    --progressbar-success-value-font-weight: var(--font-weight-light);
    --progressbar-success-value-line-height: var(--line-height-md);

    /* Warning */
    --progressbar-warning-track-surface: var(--surface-neutral-low);
    --progressbar-warning-track-border: var(--border-neutral-faint);
    --progressbar-warning-track-border-width: var(--border-width-1);
    --progressbar-warning-track-height: var(--space-8);
    --progressbar-warning-radius: var(--radius-full);
    --progressbar-warning-fill: var(--border-warning);
    --progressbar-warning-label: var(--text-secondary);
    --progressbar-warning-label-font-family: var(--font-sans);
    --progressbar-warning-label-font-size: var(--font-size-sm);
    --progressbar-warning-label-font-weight: var(--font-weight-light);
    --progressbar-warning-label-line-height: var(--line-height-md);
    --progressbar-warning-value: var(--text-tertiary);
    --progressbar-warning-value-font-family: var(--font-mono);
    --progressbar-warning-value-font-size: var(--font-size-xs);
    --progressbar-warning-value-font-weight: var(--font-weight-light);
    --progressbar-warning-value-line-height: var(--line-height-md);

    /* Danger */
    --progressbar-danger-track-surface: color-mix(in srgb, var(--surface-neutral-lowest) 80%, transparent);
    --progressbar-danger-track-border: var(--border-neutral-faint);
    --progressbar-danger-track-border-width: var(--border-width-1);
    --progressbar-danger-track-height: var(--space-8);
    --progressbar-danger-radius: var(--radius-full);
    --progressbar-danger-fill: var(--border-danger);
    --progressbar-danger-label: var(--text-secondary);
    --progressbar-danger-label-font-family: var(--font-sans);
    --progressbar-danger-label-font-size: var(--font-size-sm);
    --progressbar-danger-label-font-weight: var(--font-weight-light);
    --progressbar-danger-label-line-height: var(--line-height-md);
    --progressbar-danger-value: var(--text-tertiary);
    --progressbar-danger-value-font-family: var(--font-mono);
    --progressbar-danger-value-font-size: var(--font-size-xs);
    --progressbar-danger-value-font-weight: var(--font-weight-light);
    --progressbar-danger-value-line-height: var(--line-height-md);

    /* Info */
    --progressbar-info-track-surface: var(--surface-neutral-low);
    --progressbar-info-track-border: var(--border-neutral-faint);
    --progressbar-info-track-border-width: var(--border-width-1);
    --progressbar-info-track-height: var(--space-8);
    --progressbar-info-radius: var(--radius-full);
    --progressbar-info-fill: var(--border-info);
    --progressbar-info-label: var(--text-secondary);
    --progressbar-info-label-font-family: var(--font-sans);
    --progressbar-info-label-font-size: var(--font-size-sm);
    --progressbar-info-label-font-weight: var(--font-weight-light);
    --progressbar-info-label-line-height: var(--line-height-md);
    --progressbar-info-value: var(--text-tertiary);
    --progressbar-info-value-font-family: var(--font-mono);
    --progressbar-info-value-font-size: var(--font-size-xs);
    --progressbar-info-value-font-weight: var(--font-weight-light);
    --progressbar-info-value-line-height: var(--line-height-md);
  }

  .progress {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "track";
    row-gap: var(--space-6);
    width: 100%;
  }

  .progress.has-label {
    grid-template-areas:
      "label"
      "track";
  }

  .progress.has-stages {
    grid-template-areas:
      "stages"
      "track";
    /* Stages and track sit flush — each stage tag's arrow tip lands on the
       row boundary, which is the top of the bar. */
    row-gap: 0;
  }

  .progress.has-label.has-stages {
    grid-template-areas:
      "label"
      "stages"
      "track";
  }

  .progress.has-icon {
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: var(--space-8);
    grid-template-areas: "track icon";
  }

  .progress.has-label.has-icon {
    grid-template-areas:
      "label ."
      "track icon";
  }

  .progress-label {
    grid-area: label;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-track {
    grid-area: track;
    align-self: center;
    width: 100%;
    overflow: hidden;
    border-style: solid;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    transition: width 0.4s ease, background 0.3s ease;
  }

  /* Stage labels live in their own grid row directly above the track. Each
     tag is bottom-anchored within this row so its down-arrow's tip sits on
     the row boundary — i.e., on the top edge of the bar. */
  .progress-stages {
    grid-area: stages;
    position: relative;
    height: var(--space-32, 32px);
    pointer-events: none;
  }

  /* Styling reuses every --tooltip-* token that drives the Tooltip
     component — surface, text, padding (with per-side splits), border,
     radius, font, shadow — so edits to either propagate to the other.
     The ::after arrow mirrors Tooltip's own ::after exactly, so the tag
     and a real tooltip look identical at any token configuration. */
  .stage-tag {
    position: absolute;
    /* Pulls the box up so the arrow's rotated-square bottom corner lands
       on the bar's top edge. The corner extends ~(8 + border)·√2/2 −
       border/2 below the box (≈5.66px at border 0, ≈6.07px at border 2);
       6px is the closest no-fractional value that covers both. */
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

  /* Edge stages: anchor the box's nearest side to the stage position so the
     tag doesn't overflow the bar. The arrow shifts to that same side so it
     still reads as belonging to the rightmost (or leftmost) stop. */
  .stage-tag.at-end {
    transform: translateX(-100%);
  }
  .stage-tag.at-end::after {
    left: auto;
    right: var(--space-12, 12px);
    transform: rotate(45deg);
  }
  .stage-tag.at-start {
    transform: none;
  }
  .stage-tag.at-start::after {
    left: var(--space-12, 12px);
    transform: rotate(45deg);
  }

  /* Vertical tick line drawn across the track at each stage's position.
     Sits on top of the fill so it stays visible regardless of which side
     of the threshold the current fill width lands on. */
  .progress-tickline {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--text-primary, #fff);
    opacity: 0.55;
    transform: translateX(-50%);
    pointer-events: none;
  }

  /* Primary */
  .progress.primary .progress-label > span {
    color: var(--progressbar-primary-label);
    font-family: var(--progressbar-primary-label-font-family);
    font-size: var(--progressbar-primary-label-font-size);
    font-weight: var(--progressbar-primary-label-font-weight);
    line-height: var(--progressbar-primary-label-line-height);
  }
  .progress.primary .progress-value {
    color: var(--progressbar-primary-value);
    font-family: var(--progressbar-primary-value-font-family);
    font-size: var(--progressbar-primary-value-font-size);
    font-weight: var(--progressbar-primary-value-font-weight);
    line-height: var(--progressbar-primary-value-line-height);
  }
  .progress.primary .progress-track {
    background: var(--progressbar-primary-track-surface);
    border-color: var(--progressbar-primary-track-border);
    border-width: var(--progressbar-primary-track-border-width);
    border-radius: var(--progressbar-primary-radius);
    height: var(--progressbar-primary-track-height);
  }
  .progress-fill.primary {
    background: var(--progressbar-primary-fill);
    border-radius: var(--progressbar-primary-radius);
  }

  /* Success */
  .progress.success .progress-label > span {
    color: var(--progressbar-success-label);
    font-family: var(--progressbar-success-label-font-family);
    font-size: var(--progressbar-success-label-font-size);
    font-weight: var(--progressbar-success-label-font-weight);
    line-height: var(--progressbar-success-label-line-height);
  }
  .progress.success .progress-value {
    color: var(--progressbar-success-value);
    font-family: var(--progressbar-success-value-font-family);
    font-size: var(--progressbar-success-value-font-size);
    font-weight: var(--progressbar-success-value-font-weight);
    line-height: var(--progressbar-success-value-line-height);
  }
  .progress.success .progress-track {
    background: var(--progressbar-success-track-surface);
    border-color: var(--progressbar-success-track-border);
    border-width: var(--progressbar-success-track-border-width);
    border-radius: var(--progressbar-success-radius);
    height: var(--progressbar-success-track-height);
  }
  .progress-fill.success {
    background: var(--progressbar-success-fill);
    border-radius: var(--progressbar-success-radius);
  }

  /* Warning */
  .progress.warning .progress-label > span {
    color: var(--progressbar-warning-label);
    font-family: var(--progressbar-warning-label-font-family);
    font-size: var(--progressbar-warning-label-font-size);
    font-weight: var(--progressbar-warning-label-font-weight);
    line-height: var(--progressbar-warning-label-line-height);
  }
  .progress.warning .progress-value {
    color: var(--progressbar-warning-value);
    font-family: var(--progressbar-warning-value-font-family);
    font-size: var(--progressbar-warning-value-font-size);
    font-weight: var(--progressbar-warning-value-font-weight);
    line-height: var(--progressbar-warning-value-line-height);
  }
  .progress.warning .progress-track {
    background: var(--progressbar-warning-track-surface);
    border-color: var(--progressbar-warning-track-border);
    border-width: var(--progressbar-warning-track-border-width);
    border-radius: var(--progressbar-warning-radius);
    height: var(--progressbar-warning-track-height);
  }
  .progress-fill.warning {
    background: var(--progressbar-warning-fill);
    border-radius: var(--progressbar-warning-radius);
  }

  /* Danger */
  .progress.danger .progress-label > span {
    color: var(--progressbar-danger-label);
    font-family: var(--progressbar-danger-label-font-family);
    font-size: var(--progressbar-danger-label-font-size);
    font-weight: var(--progressbar-danger-label-font-weight);
    line-height: var(--progressbar-danger-label-line-height);
  }
  .progress.danger .progress-value {
    color: var(--progressbar-danger-value);
    font-family: var(--progressbar-danger-value-font-family);
    font-size: var(--progressbar-danger-value-font-size);
    font-weight: var(--progressbar-danger-value-font-weight);
    line-height: var(--progressbar-danger-value-line-height);
  }
  .progress.danger .progress-track {
    background: var(--progressbar-danger-track-surface);
    border-color: var(--progressbar-danger-track-border);
    border-width: var(--progressbar-danger-track-border-width);
    border-radius: var(--progressbar-danger-radius);
    height: var(--progressbar-danger-track-height);
  }
  .progress-fill.danger {
    background: var(--progressbar-danger-fill);
    border-radius: var(--progressbar-danger-radius);
  }

  /* Info */
  .progress.info .progress-label > span {
    color: var(--progressbar-info-label);
    font-family: var(--progressbar-info-label-font-family);
    font-size: var(--progressbar-info-label-font-size);
    font-weight: var(--progressbar-info-label-font-weight);
    line-height: var(--progressbar-info-label-line-height);
  }
  .progress.info .progress-value {
    color: var(--progressbar-info-value);
    font-family: var(--progressbar-info-value-font-family);
    font-size: var(--progressbar-info-value-font-size);
    font-weight: var(--progressbar-info-value-font-weight);
    line-height: var(--progressbar-info-value-line-height);
  }
  .progress.info .progress-track {
    background: var(--progressbar-info-track-surface);
    border-color: var(--progressbar-info-track-border);
    border-width: var(--progressbar-info-track-border-width);
    border-radius: var(--progressbar-info-radius);
    height: var(--progressbar-info-track-height);
  }
  .progress-fill.info {
    background: var(--progressbar-info-fill);
    border-radius: var(--progressbar-info-radius);
  }

  .progress-icon {
    grid-area: icon;
    align-self: center;
    color: var(--text-success);
    font-size: var(--icon-size-md);
    line-height: 1;
  }
</style>
