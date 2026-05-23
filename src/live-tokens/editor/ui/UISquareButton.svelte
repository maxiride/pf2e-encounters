<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'default' | 'secondary' | 'success';
    size?: 'default' | 'compact';
    icon?: string;
    href?: string;
    target?: string;
    disabled?: boolean;
    active?: boolean;
    title?: string;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  }

  let {
    variant = 'default',
    size = 'default',
    icon,
    href,
    target,
    disabled = false,
    active = false,
    title,
    type = 'button',
    onclick,
    children,
  }: Props = $props();
</script>

{#if href}
  <a
    class="ui-sq ui-sq-{variant} ui-sq-{size}"
    class:active
    {href}
    {target}
    {title}
    {onclick}
    rel={target === '_blank' ? 'noopener noreferrer' : undefined}
    aria-disabled={disabled ? 'true' : undefined}
  >
    {#if icon}<i class="fas {icon}" aria-hidden="true"></i>{/if}
    {#if children}{@render children()}{/if}
  </a>
{:else}
  <button
    class="ui-sq ui-sq-{variant} ui-sq-{size}"
    class:active
    {type}
    {disabled}
    {title}
    {onclick}
  >
    {#if icon}<i class="fas {icon}" aria-hidden="true"></i>{/if}
    {#if children}{@render children()}{/if}
  </button>
{/if}

<style>
  .ui-sq {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.25) 100%);
    border: 1px solid rgba(255, 255, 255, 0.5);
    color: var(--ui-text-primary);
    font-family: inherit;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-medium);
    line-height: 1;
    padding: var(--ui-space-6) var(--ui-space-16);
    border-radius: var(--ui-radius-md);
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    transition: background var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .ui-sq:hover:not(:disabled):not([aria-disabled='true']) {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.45) 100%);
    border-color: rgba(255, 255, 255, 0.75);
  }

  .ui-sq.active {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.42) 100%);
    border-color: rgba(255, 255, 255, 0.7);
  }

  .ui-sq:disabled,
  .ui-sq[aria-disabled='true'] {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.10) 100%);
    border-color: rgba(255, 255, 255, 0.22);
    color: var(--ui-text-muted);
    cursor: not-allowed;
    pointer-events: none;
  }
  .ui-sq:disabled i,
  .ui-sq[aria-disabled='true'] i {
    color: rgba(255, 255, 255, 0.28);
  }

  .ui-sq i {
    font-size: var(--ui-font-size-xs);
    color: rgba(255, 255, 255, 0.65);
  }

  .ui-sq i.fa-spinner {
    animation: ui-sq-spin 1s linear infinite;
  }

  @keyframes ui-sq-spin {
    to { transform: rotate(360deg); }
  }

  /* Variant: primary — heavier gradient + brighter border for CTAs */
  .ui-sq-primary {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%);
    border-color: rgba(255, 255, 255, 0.55);
  }
  .ui-sq-primary:hover:not(:disabled):not([aria-disabled='true']) {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.12) 100%);
    border-color: rgba(255, 255, 255, 0.7);
  }
  .ui-sq-primary:disabled,
  .ui-sq-primary[aria-disabled='true'] {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.03) 100%);
    border-color: rgba(255, 255, 255, 0.24);
  }

  /* Variant: secondary — lighter, for low-emphasis actions */
  .ui-sq-secondary {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
    border-color: rgba(255, 255, 255, 0.30);
  }
  .ui-sq-secondary:hover:not(:disabled):not([aria-disabled='true']) {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%);
    border-color: rgba(255, 255, 255, 0.5);
  }
  .ui-sq-secondary:disabled,
  .ui-sq-secondary[aria-disabled='true'] {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
    border-color: rgba(255, 255, 255, 0.14);
  }

  /* Variant: success — green gradient for adopt/apply CTAs. Same gradient
     shape as primary, swapping white for the success hue. */
  .ui-sq-success {
    background: linear-gradient(180deg, rgba(90, 168, 94, 0.35) 0%, rgba(90, 168, 94, 0.18) 100%);
    border-color: rgba(90, 168, 94, 0.60);
  }
  .ui-sq-success:hover:not(:disabled):not([aria-disabled='true']) {
    background: linear-gradient(180deg, rgba(90, 168, 94, 0.48) 0%, rgba(90, 168, 94, 0.26) 100%);
    border-color: rgba(90, 168, 94, 0.78);
  }
  .ui-sq-success:disabled,
  .ui-sq-success[aria-disabled='true'] {
    background: linear-gradient(180deg, rgba(90, 168, 94, 0.10) 0%, rgba(90, 168, 94, 0.04) 100%);
    border-color: rgba(90, 168, 94, 0.25);
  }

  .ui-sq-compact {
    font-size: var(--ui-font-size-sm);
    padding: var(--ui-space-2) var(--ui-space-12);
  }

  @media (max-width: 640px) {
    .ui-sq :global(span:not(.chevron)) { display: none; }
    .ui-sq { padding: var(--ui-space-6) var(--ui-space-10); }
  }
</style>
