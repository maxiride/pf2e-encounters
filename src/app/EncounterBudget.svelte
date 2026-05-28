<script lang="ts">
  import ProgressBar from './ProgressBar.svelte';
  import type { BarStage } from './encounter';

  interface Props {
    value: number;
    stages: BarStage[];
  }

  let { value, stages }: Props = $props();
</script>

<section class="danger-bar">
  <h2 class="section-title">Encounter Budget</h2>
  <ProgressBar variant="danger" {value} {stages} showIcon={false} />
</section>

<style>
  .danger-bar {
    margin: var(--space-16, 16px) 0 var(--space-32, 32px);
    /* Default ProgressBar track is ~8px tall — too short for tick labels.
       Bump the danger variant just for this bar. */
    --progressbar-danger-track-height: 20px;
    /* Borrow the primary variant's translucent track surface — the danger
       default (solid neutral-low) reads heavier than the rest of the page. */
    --progressbar-danger-track-surface: color-mix(in srgb, var(--surface-neutral-lowest) 80%, transparent);
    --progressbar-danger-track-border: var(--border-neutral-faint);
    --progressbar-danger-track-border-width: var(--border-width-1);
  }
  .section-title {
    font-family: var(--font-sans);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    text-transform: none;
    letter-spacing: normal;
    margin: 0 0 var(--space-8, 8px);
    color: var(--text-primary);
  }
</style>
