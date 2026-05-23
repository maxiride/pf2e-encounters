<script lang="ts" generics="F extends { fileName: string; name: string; updatedAt?: string; isProtected?: boolean }">
  import { stopPropagation } from 'svelte/legacy';
  import UIDialog from './UIDialog.svelte';

  interface Props {
    show: boolean;
    title: string;
    files: F[];
    activeFileName: string;
    /** Show name/date sort headers above the list. */
    sortable?: boolean;
    /** Render the updatedAt column on each row. */
    showUpdatedAt?: boolean;
    /** Identify the protected/system file. Default: `file.isProtected ?? file.fileName === 'default'`. */
    isProtected?: (file: F) => boolean;
    /** Whether the delete button should appear for a row. Default: `!isProtected(file)`. */
    canDelete?: (file: F) => boolean;
    /** Render a "system" badge next to protected rows. Null hides it. */
    systemBadge?: { label: string; title: string } | null;
    /** Shown when `files` is empty. Omit to render no row at all. */
    emptyMessage?: string;
    width?: string;
    onload: (file: F) => void;
    ondelete?: (file: F) => void;
    /** Optional per-row export action — e.g. download a manifest bundle.
     *  When omitted, no export button renders. */
    onexport?: (file: F) => void;
    /** Tooltip for the per-row export button. Falls back to "Export {name}". */
    exportTitle?: (file: F) => string;
  }

  let {
    show = $bindable(false),
    title,
    files,
    activeFileName,
    sortable = false,
    showUpdatedAt = false,
    isProtected = (f) => f.isProtected ?? f.fileName === 'default',
    canDelete,
    systemBadge = null,
    emptyMessage,
    width = '420px',
    onload,
    ondelete,
    onexport,
    exportTitle,
  }: Props = $props();

  type SortKey = 'name' | 'updatedAt';
  let sortKey: SortKey = $state('updatedAt');
  let sortDir: 'asc' | 'desc' = $state('desc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = key === 'name' ? 'asc' : 'desc';
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  function formatUpdatedAt(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return dateFormatter.format(d);
  }

  let sortedFiles = $derived(
    sortable
      ? [...files].sort((a, b) => {
          let cmp = 0;
          if (sortKey === 'name') {
            cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
          } else {
            cmp = (a.updatedAt || '').localeCompare(b.updatedAt || '');
          }
          return sortDir === 'asc' ? cmp : -cmp;
        })
      : files,
  );

  function handleLoad(file: F) {
    onload(file);
  }

  function handleDelete(file: F) {
    ondelete?.(file);
  }

  function shouldShowDelete(file: F): boolean {
    if (!ondelete) return false;
    if (canDelete) return canDelete(file);
    return !isProtected(file);
  }
</script>

<UIDialog bind:show {title} cancelLabel="Close" {width}>
  <div class="load-list">
    {#if sortable}
      <div class="load-header">
        <button
          class="sort-btn name-col"
          class:active-sort={sortKey === 'name'}
          onclick={() => toggleSort('name')}
        >
          <span>Name</span>
          {#if sortKey === 'name'}
            <i class="fas {sortDir === 'asc' ? 'fa-caret-up' : 'fa-caret-down'}"></i>
          {/if}
        </button>
        {#if showUpdatedAt}
          <button
            class="sort-btn date-col"
            class:active-sort={sortKey === 'updatedAt'}
            onclick={() => toggleSort('updatedAt')}
          >
            <span>Date</span>
            {#if sortKey === 'updatedAt'}
              <i class="fas {sortDir === 'asc' ? 'fa-caret-up' : 'fa-caret-down'}"></i>
            {/if}
          </button>
        {/if}
        <span class="header-spacer"></span>
      </div>
    {/if}
    {#each sortedFiles as file (file.fileName)}
      {@const protectedRow = isProtected(file)}
      <div
        class="load-item"
        class:active={file.fileName === activeFileName}
        class:protected={protectedRow}
      >
        <button class="load-name-btn" onclick={() => handleLoad(file)}>
          {#if protectedRow}
            <i class="fas fa-lock system-glyph" aria-hidden="true"></i>
          {/if}
          <span class="load-name-text">{file.name}</span>
        </button>
        {#if protectedRow && systemBadge}
          <span class="system-badge" title={systemBadge.title}>{systemBadge.label}</span>
        {/if}
        {#if showUpdatedAt}
          <span class="updated-at" title={file.updatedAt}>{formatUpdatedAt(file.updatedAt)}</span>
        {/if}
        {#if file.fileName === activeFileName}
          <span class="active-badge">active</span>
        {/if}
        {#if onexport}
          <button
            class="file-action-btn"
            onclick={stopPropagation(() => onexport!(file))}
            title={exportTitle ? exportTitle(file) : `Export ${file.name}`}
          >
            <i class="fas fa-download"></i>
          </button>
        {/if}
        {#if shouldShowDelete(file)}
          <button
            class="file-delete-btn"
            onclick={stopPropagation(() => handleDelete(file))}
            title="Delete {file.name}"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        {/if}
      </div>
    {/each}
    {#if files.length === 0 && emptyMessage}
      <div class="load-item empty">{emptyMessage}</div>
    {/if}
  </div>
</UIDialog>

<style>
  .load-list {
    display: flex;
    flex-direction: column;
    max-height: 60vh;
    overflow-y: auto;
  }

  .load-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-bottom: 1px solid #3a3a3a;
    position: sticky;
    top: 0;
    background: var(--ui-surface, #1a1a1a);
    z-index: 1;
  }

  .sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 0;
    background: none;
    border: none;
    color: #888;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    cursor: pointer;
    text-align: left;
  }

  .sort-btn:hover {
    color: #ccc;
  }

  .sort-btn.active-sort {
    color: #e0e0e0;
  }

  .sort-btn i {
    font-size: 10px;
    opacity: 0.85;
  }

  .sort-btn.name-col {
    flex: 1;
    min-width: 0;
    padding-left: 4px;
  }

  .sort-btn.date-col {
    flex-shrink: 0;
  }

  .header-spacer {
    flex-shrink: 0;
    width: 24px;
  }

  .load-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-bottom: 1px solid #2a2a2a;
  }

  .load-item:last-child {
    border-bottom: none;
  }

  .load-item.empty {
    padding: 16px;
    color: #888;
    font-size: 14px;
    text-align: center;
  }

  .load-name-btn {
    flex: 1;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 4px;
    background: none;
    border: none;
    color: #aaa;
    font-size: 14px;
    cursor: pointer;
    text-align: left;
    border-radius: 3px;
  }

  .load-name-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .load-name-btn:hover {
    color: #e0e0e0;
  }

  .load-item.active .load-name-btn {
    color: #e0e0e0;
    font-weight: 600;
  }

  .load-item.protected .load-name-btn {
    font-style: italic;
    color: #888;
  }

  .load-item.protected.active .load-name-btn {
    color: #c0c0c0;
  }

  .system-glyph {
    flex: 0 0 auto;
    font-size: 0.78em;
    color: #666;
  }

  .system-badge {
    flex-shrink: 0;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 3px;
    background: transparent;
    border: 1px solid #3a3a3a;
    color: #888;
    text-transform: uppercase;
  }

  .updated-at {
    flex-shrink: 0;
    font-size: 12px;
    color: #777;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .active-badge {
    flex-shrink: 0;
    font-size: 12px;
    padding: 1px 6px;
    border-radius: 3px;
    background: #333;
    color: #ccc;
  }

  .file-delete-btn,
  .file-action-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    color: #555;
    font-size: 12px;
    cursor: pointer;
    opacity: 0;
  }

  .load-item:hover .file-delete-btn,
  .load-item:hover .file-action-btn {
    opacity: 1;
  }

  .file-delete-btn:hover,
  .file-action-btn:hover {
    color: #ccc;
  }
</style>
