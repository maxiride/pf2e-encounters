<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    ariaLabel?: string;
    children?: Snippet;
  }

  let { title, ariaLabel, children }: Props = $props();

  let open = $state(false);
  let btnEl = $state<HTMLButtonElement | undefined>(undefined);
  let popoverEl = $state<HTMLDivElement | undefined>(undefined);
  let ready = $state(false);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) open = false;
  }

  function handleDocumentMousedown(e: MouseEvent) {
    if (!open) return;
    const target = e.target as Element | null;
    if (target && !target.closest('[data-info-popover-root]')) {
      open = false;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousedown', handleDocumentMousedown, true);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('mousedown', handleDocumentMousedown, true);
  });

  function position(): void {
    const btn = btnEl;
    const pop = popoverEl;
    if (!btn || !pop) return;
    const br = btn.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = br.right + margin;
    if (left + pr.width > vw - margin) {
      left = br.left + br.width / 2 - pr.width / 2;
      if (left < margin) left = margin;
      if (left + pr.width > vw - margin) left = vw - margin - pr.width;
    }
    let top = br.bottom + margin;
    if (top + pr.height > vh - margin) {
      top = br.top - margin - pr.height;
      if (top < margin) top = margin;
    }
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    ready = true;
  }

  $effect(() => {
    if (!open) {
      ready = false;
      return;
    }
    let raf1 = requestAnimationFrame(() => {
      raf1 = requestAnimationFrame(position);
    });
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    return () => {
      cancelAnimationFrame(raf1);
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
    };
  });
</script>

<button
  type="button"
  class="info-btn"
  aria-label={ariaLabel ?? `About ${title}`}
  aria-expanded={open}
  bind:this={btnEl}
  data-info-popover-root
  onclick={() => (open = !open)}
>
  <i class="fas fa-circle-info"></i>
</button>

{#if open}
  <div
    class="info-popover"
    class:ready
    role="dialog"
    aria-label={ariaLabel ?? `About ${title}`}
    bind:this={popoverEl}
    data-info-popover-root
  >
    <header class="info-header">
      <span class="info-title">{title}</span>
      <button
        type="button"
        class="info-close"
        aria-label="Close"
        onclick={() => (open = false)}
      >
        <i class="fas fa-xmark"></i>
      </button>
    </header>
    <div class="info-body">
      {@render children?.()}
    </div>
  </div>
{/if}

<style>
  .info-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    background: transparent;
    border: 0;
    color: var(--ui-text-tertiary);
    font-size: 0.95rem;
    line-height: 1;
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .info-btn:hover,
  .info-btn[aria-expanded='true'] {
    color: var(--ui-text-primary);
  }

  /* Fixed positioning escapes any parent overflow/stacking context. JS
     anchors it to the right of the trigger; falls back to centered-below
     then flips up near the viewport bottom. */
  .info-popover {
    position: fixed;
    top: 0;
    left: 0;
    width: 22rem;
    max-width: calc(100vw - var(--ui-space-24));
    padding: 0;
    background: var(--ui-surface-higher);
    border: 1px solid var(--ui-border-high);
    border-radius: var(--ui-radius-lg);
    box-shadow: var(--ui-shadow-lg);
    z-index: 1000;
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-family, system-ui, sans-serif);
    overflow: hidden;
    visibility: hidden;
    animation: info-popover-in 140ms ease-out;
  }

  .info-popover.ready {
    visibility: visible;
  }

  .info-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
    padding: var(--ui-space-8) var(--ui-space-10) var(--ui-space-8) var(--ui-space-12);
    border-bottom: 1px solid var(--ui-border-low);
  }

  /* Header sized to the body text (xs) so the title reads as a label, not
     a heading that dwarfs the prose. Weight + color carry the hierarchy. */
  .info-title {
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    line-height: 1.2;
  }

  .info-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--ui-space-24);
    height: var(--ui-space-24);
    padding: 0;
    background: transparent;
    border: 0;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-xs);
    line-height: 1;
    cursor: pointer;
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
  }

  .info-close:hover {
    color: var(--ui-text-primary);
    background: var(--ui-hover);
  }

  .info-body {
    padding: var(--ui-space-12) var(--ui-space-16);
  }

  .info-popover :global(p) {
    margin: 0 0 var(--ui-space-12) 0;
    font-size: var(--ui-font-size-xs);
    line-height: 1.55;
  }

  .info-popover :global(p:last-child) {
    margin-bottom: 0;
  }

  .info-popover :global(strong) {
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-semibold);
  }

  .info-popover :global(em) {
    font-style: italic;
    color: var(--ui-text-primary);
  }

  .info-popover :global(code) {
    font-family: var(--ui-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.92em;
    color: var(--ui-text-primary);
  }

  @keyframes info-popover-in {
    from { opacity: 0; transform: translateY(-3px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
