<script lang="ts">
  import Badge from '../../system/components/Badge.svelte';
  import Button from '../../system/components/Button.svelte';
  import Callout from '../../system/components/Callout.svelte';
  import SegmentedControl from '../../system/components/SegmentedControl.svelte';
  import Section from '../Section.svelte';

  let previewMode = $state('tone');
  const previewSegments = [
    { value: 'tone',  label: 'Tone',  icon: 'fas fa-droplet' },
    { value: 'shape', label: 'Shape', icon: 'fas fa-shapes' },
  ];

  const tones = ['primary', 'accent', 'success', 'warning', 'danger', 'info', 'special', 'neutral'] as const;
</script>

<Section
  title="See it live."
  description="Every component on this page resolves to the same token table. Open the editor; watch them change together."
  gap="var(--space-8)"
>
  <div class="playground">
    <div class="playground-control">
      <SegmentedControl segments={previewSegments} bind:value={previewMode} />
    </div>

    <div class="playground-stage">
      {#if previewMode === 'tone'}
        <div class="stage-row">
          {#each tones as v (v)}
            <Badge variant={v} icon="fas fa-circle">{v}</Badge>
          {/each}
        </div>
        <p class="stage-caption">
          Eight tones, one palette. <strong>{'--color-{tone}-500'}</strong> drives every fill above.
        </p>
      {:else}
        <div class="stage-row stage-shape">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="success" icon="fas fa-check">Success</Button>
          <Button variant="warning" icon="fas fa-bolt">Warning</Button>
          <Button variant="danger" icon="fas fa-xmark">Danger</Button>
        </div>
        <p class="stage-caption">
          Six variants. <strong>{'--button-{variant}-radius'}</strong> and
          <strong>{'--button-{variant}-padding'}</strong> shape every state.
        </p>
      {/if}
    </div>
  </div>

  <div class="tones-grid">
    <Callout variant="info" label="In dev.">
      The editor overlay runs in development only. Run <code>npm run dev</code> and look top-right.
    </Callout>
    <Callout variant="info" label="In prod.">
      Production builds are pure CSS. Zero runtime weight from the editor reaches the bundle.
    </Callout>
    <Callout variant="info" label="One canvas.">
      All routes share one <code>:root</code>. Variable writes cascade everywhere instantly.
    </Callout>
    <Callout variant="info" label="No magic.">
      Token names describe values, not components. <code>--color-brand-500</code>, never <code>--button-bg</code>.
    </Callout>
  </div>
</Section>

<style>
  .playground {
    display: grid;
    grid-template-columns: 1fr;
    row-gap: var(--space-32);
    background:
      radial-gradient(120% 80% at 50% 0%, var(--surface-canvas) 0%, var(--surface-canvas-low) 70%),
      var(--surface-canvas-low);
    border: var(--border-width-1) solid var(--border-canvas-subtle);
    border-radius: var(--radius-2xl);
    padding: var(--space-48) var(--space-32);
    box-shadow: var(--shadow-md);
  }

  .playground-control {
    justify-self: center;
  }

  .playground-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-20);
    min-height: 11rem;
    justify-content: center;
  }

  .stage-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
    justify-content: center;
    align-items: center;
  }

  .stage-shape :global(.button) {
    border-radius: var(--radius-sm);
    color: var(--text-primary);
  }
  .stage-shape :global(.button.success) {
    background: var(--color-success-600);
    border-color: var(--color-success-700);
  }
  .stage-shape :global(.button.warning) {
    background: var(--color-warning-600);
    border-color: var(--color-warning-700);
  }
  .stage-shape :global(.button.danger) {
    background: var(--color-danger-600);
    border-color: var(--color-danger-700);
  }

  .stage-caption {
    font-family: var(--font-serif);
    font-style: italic;
    color: var(--text-canvas-secondary);
    font-size: var(--font-size-md);
    text-align: center;
    margin: 0;
    max-width: 32rem;
  }

  .stage-caption :global(strong) {
    font-family: var(--font-mono);
    font-style: normal;
    font-size: 0.92em;
    color: var(--text-primary);
    font-weight: var(--font-weight-normal);
    background: var(--overlay-low);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
  }

  .tones-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-16);
  }

  @media (max-width: 960px) {
    .tones-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 600px) {
    .playground {
      padding: var(--space-24) var(--space-16);
    }
  }
</style>
