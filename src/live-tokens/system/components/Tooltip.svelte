<script lang="ts">
  interface Props {
    text?: string;
    position?: 'top' | 'bottom';
    open?: boolean;
    /** When true, long text wraps onto multiple lines (capped by `--tooltip-max-width`).
        Defaults to false — tooltip stays on a single line, matching prior behavior. */
    wrap?: boolean;
    /** When true, the CSS :hover trigger is disabled and `open` is the only source
        of visibility. Use when the caller wants to gate the tooltip on something
        more than mouse presence (e.g. only show when text is truncated). */
    manual?: boolean;
    /** When true, the tooltip uses `position: fixed` with JS-computed coordinates
        so it escapes `overflow: hidden` ancestors (e.g. scrollable tables). The
        tooltip still mounts in the same DOM location — fixed positioning is
        viewport-relative, so it isn't clipped by scroll containers. */
    portal?: boolean;
    children?: import('svelte').Snippet;
  }

  let {
    text = '',
    position = 'top',
    open = false,
    wrap = false,
    manual = false,
    portal = false,
    children
  }: Props = $props();

  let wrapperEl: HTMLElement | undefined = $state(undefined);
  let anchor = $state<{ top: number; bottom: number; centerX: number } | null>(null);

  // In portal mode the tooltip is fixed-positioned; we need to read the wrapper's
  // viewport rect whenever visibility flips on so the coords match the trigger.
  $effect(() => {
    if (!portal || !open || !wrapperEl) {
      anchor = null;
      return;
    }
    function measure() {
      if (!wrapperEl) return;
      const rect = wrapperEl.getBoundingClientRect();
      anchor = { top: rect.top, bottom: rect.bottom, centerX: rect.left + rect.width / 2 };
    }
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  });

  let tooltipStyle = $derived.by(() => {
    if (!portal || !anchor) return '';
    const y = position === 'top' ? anchor.top : anchor.bottom;
    return `left: ${anchor.centerX}px; top: ${y}px;`;
  });
</script>

<div class="tooltip-wrapper" class:open class:manual bind:this={wrapperEl}>
  {@render children?.()}
  {#if text}
    <div
      class="tooltip"
      class:bottom={position === 'bottom'}
      class:wrap
      class:portal
      style={tooltipStyle}
    >
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

  .tooltip.wrap {
    white-space: normal;
    max-width: var(--tooltip-max-width, 20rem);
    overflow-wrap: anywhere;
  }

  /* Portal mode: coords come from inline style (set by JS), so disable the
     wrapper-relative positioning. Translate moves the box above (or below) the
     anchor point and centers it horizontally on it. */
  .tooltip.portal {
    position: fixed;
    bottom: auto;
    left: 0;
    top: 0;
    transform: translate(-50%, calc(-100% - var(--space-8)));
  }
  .tooltip.portal.bottom {
    transform: translate(-50%, var(--space-8));
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

  /* Hover trigger applies only when the caller hasn't opted into manual control. */
  .tooltip-wrapper:not(.manual):hover .tooltip,
  .tooltip-wrapper.open .tooltip {
    opacity: 1;
  }
</style>
