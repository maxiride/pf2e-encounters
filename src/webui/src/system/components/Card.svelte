<script lang="ts">
  interface Props {
    icon?: string;
    iconColor?: string;
    title?: string;
    size?: 'default' | 'compact';
    class?: string;
    children?: import('svelte').Snippet;
  }

  let {
    icon = '',
    iconColor = 'var(--text-secondary)',
    title = '',
    size = 'default',
    class: className = '',
    children
  }: Props = $props();
  
</script>

<div
  class="card {className}"
  class:compact={size === 'compact'}
  style="--card-color: {iconColor};"
>
  {#if icon || title}
    <div class="card-header">
      {#if icon}
        <i class="{icon} card-icon"></i>
      {/if}
      {#if title}
        <span class="card-title">{title}</span>
      {/if}
    </div>
  {/if}
  <div class="card-body">
    {@render children?.()}
  </div>
</div>

<style lang="scss">
  @use '../styles/padding' as *;

  :global(:root) {
    --card-default-surface: var(--surface-neutral-high);
    --card-default-border: var(--border-neutral);
    --card-default-border-width: var(--border-width-1);
    --card-default-radius: var(--radius-lg);
    --card-default-header-padding: var(--space-16);
    --card-default-body-padding: var(--space-16);
    --card-default-shadow: var(--shadow-sm);
    --card-default-blur: var(--blur-none);
    --card-default-header-surface: var(--color-transparent);

    --card-default-title: var(--text-primary);
    --card-default-title-font-family: var(--font-sans);
    --card-default-title-font-size: var(--font-size-lg);
    --card-default-title-font-weight: var(--font-weight-normal);
    --card-default-title-line-height: var(--line-height-sm);

    --card-default-icon-size: var(--icon-size-lg);

    --card-default-body: var(--text-secondary);
    --card-default-body-font-family: var(--font-sans);
    --card-default-body-font-size: var(--font-size-md);
    --card-default-body-font-weight: var(--font-weight-normal);
    --card-default-body-line-height: var(--line-height-md);

    --card-hover-border: var(--border-neutral-strong);
    --card-hover-shadow: var(--shadow-md);
  }

  .card {
    background: var(--card-default-surface);
    border: var(--card-default-border-width) solid var(--card-default-border);
    border-radius: var(--card-default-radius);
    box-shadow: var(--card-default-shadow);
    backdrop-filter: blur(var(--card-default-blur));
    transition: border-color var(--duration-150), box-shadow var(--duration-150);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .card:not(.no-hover):hover,
  .card.force-hover {
    border-color: var(--card-hover-border);
    box-shadow: var(--card-hover-shadow);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    @include themed-padding(--card-default-header-padding);
    background: var(--card-default-header-surface);
  }

  .card.compact .card-header,
  .card.compact .card-body {
    padding: var(--space-8) var(--space-12);
  }

  .card-icon {
    font-size: var(--card-default-icon-size);
    color: var(--card-color, var(--card-default-title));
  }

  .card.compact .card-icon {
    font-size: var(--icon-size-md);
  }

  .card-title {
    color: var(--card-default-title);
    font-family: var(--card-default-title-font-family);
    font-size: var(--card-default-title-font-size);
    font-weight: var(--card-default-title-font-weight);
    line-height: var(--card-default-title-line-height);
  }

  .card.compact .card-title {
    font-size: var(--font-size-md);
  }

  .card-body {
    color: var(--card-default-body);
    font-family: var(--card-default-body-font-family);
    font-size: var(--card-default-body-font-size);
    font-weight: var(--card-default-body-font-weight);
    line-height: var(--card-default-body-line-height);
    @include themed-padding(--card-default-body-padding);
  }

  /* Slot content inherits the card's body typography so consumer-side global
     element rules (e.g. site.css `p { font-family: serif }`) don't override
     the card-body-font-family alias. */
  .card-body :global(p),
  .card-body :global(ul),
  .card-body :global(ol),
  .card-body :global(li) {
    font: inherit;
    color: inherit;
  }

  .card-body :global(p) {
    margin: 0 0 var(--space-12);
  }

  .card-body :global(p:last-child) {
    margin-bottom: 0;
  }

  .card-body :global(ul),
  .card-body :global(ol) {
    margin: var(--space-12) 0;
    padding-left: var(--space-24);
  }

  .card-body :global(li) {
    margin-bottom: var(--space-4);
  }

  .card.compact .card-body {
    font-size: var(--font-size-sm);
  }
</style>
