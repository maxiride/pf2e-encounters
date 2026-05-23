<script lang="ts">
  import { run } from 'svelte/legacy';

  import { copyPopover } from './copyPopover';

  let bubbleEl: HTMLDivElement | null = $state(null);
  let bubbleW = $state(0);
  let bubbleH = $state(0);

  run(() => {
    if (bubbleEl && $copyPopover.visible) {
      const r = bubbleEl.getBoundingClientRect();
      bubbleW = r.width;
      bubbleH = r.height;
    }
  });

  const GAP = 8;

  let anchor = $derived($copyPopover.anchor);
  let rawLeft = $derived(anchor ? anchor.left + anchor.width / 2 - bubbleW / 2 : 0);
  let rawTop = $derived(anchor ? anchor.top - bubbleH - GAP : 0);
  let maxLeft = $derived(typeof window !== 'undefined' ? window.innerWidth - bubbleW - 4 : rawLeft);
  let clampedLeft = $derived(Math.max(4, Math.min(rawLeft, maxLeft)));
  let clampedTop = $derived(Math.max(4, rawTop));
  let arrowLeft = $derived(anchor ? anchor.left + anchor.width / 2 - clampedLeft : bubbleW / 2);
</script>

{#if $copyPopover.visible && anchor}
  <div
    class="ui-copy-popover"
    bind:this={bubbleEl}
    style="top: {clampedTop}px; left: {clampedLeft}px;"
    role="status"
    aria-live="polite"
  >
    <span class="ui-copy-popover-value">{$copyPopover.value}</span>
    <span class="ui-copy-popover-arrow" style="left: {arrowLeft}px;"></span>
  </div>
{/if}

<style>
  .ui-copy-popover {
    position: fixed;
    z-index: 10000;
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface-highest);
    color: var(--ui-text-primary);
    border: 1px solid var(--ui-border-high);
    border-radius: var(--ui-radius-lg);
    box-shadow: var(--ui-shadow-lg);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    line-height: 1;
    pointer-events: none;
    white-space: nowrap;
    animation: uiCopyPopoverIn 120ms ease-out;
  }

  .ui-copy-popover-value {
    color: var(--ui-text-primary);
  }

  .ui-copy-popover-arrow {
    position: absolute;
    bottom: -5px;
    width: 8px;
    height: 8px;
    background: var(--ui-surface-highest);
    border-right: 1px solid var(--ui-border-high);
    border-bottom: 1px solid var(--ui-border-high);
    transform: translateX(-50%) rotate(45deg);
  }

  @keyframes uiCopyPopoverIn {
    from { opacity: 0; transform: translateY(2px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
