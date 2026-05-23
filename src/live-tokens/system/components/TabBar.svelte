<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Tab {
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
  }

  interface Props {
    tabs?: Tab[];
    selectedTab?: string;
    iconOnly?: boolean;
    class?: string;
    /** Tab-change callback. Preferred over `on:tabChange` from 0.5.0 onward. */
    ontabChange?: (id: string) => void;
  }

  let {
    tabs = [],
    selectedTab = '',
    iconOnly = false,
    class: className = '',
    ontabChange
  }: Props = $props();

  // Dual-fire bridge — see Button.svelte for the deprecation timeline.
  const dispatch = createEventDispatcher<{
    tabChange: string;
  }>();

  function selectTab(tab: Tab) {
    if (!tab.disabled) {
      ontabChange?.(tab.id);
      dispatch('tabChange', tab.id);
    }
  }
</script>

<div class="tab-bar {className}">
  {#each tabs as tab}
    <button
      class="tab"
      class:active={selectedTab === tab.id}
      class:icon-only={iconOnly}
      disabled={tab.disabled}
      onclick={() => selectTab(tab)}
    >
      {#if tab.icon}
        <i class={tab.icon}></i>
      {/if}
      {#if !iconOnly}
        <span>{tab.label}</span>
      {/if}
    </button>
  {/each}
</div>

<style lang="scss">
  @use '../styles/padding' as *;

  :global(:root) {
    /* Bar */
    --tabbar-bar-divider: var(--border-neutral-subtle);
    --tabbar-bar-divider-thickness: var(--border-width-1);
    --tabbar-bar-indicator-thickness: var(--border-width-2);
    --tabbar-bar-top-margin: var(--space-0);
    --tabbar-bar-bottom-padding: var(--space-0);
    --tabbar-bar-bottom-margin: var(--space-0);
    --tabbar-tab-gap: var(--space-2);

    /* Default tab */
    --tabbar-default-text: var(--text-tertiary);
    --tabbar-default-text-font-family: var(--font-sans);
    --tabbar-default-text-font-size: var(--font-size-md);
    --tabbar-default-text-font-weight: var(--font-weight-light);
    --tabbar-default-text-line-height: var(--line-height-md);
    --tabbar-default-icon-size: var(--icon-size-md);
    --tabbar-default-padding: var(--space-8);
    --tabbar-default-border: var(--color-transparent);
    --tabbar-default-surface: var(--color-transparent);
    --tabbar-default-tab-border-color: var(--color-transparent);
    --tabbar-default-tab-border-width: var(--border-width-0);
    --tabbar-default-tab-top-radius: var(--radius-none);
    --tabbar-default-tab-bottom-radius: var(--radius-none);

    /* Hover tab */
    --tabbar-hover-text: var(--text-secondary);
    --tabbar-hover-surface: var(--surface-neutral-lower);
    --tabbar-hover-text-font-family: var(--font-sans);
    --tabbar-hover-text-font-size: var(--font-size-md);
    --tabbar-hover-text-font-weight: var(--font-weight-light);
    --tabbar-hover-text-line-height: var(--line-height-md);
    --tabbar-hover-icon-size: var(--icon-size-md);
    --tabbar-hover-padding: var(--space-8);
    --tabbar-hover-border: var(--color-transparent);
    --tabbar-hover-tab-border-color: var(--color-transparent);
    --tabbar-hover-tab-border-width: var(--border-width-0);
    --tabbar-hover-tab-top-radius: var(--radius-none);
    --tabbar-hover-tab-bottom-radius: var(--radius-none);

    /* Active tab */
    --tabbar-active-text: var(--text-primary);
    --tabbar-active-border: var(--color-brand-500);
    --tabbar-active-surface: var(--overlay-lowest);
    --tabbar-active-text-font-family: var(--font-sans);
    --tabbar-active-text-font-size: var(--font-size-md);
    --tabbar-active-text-font-weight: var(--font-weight-light);
    --tabbar-active-text-line-height: var(--line-height-md);
    --tabbar-active-icon-size: var(--icon-size-md);
    --tabbar-active-padding: var(--space-8);
    --tabbar-active-tab-border-color: var(--color-transparent);
    --tabbar-active-tab-border-width: var(--border-width-0);
    --tabbar-active-tab-top-radius: var(--radius-none);
    --tabbar-active-tab-bottom-radius: var(--radius-none);

    /* Disabled tab */
    --tabbar-disabled-text: var(--text-disabled);
    --tabbar-disabled-text-font-family: var(--font-sans);
    --tabbar-disabled-text-font-size: var(--font-size-md);
    --tabbar-disabled-text-font-weight: var(--font-weight-light);
    --tabbar-disabled-text-line-height: var(--line-height-md);
    --tabbar-disabled-icon-size: var(--icon-size-md);
    --tabbar-disabled-padding: var(--space-8);
    --tabbar-disabled-border: var(--color-transparent);
    --tabbar-disabled-surface: var(--color-transparent);
    --tabbar-disabled-tab-border-color: var(--color-transparent);
    --tabbar-disabled-tab-border-width: var(--border-width-0);
    --tabbar-disabled-tab-top-radius: var(--radius-none);
    --tabbar-disabled-tab-bottom-radius: var(--radius-none);
  }

  .tab-bar {
    display: flex;
    gap: var(--tabbar-tab-gap);
    border-bottom: var(--tabbar-bar-divider-thickness) solid var(--tabbar-bar-divider);
    margin-top: var(--tabbar-bar-top-margin);
    padding-bottom: var(--tabbar-bar-bottom-padding);
    margin-bottom: var(--tabbar-bar-bottom-margin);
  }

  /* Per-state tokens are bound to `--_*` custom properties below. The actual
     layout-affecting declarations (padding, border, border-radius, font-*)
     are written exactly once on `.tab`, so a hover/active state change can
     only repaint, not relayout. When two states resolve to the same value,
     the computed property is identical and no reshape is triggered. The
     `transition: all` of the old rule has also been narrowed to paint-only
     properties — otherwise it would try to animate layout changes between
     states that happen to differ in tokens. */
  .tab {
    --_text-color: var(--tabbar-default-text);
    --_text-family: var(--tabbar-default-text-font-family);
    --_text-size: var(--tabbar-default-text-font-size);
    --_text-weight: var(--tabbar-default-text-font-weight);
    --_text-line-height: var(--tabbar-default-text-line-height);
    --_icon-size: var(--tabbar-default-icon-size);
    --_surface: var(--tabbar-default-surface);
    --_indicator-color: var(--tabbar-default-border);
    --_padding: var(--tabbar-default-padding);
    --_border-color: var(--tabbar-default-tab-border-color);
    --_border-width: var(--tabbar-default-tab-border-width);
    --_top-radius: var(--tabbar-default-tab-top-radius);
    --_bottom-radius: var(--tabbar-default-tab-bottom-radius);

    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--_padding) calc(var(--_padding) * 2);
    background: var(--_surface);
    border: var(--_border-width) solid var(--_border-color);
    /* Indicator accent owns the bottom edge. Thickness is constant across
       states (--tabbar-bar-indicator-thickness), only color rebinds. */
    border-bottom: var(--tabbar-bar-indicator-thickness) solid var(--_indicator-color);
    border-radius: var(--_top-radius) var(--_top-radius) var(--_bottom-radius) var(--_bottom-radius);
    color: var(--_text-color);
    font-family: var(--_text-family);
    font-size: var(--_text-size);
    font-weight: var(--_text-weight);
    line-height: var(--_text-line-height);
    cursor: pointer;
    transition:
      background var(--duration-150),
      color var(--duration-150),
      border-color var(--duration-150);
    position: relative;
  }

  .tab i {
    font-size: var(--_icon-size);
  }

  .tab:hover:not(:disabled):not(.active),
  .tab-bar.force-hover .tab:not(:disabled):not(.active) {
    --_text-color: var(--tabbar-hover-text);
    --_text-family: var(--tabbar-hover-text-font-family);
    --_text-size: var(--tabbar-hover-text-font-size);
    --_text-weight: var(--tabbar-hover-text-font-weight);
    --_text-line-height: var(--tabbar-hover-text-line-height);
    --_icon-size: var(--tabbar-hover-icon-size);
    --_surface: var(--tabbar-hover-surface);
    --_indicator-color: var(--tabbar-hover-border);
    --_padding: var(--tabbar-hover-padding);
    --_border-color: var(--tabbar-hover-tab-border-color);
    --_border-width: var(--tabbar-hover-tab-border-width);
    --_top-radius: var(--tabbar-hover-tab-top-radius);
    --_bottom-radius: var(--tabbar-hover-tab-bottom-radius);
  }

  .tab.active {
    --_text-color: var(--tabbar-active-text);
    --_text-family: var(--tabbar-active-text-font-family);
    --_text-size: var(--tabbar-active-text-font-size);
    --_text-weight: var(--tabbar-active-text-font-weight);
    --_text-line-height: var(--tabbar-active-text-line-height);
    --_icon-size: var(--tabbar-active-icon-size);
    --_surface: var(--tabbar-active-surface);
    --_indicator-color: var(--tabbar-active-border);
    --_padding: var(--tabbar-active-padding);
    --_border-color: var(--tabbar-active-tab-border-color);
    --_border-width: var(--tabbar-active-tab-border-width);
    --_top-radius: var(--tabbar-active-tab-top-radius);
    --_bottom-radius: var(--tabbar-active-tab-bottom-radius);
  }

  .tab:disabled {
    --_text-color: var(--tabbar-disabled-text);
    --_text-family: var(--tabbar-disabled-text-font-family);
    --_text-size: var(--tabbar-disabled-text-font-size);
    --_text-weight: var(--tabbar-disabled-text-font-weight);
    --_text-line-height: var(--tabbar-disabled-text-line-height);
    --_icon-size: var(--tabbar-disabled-icon-size);
    --_surface: var(--tabbar-disabled-surface);
    --_indicator-color: var(--tabbar-disabled-border);
    --_padding: var(--tabbar-disabled-padding);
    --_border-color: var(--tabbar-disabled-tab-border-color);
    --_border-width: var(--tabbar-disabled-tab-border-width);
    --_top-radius: var(--tabbar-disabled-tab-top-radius);
    --_bottom-radius: var(--tabbar-disabled-tab-bottom-radius);
    cursor: not-allowed;
  }

  .tab.icon-only {
    padding: var(--space-8) var(--space-12);
  }
</style>
