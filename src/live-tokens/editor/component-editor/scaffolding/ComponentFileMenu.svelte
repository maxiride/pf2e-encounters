<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { ComponentConfigMeta } from '../../core/themes/themeTypes';
  import FileLoadList from '../../ui/FileLoadList.svelte';
  import UISquareButton from '../../ui/UISquareButton.svelte';

  interface Props {
    /** Component slug used in the load-dialog title (e.g. "button"). */
    component: string;
    /** Files shown in the load dialog. */
    files?: ComponentConfigMeta[];
    /** Currently active file — highlighted in the load list. */
    activeFileName?: string;
    onsave?: () => void;
    onsaveAs?: () => void;
    /** Fired when the user clicks "Load…" in the menu — parent should refresh `files`. */
    onopenLoad?: () => void;
    onload?: (file: ComponentConfigMeta) => void;
    ondelete?: (file: ComponentConfigMeta) => void;
  }

  let {
    component,
    files = [],
    activeFileName = 'default',
    onsave,
    onsaveAs,
    onopenLoad,
    onload,
    ondelete,
  }: Props = $props();

  let fileMenuOpen = $state(false);
  let fileMenuRoot: HTMLElement | undefined = $state();
  let showFileList = $state(false);

  onMount(() => {
    document.addEventListener('click', handleDocClick, true);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleDocClick, true);
  });

  function handleDocClick(e: MouseEvent) {
    if (!fileMenuOpen) return;
    if (fileMenuRoot && !fileMenuRoot.contains(e.target as Node)) {
      fileMenuOpen = false;
    }
  }

  function handleSave() {
    fileMenuOpen = false;
    onsave?.();
  }

  function handleSaveAs() {
    fileMenuOpen = false;
    onsaveAs?.();
  }

  function handleOpenLoad() {
    fileMenuOpen = false;
    showFileList = true;
    onopenLoad?.();
  }

  function handleLoad(file: ComponentConfigMeta) {
    showFileList = false;
    onload?.(file);
  }

  function handleDelete(file: ComponentConfigMeta) {
    ondelete?.(file);
  }
</script>

<div class="file-menu" bind:this={fileMenuRoot}>
  <UISquareButton
    icon="fa-file"
    active={fileMenuOpen}
    onclick={() => (fileMenuOpen = !fileMenuOpen)}
    title="File menu"
  >
    <span>File</span>
    <i class="fas fa-chevron-down chevron" class:open={fileMenuOpen}></i>
  </UISquareButton>
  {#if fileMenuOpen}
    <div class="file-menu-dropdown" role="menu">
      <button class="file-menu-item" onclick={handleSave} role="menuitem">
        <i class="fas fa-save"></i>
        <span>Save</span>
      </button>
      <button class="file-menu-item" onclick={handleSaveAs} role="menuitem">
        <i class="fas fa-copy"></i>
        <span>Save As…</span>
      </button>
      <button class="file-menu-item" onclick={handleOpenLoad} role="menuitem">
        <i class="fas fa-folder-open"></i>
        <span>Load…</span>
      </button>
    </div>
  {/if}
</div>

<FileLoadList
  bind:show={showFileList}
  title="Load {component} Config"
  {files}
  {activeFileName}
  systemBadge={{ label: 'system', title: 'Protected system config' }}
  emptyMessage="No saved files"
  onload={handleLoad}
  ondelete={handleDelete}
/>

<style>
  :global(.file-menu .chevron) {
    font-size: 0.7em;
    transition: transform var(--ui-transition-fast);
  }

  :global(.file-menu .chevron.open) {
    transform: rotate(180deg);
  }

  .file-menu {
    position: relative;
  }

  .file-menu-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 160px;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.4));
    padding: var(--ui-space-4);
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 10;
  }

  .file-menu-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast);
  }

  .file-menu-item i {
    width: 1rem;
    text-align: center;
  }

  .file-menu-item:hover {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }
</style>
