<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { getEditorContext } from './editorContext';

  type Source = { name: string; label: string; states: string[] };

  interface Props {
    toState: string;
    variantName: string;
    copySources?: Source[];
    placement?: 'start' | 'end';
    onselect?: (payload: { fromVariant: string; fromState: string }) => void;
  }

  let {
    toState,
    variantName,
    copySources = [],
    placement = 'start',
    onselect
  }: Props = $props();

  let open = $state(false);
  let root: HTMLElement | undefined = $state();
  /** When true, copy rewrites the source variant segment in palette aliases
      (e.g. `--surface-accent-high` → `--surface-primary-high`) so cross-variant
      copies preserve color identity while picking up shape/typography choices.
      Lifted to editor context so the toggle persists across VariantGroup
      remounts (focus-mode swaps unmount the previous group). */
  const editorCtx = getEditorContext();
  const preserveColorFamilyStore = editorCtx?.preserveColorFamily ?? writable(false);

  function toggle() {
    open = !open;
  }

  function pick(fromVariant: string, fromState: string) {
    open = false;
    onselect?.({ fromVariant, fromState });
  }

  function handleDocClick(e: MouseEvent) {
    if (!open) return;
    if (root && !root.contains(e.target as Node)) open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) open = false;
  }

  onMount(() => {
    document.addEventListener('click', handleDocClick, true);
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleDocClick, true);
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="copy-from" class:placement-end={placement === 'end'} bind:this={root}>
  <button
    type="button"
    class="copy-from-btn"
    class:active={open}
    onclick={toggle}
    title="Copy values from another variant/state"
  >
    <i class="fas fa-clone"></i>
    <span>Copy from</span>
  </button>
  {#if open}
    <div class="copy-menu" role="menu">
      <label class="copy-menu-toggle">
        <input type="checkbox" bind:checked={$preserveColorFamilyStore} />
        <span>Preserve color families</span>
      </label>
      <div class="copy-menu-divider" aria-hidden="true"></div>
      {#each copySources as src}
        {#if src.states.length === 1}
          {@const onlyState = src.states[0]}
          {@const isSelf = src.name === variantName && onlyState === toState}
          <button
            type="button"
            class="copy-menu-item"
            disabled={isSelf}
            onclick={() => pick(src.name, onlyState)}
            role="menuitem"
          >
            <span>{src.label}</span>
            {#if isSelf}<span class="copy-menu-meta">current</span>{/if}
          </button>
        {:else}
          <div class="copy-menu-item-parent">
            <button
              type="button"
              class="copy-menu-item copy-menu-item-trigger"
              role="menuitem"
              aria-haspopup="menu"
            >
              <span>{src.label}</span>
              <i class="fas fa-chevron-right"></i>
            </button>
            <div class="copy-submenu" role="menu">
              {#each src.states as fromState}
                {@const isSelf = src.name === variantName && fromState === toState}
                <button
                  type="button"
                  class="copy-menu-item"
                  disabled={isSelf}
                  onclick={() => pick(src.name, fromState)}
                  role="menuitem"
                >
                  <span>{fromState}</span>
                  {#if isSelf}<span class="copy-menu-meta">current</span>{/if}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .copy-from {
    position: relative;
  }

  .copy-from-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-6);
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-xs);
    cursor: pointer;
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
    white-space: nowrap;
  }

  .copy-from-btn:hover,
  .copy-from-btn.active {
    color: var(--ui-text-primary);
    background: var(--ui-hover);
  }

  .copy-from-btn i {
    font-size: 0.85em;
  }

  .copy-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 12rem;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    padding: var(--ui-space-4);
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 20;
  }

  .placement-end .copy-menu {
    left: auto;
    right: 0;
  }

  .copy-menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast);
    width: 100%;
  }

  .copy-menu-item:hover:not(:disabled) {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
    box-shadow: inset 0 0 0 1px var(--ui-border-low);
  }

  .copy-menu-item:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .copy-menu-item i {
    font-size: 0.65em;
    color: var(--ui-text-muted);
  }

  .copy-menu-meta {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    font-style: italic;
  }

  .copy-menu-item-parent {
    position: relative;
  }

  .copy-menu-item-parent:hover > .copy-menu-item-trigger {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
    box-shadow: inset 0 0 0 1px var(--ui-border-low);
  }

  .copy-submenu {
    display: none;
    position: absolute;
    top: calc(-1 * var(--ui-space-4));
    left: 100%;
    min-width: 10rem;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    padding: var(--ui-space-4);
    flex-direction: column;
    gap: 2px;
    z-index: 21;
  }

  .placement-end .copy-submenu {
    left: auto;
    right: 100%;
  }

  /* Invisible hover bridge so the cursor doesn't lose the parent's :hover state
     while traveling between the menu item and its submenu. */
  .copy-submenu::before {
    content: '';
    position: absolute;
    top: 0;
    right: 100%;
    width: 8px;
    height: 100%;
  }

  .placement-end .copy-submenu::before {
    right: auto;
    left: 100%;
  }

  .copy-menu-item-parent:hover > .copy-submenu {
    display: flex;
  }

  .copy-menu-toggle {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
  }

  .copy-menu-toggle:hover {
    color: var(--ui-text-primary);
  }

  .copy-menu-toggle input {
    margin: 0;
    cursor: pointer;
  }

  .copy-menu-divider {
    height: 1px;
    background: var(--ui-border-low);
    margin: 2px 0;
  }
</style>
