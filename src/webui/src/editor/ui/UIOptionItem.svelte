<script lang="ts">
  interface Props {
    active?: boolean;
    preview?: import('svelte').Snippet;
    label?: import('svelte').Snippet;
    meta?: import('svelte').Snippet;
    onclick?: (event: MouseEvent) => void;
  }

  let {
    active = false,
    preview,
    label,
    meta,
    onclick
  }: Props = $props();
</script>

<button class="ui-option-item" class:active {onclick}>
  {#if preview}
    <span class="ui-option-preview">
      {@render preview?.()}
    </span>
  {/if}
  <span class="ui-option-label">
    {@render label?.()}
  </span>
  {#if meta}
    <code class="ui-option-meta">
      {@render meta?.()}
    </code>
  {/if}
</button>

<style>
  .ui-option-item {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-8);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .ui-option-item:hover {
    background: var(--ui-hover);
  }

  .ui-option-item.active {
    background: var(--ui-hover-high);
    border-color: var(--ui-text-accent);
    box-shadow: inset 3px 0 0 var(--ui-text-accent);
  }

  .ui-option-item.active .ui-option-label {
    color: var(--ui-text-accent);
    font-weight: var(--ui-font-weight-semibold);
  }

  .ui-option-item.active .ui-option-meta {
    color: var(--ui-text-primary);
  }

  .ui-option-preview {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .ui-option-label {
    flex: 1;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
    text-align: left;
  }

  .ui-option-meta {
    flex-shrink: 0;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    white-space: nowrap;
  }
</style>
