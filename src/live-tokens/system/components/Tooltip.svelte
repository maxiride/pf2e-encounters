<script lang="ts">
  interface Props {
    text?: string;
    position?: 'top' | 'bottom';
    open?: boolean;
    children?: import('svelte').Snippet;
  }

  let {
    text = '',
    position = 'top',
    open = false,
    children
  }: Props = $props();
</script>

<div class="tooltip-wrapper" class:open>
  {@render children?.()}
  {#if text}
    <div class="tooltip" class:bottom={position === 'bottom'}>
      {text}
    </div>
  {/if}
</div>

<style lang="scss">
  @use '../styles/padding' as *;

  :global(:root) {
    --tooltip-surface: var(--surface-neutral-highest);
    --tooltip-text: var(--text-primary);
    --tooltip-text-font-family: var(--font-sans);
    --tooltip-text-font-size: var(--font-size-sm);
    --tooltip-text-font-weight: var(--font-weight-normal);
    --tooltip-text-line-height: var(--line-height-md);
    --tooltip-border: var(--border-neutral);
    --tooltip-border-width: var(--border-width-0);
    --tooltip-radius: var(--radius-md);
    --tooltip-padding: var(--space-6);
    --tooltip-shadow: var(--shadow-md);
  }

  .tooltip-wrapper {
    position: relative;
    display: inline-block;
  }

  .tooltip {
    position: absolute;
    bottom: calc(100% + var(--space-8));
    left: 50%;
    transform: translateX(-50%);
    background: var(--tooltip-surface);
    color: var(--tooltip-text);
    @include themed-padding(--tooltip-padding, $h: 2);
    border: var(--tooltip-border-width) solid var(--tooltip-border);
    border-radius: var(--tooltip-radius);
    font-family: var(--tooltip-text-font-family);
    font-size: var(--tooltip-text-font-size);
    font-weight: var(--tooltip-text-font-weight);
    line-height: var(--tooltip-text-line-height);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--duration-150);
    z-index: var(--z-tooltip);
    box-shadow: var(--tooltip-shadow);
  }

  .tooltip::after {
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

  .tooltip.bottom {
    bottom: auto;
    top: calc(100% + var(--space-8));
  }

  .tooltip.bottom::after {
    bottom: auto;
    top: calc(-4px - var(--tooltip-border-width));
    border-right: none;
    border-bottom: none;
    border-left: var(--tooltip-border-width) solid var(--tooltip-border);
    border-top: var(--tooltip-border-width) solid var(--tooltip-border);
  }

  .tooltip-wrapper:hover .tooltip,
  .tooltip-wrapper.open .tooltip {
    opacity: 1;
  }
</style>
