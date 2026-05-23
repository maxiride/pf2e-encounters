<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
  /** Section that gathers render-time toggles a component accepts as props
      (e.g. dismissible, action buttons, hover shimmer, show icons). */
</script>

<section class="editor-section-card config-block">
  <h3 class="editor-section-title config-title">Editor Configuration</h3>
  <div class="config-controls">
    {@render children?.()}
  </div>
</section>

<style>
  .config-title {
    margin-bottom: var(--ui-space-20);
  }

  .config-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    align-items: center;
  }

  .config-controls :global(label) {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }
</style>
