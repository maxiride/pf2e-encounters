<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    selected?: boolean;
    label?: string;
    disabled?: boolean;
    /** Editor preview hook. Paints hover tokens without a real pointer. */
    class?: string;
    children?: Snippet;
    onclick?: (e: MouseEvent) => void;
  }

  let {
    selected = false,
    label,
    disabled = false,
    class: className = '',
    children,
    onclick,
  }: Props = $props();
</script>

<button
  type="button"
  class="select-badge {className}"
  class:selected
  aria-pressed={selected}
  {disabled}
  {onclick}
>
  <span class="dot"></span>
  <span class="badge-label">{#if children}{@render children()}{:else}{label}{/if}</span>
</button>

<style>
  :global(:root) {
    /* Default */
    --selectbadge-default-frame-surface: var(--color-transparent);
    --selectbadge-default-frame-border: var(--border-brand);
    --selectbadge-default-frame-border-width: var(--border-width-1);
    --selectbadge-default-frame-radius: var(--radius-sm);
    --selectbadge-default-frame-padding: var(--space-6);
    --selectbadge-default-dot-border: var(--border-brand);
    --selectbadge-default-dot-border-width: var(--border-width-1);
    --selectbadge-default-dot-fill: var(--color-transparent);
    --selectbadge-default-dot-size: var(--space-10);
    --selectbadge-default-label: var(--text-brand);
    --selectbadge-default-label-font-family: var(--font-sans);
    --selectbadge-default-label-font-size: var(--font-size-xs);
    --selectbadge-default-label-font-weight: var(--font-weight-semibold);
    --selectbadge-default-label-line-height: var(--line-height-xs);

    /* Hover */
    --selectbadge-hover-frame-surface: var(--surface-brand-lower);
    --selectbadge-hover-frame-border: var(--border-brand);
    --selectbadge-hover-frame-border-width: var(--border-width-1);
    --selectbadge-hover-frame-radius: var(--radius-sm);
    --selectbadge-hover-frame-padding: var(--space-6);
    --selectbadge-hover-dot-border: var(--border-brand);
    --selectbadge-hover-dot-border-width: var(--border-width-1);
    --selectbadge-hover-dot-fill: var(--color-transparent);
    --selectbadge-hover-dot-size: var(--space-10);
    --selectbadge-hover-label: var(--text-brand);
    --selectbadge-hover-label-font-family: var(--font-sans);
    --selectbadge-hover-label-font-size: var(--font-size-xs);
    --selectbadge-hover-label-font-weight: var(--font-weight-semibold);
    --selectbadge-hover-label-line-height: var(--line-height-xs);

    /* Selected */
    --selectbadge-selected-frame-surface: var(--surface-brand-high);
    --selectbadge-selected-frame-border: var(--border-brand);
    --selectbadge-selected-frame-border-width: var(--border-width-1);
    --selectbadge-selected-frame-radius: var(--radius-sm);
    --selectbadge-selected-frame-padding: var(--space-6);
    --selectbadge-selected-dot-border: var(--text-primary);
    --selectbadge-selected-dot-border-width: var(--border-width-1);
    --selectbadge-selected-dot-fill: var(--text-primary);
    --selectbadge-selected-dot-size: var(--space-10);
    --selectbadge-selected-label: var(--text-primary);
    --selectbadge-selected-label-font-family: var(--font-sans);
    --selectbadge-selected-label-font-size: var(--font-size-xs);
    --selectbadge-selected-label-font-weight: var(--font-weight-semibold);
    --selectbadge-selected-label-line-height: var(--line-height-xs);
  }

  .select-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    background: var(--selectbadge-default-frame-surface);
    border: var(--selectbadge-default-frame-border-width) solid var(--selectbadge-default-frame-border);
    border-radius: var(--selectbadge-default-frame-radius);
    padding: calc(var(--selectbadge-default-frame-padding) / 2) var(--selectbadge-default-frame-padding);
    color: var(--selectbadge-default-label);
    font-family: var(--selectbadge-default-label-font-family);
    font-size: var(--selectbadge-default-label-font-size);
    font-weight: var(--selectbadge-default-label-font-weight);
    line-height: var(--selectbadge-default-label-line-height);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
    user-select: none;
    cursor: pointer;
    transition:
      background var(--duration-150, 0.15s) ease,
      color var(--duration-150, 0.15s) ease,
      border-color var(--duration-150, 0.15s) ease;
  }

  .select-badge:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .select-badge:focus-visible {
    outline: var(--border-width-2, 2px) solid var(--border-focus, currentColor);
    outline-offset: 2px;
  }

  .dot {
    width: var(--selectbadge-default-dot-size);
    height: var(--selectbadge-default-dot-size);
    border-radius: var(--radius-full);
    box-sizing: border-box;
    border: var(--selectbadge-default-dot-border-width) solid var(--selectbadge-default-dot-border);
    background: var(--selectbadge-default-dot-fill);
    flex-shrink: 0;
    transition:
      background var(--duration-150, 0.15s) ease,
      border-color var(--duration-150, 0.15s) ease;
  }

  .select-badge:hover:not(:disabled):not(.selected),
  .select-badge.force-hover:not(:disabled):not(.selected) {
    background: var(--selectbadge-hover-frame-surface);
    border-color: var(--selectbadge-hover-frame-border);
    border-width: var(--selectbadge-hover-frame-border-width);
    border-radius: var(--selectbadge-hover-frame-radius);
    padding: calc(var(--selectbadge-hover-frame-padding) / 2) var(--selectbadge-hover-frame-padding);
    color: var(--selectbadge-hover-label);
    font-family: var(--selectbadge-hover-label-font-family);
    font-size: var(--selectbadge-hover-label-font-size);
    font-weight: var(--selectbadge-hover-label-font-weight);
    line-height: var(--selectbadge-hover-label-line-height);
  }

  .select-badge:hover:not(:disabled):not(.selected) .dot,
  .select-badge.force-hover:not(:disabled):not(.selected) .dot {
    width: var(--selectbadge-hover-dot-size);
    height: var(--selectbadge-hover-dot-size);
    border-color: var(--selectbadge-hover-dot-border);
    border-width: var(--selectbadge-hover-dot-border-width);
    background: var(--selectbadge-hover-dot-fill);
  }

  .select-badge.selected {
    background: var(--selectbadge-selected-frame-surface);
    border-color: var(--selectbadge-selected-frame-border);
    border-width: var(--selectbadge-selected-frame-border-width);
    border-radius: var(--selectbadge-selected-frame-radius);
    padding: calc(var(--selectbadge-selected-frame-padding) / 2) var(--selectbadge-selected-frame-padding);
    color: var(--selectbadge-selected-label);
    font-family: var(--selectbadge-selected-label-font-family);
    font-size: var(--selectbadge-selected-label-font-size);
    font-weight: var(--selectbadge-selected-label-font-weight);
    line-height: var(--selectbadge-selected-label-line-height);
  }

  .select-badge.selected .dot {
    width: var(--selectbadge-selected-dot-size);
    height: var(--selectbadge-selected-dot-size);
    border-color: var(--selectbadge-selected-dot-border);
    border-width: var(--selectbadge-selected-dot-border-width);
    background: var(--selectbadge-selected-dot-fill);
  }
</style>
