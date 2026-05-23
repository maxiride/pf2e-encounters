<script lang="ts">
  import newspaperBg from '../../../system/assets/newspaper.webp';



  interface Props {
    mode?: 'default' | 'image' | 'color';
    /** CSS var name (set by ShadowBackdropControls) the backdrop reads when in color mode. */
    colorVariable?: string;
    /** Padding around the slotted preview content. Set to '0' when the slotted component should cover the full backdrop area (e.g. dialog overlay). */
    padding?: string;
    children?: import('svelte').Snippet;
    /** Optional right-rail snippet rendered inside the backdrop as a fixed-width column. Used for canvas-scoped settings (e.g. Background controls). */
    controls?: import('svelte').Snippet;
  }

  let {
    mode = 'default',
    colorVariable,
    padding = '4rem',
    children,
    controls
  }: Props = $props();

  let backgroundStyle = $derived.by(() => {
    if (mode === 'image') {
      return `background-image: url(${newspaperBg}); background-size: cover; background-position: center; background-repeat: no-repeat;`;
    }
    if (mode === 'color' && colorVariable) {
      return `background: var(${colorVariable}, #1a1a1a);`;
    }
    return `background: var(--ui-surface-lowest); border: 1px solid var(--ui-border-low);`;
  });
</script>

<div class="shadow-backdrop" class:with-controls={!!controls} style={backgroundStyle}>
  <div class="shadow-backdrop-content" style="padding: {padding} {padding} {padding} 1.5rem;">
    {@render children?.()}
  </div>
  {#if controls}
    <div class="shadow-backdrop-controls">
      {@render controls?.()}
    </div>
  {/if}
</div>

<style>
  .shadow-backdrop {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
    min-width: 0;
    min-height: 12rem;
    border-radius: var(--ui-radius-md);
    box-sizing: border-box;
    overflow: hidden;
  }

  .shadow-backdrop.with-controls {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "preview controls";
  }

  .shadow-backdrop-content {
    display: grid;
    align-items: center;
    justify-items: start;
    min-width: 0;
    grid-area: preview;
  }

  .shadow-backdrop-controls {
    padding: var(--ui-space-8);
    grid-area: controls;
  }

  @container variant-group (max-width: 32rem) {
    .shadow-backdrop.with-controls {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        "controls"
        "preview";
    }
  }
</style>
