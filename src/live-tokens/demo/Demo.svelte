<script lang="ts">
  import SectionHero from './sections/SectionHero.svelte';
  import SectionKit from './sections/SectionKit.svelte';
  import SectionLive from './sections/SectionLive.svelte';
  import SectionLayers from './sections/SectionLayers.svelte';
  import SectionDelivery from './sections/SectionDelivery.svelte';
  import SectionCta from './sections/SectionCta.svelte';
</script>

<div class="kit">
  <SectionHero />
  <SectionKit />
  <SectionLive />
  <SectionLayers />
  <SectionDelivery />
  <SectionCta />
</div>

<style>
  .kit {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-24);
    max-width: var(--columns-max-width);
    margin: 0 auto;
    padding: var(--space-48) var(--space-32);
    min-height: 100vh;
  }

  /* Per-section gap overrides (added on top of .kit row-gap). */
  .kit > :global(.hero) {
    margin-bottom: 0;
  }

  /* Inline code styling cascades into every section via :global descendants. */
  .kit :global(p > code),
  .kit :global(.callout code) {
    background: var(--overlay-low);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.88em;
    color: var(--text-primary);
  }

  @media (max-width: 600px) {
    .kit {
      padding: var(--space-32) var(--space-16);
      row-gap: var(--space-32);
    }
  }
</style>
