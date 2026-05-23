<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type Item = {
    value: string;
    label: string;
    icon?: string;
    disabled?: boolean;
  };

  interface Props {
    items?: Item[];
    value?: string;
    /** Editor preview: force-hover one item by value. */
    forceHoverValue?: string | null;
    /** Min-width of the menu panel, any CSS length. */
    minWidth?: string;
    /** ARIA role on the wrapper. `listbox` for select-like menus; `menu` for command menus. */
    role?: 'listbox' | 'menu';
    /** Selection callback. */
    onchange?: (value: string) => void;
  }

  let {
    items = [],
    value = $bindable(''),
    forceHoverValue = null,
    minWidth = undefined,
    role = 'listbox',
    onchange,
  }: Props = $props();

  // Dual-fire bridge — see Button.svelte for the deprecation timeline.
  const dispatch = createEventDispatcher<{ change: string }>();

  function select(v: string) {
    value = v;
    onchange?.(v);
    dispatch('change', v);
  }
</script>

<ul
  class="menuselect"
  {role}
  style:min-width={minWidth}
>
  {#each items as item (item.value)}
    <li>
      <button
        type="button"
        class="menuselect-item"
        class:selected={value === item.value}
        class:force-hover={forceHoverValue === item.value}
        disabled={item.disabled}
        role={role === 'listbox' ? 'option' : 'menuitem'}
        aria-selected={role === 'listbox' ? value === item.value : undefined}
        onclick={() => select(item.value)}
      >
        {#if item.icon}<i class="menuselect-icon {item.icon}" aria-hidden="true"></i>{/if}
        <span class="menuselect-label">{item.label}</span>
        {#if value === item.value}
          <i class="menuselect-indicator fas fa-check" aria-hidden="true"></i>
        {/if}
      </button>
    </li>
  {/each}
</ul>

<style lang="scss">
  @use '../styles/padding' as *;

  :global(:root) {
    /* Menu panel */
    --menuselect-menu-surface: var(--surface-neutral-lower);
    --menuselect-menu-border: var(--border-neutral-faint);
    --menuselect-menu-border-width: var(--border-width-1);
    --menuselect-menu-radius: var(--radius-md);
    --menuselect-menu-padding: var(--space-4);
    --menuselect-menu-gap: var(--space-2);
    --menuselect-menu-shadow: var(--shadow-md);

    /* Item geometry (shared across states — link on by default) */
    --menuselect-item-radius: var(--radius-sm);
    --menuselect-item-padding: var(--space-8);

    /* Default item */
    --menuselect-default-surface: var(--color-transparent);
    --menuselect-default-text: var(--text-secondary);
    --menuselect-default-text-font-family: var(--font-sans);
    --menuselect-default-text-font-size: var(--font-size-sm);
    --menuselect-default-text-font-weight: var(--font-weight-normal);
    --menuselect-default-text-line-height: var(--line-height-sm);
    --menuselect-default-icon: var(--text-tertiary);
    --menuselect-default-icon-size: var(--icon-size-sm);

    /* Hover item */
    --menuselect-hover-surface: var(--surface-neutral-higher);
    --menuselect-hover-text: var(--text-primary);
    --menuselect-hover-text-font-family: var(--font-sans);
    --menuselect-hover-text-font-size: var(--font-size-sm);
    --menuselect-hover-text-font-weight: var(--font-weight-normal);
    --menuselect-hover-text-line-height: var(--line-height-sm);
    --menuselect-hover-icon: var(--text-primary);
    --menuselect-hover-icon-size: var(--icon-size-sm);

    /* Selected item */
    --menuselect-selected-surface: var(--surface-brand-low);
    --menuselect-selected-text: var(--text-primary);
    --menuselect-selected-text-font-family: var(--font-sans);
    --menuselect-selected-text-font-size: var(--font-size-sm);
    --menuselect-selected-text-font-weight: var(--font-weight-semibold);
    --menuselect-selected-text-line-height: var(--line-height-sm);
    --menuselect-selected-icon: var(--text-brand);
    --menuselect-selected-icon-size: var(--icon-size-sm);
    --menuselect-selected-indicator: var(--text-brand);

    /* Disabled item */
    --menuselect-disabled-surface: var(--color-transparent);
    --menuselect-disabled-text: var(--text-tertiary);
    --menuselect-disabled-text-font-family: var(--font-sans);
    --menuselect-disabled-text-font-size: var(--font-size-sm);
    --menuselect-disabled-text-font-weight: var(--font-weight-normal);
    --menuselect-disabled-text-line-height: var(--line-height-sm);
    --menuselect-disabled-icon: var(--text-tertiary);
    --menuselect-disabled-icon-size: var(--icon-size-sm);
  }

  .menuselect {
    list-style: none;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--menuselect-menu-gap);
    @include themed-padding(--menuselect-menu-padding);
    background: var(--menuselect-menu-surface);
    border: var(--menuselect-menu-border-width) solid var(--menuselect-menu-border);
    border-radius: var(--menuselect-menu-radius);
    box-shadow: var(--menuselect-menu-shadow);
    width: max-content;
  }

  .menuselect li {
    display: block;
  }

  .menuselect-item {
    display: flex;
    width: 100%;
    align-items: center;
    gap: var(--space-8);
    @include themed-padding(--menuselect-item-padding);
    background: var(--menuselect-default-surface);
    border: 0;
    border-radius: var(--menuselect-item-radius);
    color: var(--menuselect-default-text);
    font-family: var(--menuselect-default-text-font-family);
    font-size: var(--menuselect-default-text-font-size);
    font-weight: var(--menuselect-default-text-font-weight);
    line-height: var(--menuselect-default-text-line-height);
    text-align: left;
    cursor: pointer;
    transition: background var(--duration-150), color var(--duration-150);
  }

  .menuselect-icon {
    font-size: var(--menuselect-default-icon-size);
    color: var(--menuselect-default-icon);
    width: 1em;
    text-align: center;
    transition: color var(--duration-150), font-size var(--duration-150);
  }

  .menuselect-label {
    flex: 1 1 auto;
  }

  .menuselect-indicator {
    margin-left: var(--space-8);
    color: var(--menuselect-selected-indicator);
    font-size: var(--menuselect-default-icon-size);
  }

  .menuselect-item:hover:not(:disabled):not(.selected),
  .menuselect-item.force-hover:not(:disabled):not(.selected) {
    background: var(--menuselect-hover-surface);
    color: var(--menuselect-hover-text);
    font-family: var(--menuselect-hover-text-font-family);
    font-size: var(--menuselect-hover-text-font-size);
    font-weight: var(--menuselect-hover-text-font-weight);
    line-height: var(--menuselect-hover-text-line-height);
  }

  .menuselect-item:hover:not(:disabled):not(.selected) .menuselect-icon,
  .menuselect-item.force-hover:not(:disabled):not(.selected) .menuselect-icon {
    color: var(--menuselect-hover-icon);
    font-size: var(--menuselect-hover-icon-size);
  }

  .menuselect-item.selected {
    background: var(--menuselect-selected-surface);
    color: var(--menuselect-selected-text);
    font-family: var(--menuselect-selected-text-font-family);
    font-size: var(--menuselect-selected-text-font-size);
    font-weight: var(--menuselect-selected-text-font-weight);
    line-height: var(--menuselect-selected-text-line-height);
  }

  .menuselect-item.selected .menuselect-icon {
    color: var(--menuselect-selected-icon);
    font-size: var(--menuselect-selected-icon-size);
  }

  .menuselect-item:disabled {
    background: var(--menuselect-disabled-surface);
    color: var(--menuselect-disabled-text);
    font-family: var(--menuselect-disabled-text-font-family);
    font-size: var(--menuselect-disabled-text-font-size);
    font-weight: var(--menuselect-disabled-text-font-weight);
    line-height: var(--menuselect-disabled-text-line-height);
    cursor: not-allowed;
    opacity: 0.55;
  }

  .menuselect-item:disabled .menuselect-icon {
    color: var(--menuselect-disabled-icon);
    font-size: var(--menuselect-disabled-icon-size);
  }
</style>
