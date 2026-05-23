<script lang="ts">
  import type { Snippet } from 'svelte';
  import SectionDivider from '../system/components/SectionDivider.svelte';

  /** Section wrapper. `variant` picks a SectionDivider preset (lg/md/sm).
   *  Each preset is fully configured in the editor — typography, colors,
   *  background, geometry are all owned by the variant. */
  interface Props {
    title: string;
    description?: string;
    eyebrow?: string;
    variant?: 'lg' | 'md' | 'sm';
    gap?: string;
    children: Snippet;
  }

  let {
    title,
    description,
    eyebrow,
    variant = 'md',
    gap = 'var(--space-24)',
    children,
  }: Props = $props();
</script>

<section class="demo-section" style:gap>
  <SectionDivider {title} {description} {eyebrow} {variant} />
  {@render children()}
</section>

<style>
  .demo-section {
    grid-column: 2 / span 10;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 960px) {
    .demo-section {
      grid-column: 1 / -1;
    }
  }
</style>
