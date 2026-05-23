<script lang="ts">
  import { run, createBubbler, stopPropagation } from 'svelte/legacy';

  const bubble = createBubbler();
  import { onMount, onDestroy } from 'svelte';
  import UIRadio from './UIRadio.svelte';
  import { keepInViewport } from './keepInViewport';

  type Candidate = { variable: string; alias: string };

  interface Props {
    candidates: Candidate[];
    /** Variable whose lock was clicked — its alias is the default selection. */
    initialVariable: string;
    /** Component prefix to strip when rendering source labels. */
    prefixToStrip?: string;
    onconfirm?: (payload: { alias: string }) => void;
    oncancel?: () => void;
  }

  let { candidates, initialVariable, prefixToStrip = '', onconfirm, oncancel }: Props = $props();

  type Option = { alias: string; sources: string[] };

  function distinctOptions(list: Candidate[], initial: string): Option[] {
    const ordered = [...list].sort((a, b) =>
      a.variable === initial ? -1 : b.variable === initial ? 1 : 0,
    );
    const seen = new Map<string, Option>();
    for (const c of ordered) {
      const label = prefixToStrip && c.variable.startsWith(prefixToStrip)
        ? c.variable.slice(prefixToStrip.length)
        : c.variable;
      const existing = seen.get(c.alias);
      if (existing) existing.sources.push(label);
      else seen.set(c.alias, { alias: c.alias, sources: [label] });
    }
    return [...seen.values()];
  }

  let options = $derived(distinctOptions(candidates, initialVariable));
  let selected = $state('');
  run(() => {
    if (selected === '' && options.length > 0) selected = options[0].alias;
  });

  function handleConfirm() {
    if (!selected) return;
    onconfirm?.({ alias: selected });
  }

  function handleCancel() {
    oncancel?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    } else if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
      e.preventDefault();
      handleConfirm();
    }
  }

  let popoverEl: HTMLDivElement | undefined = $state();

  onMount(() => {
    popoverEl?.focus();
    document.addEventListener('keydown', handleKeydown, true);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown, true);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="ui-relink-popover"
  role="dialog"
  aria-label="Confirm link"
  tabindex="-1"
  bind:this={popoverEl}
  use:keepInViewport
  onclick={stopPropagation(bubble('click'))}
>
  <div class="ui-relink-header">
    {#if options.length > 1}
      <span class="ui-relink-title">{candidates.length} variants disagree — pick one to broadcast</span>
    {:else}
      <span class="ui-relink-title">Link this property across {candidates.length} variants?</span>
    {/if}
  </div>

  <div class="ui-relink-body">
    {#each options as opt}
      <label class="ui-relink-row">
        <UIRadio bind:group={selected} value={opt.alias} />
        <div class="ui-relink-row-info">
          <code class="ui-relink-alias">{opt.alias}</code>
          <span class="ui-relink-sources">
            from {opt.sources.join(', ')}
          </span>
        </div>
      </label>
    {/each}
  </div>

  <div class="ui-relink-footer">
    <button type="button" class="ui-relink-btn ui-relink-btn-cancel" onclick={handleCancel}>Cancel</button>
    <button type="button" class="ui-relink-btn ui-relink-btn-confirm" onclick={handleConfirm}>Link</button>
  </div>
</div>

<style>
  .ui-relink-popover {
    position: absolute;
    top: calc(100% + var(--ui-space-4));
    right: 0;
    background: var(--ui-surface-higher);
    border: 1px solid var(--ui-border-high);
    border-radius: var(--ui-radius-md);
    box-shadow: var(--ui-shadow-lg);
    z-index: 20;
    min-width: 18rem;
    max-width: 24rem;
    padding: var(--ui-space-8);
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    animation: uiRelinkPopoverIn 120ms ease-out;
  }

  .ui-relink-popover:focus {
    outline: none;
  }

  .ui-relink-header {
    border-bottom: 1px solid var(--ui-border-low);
    padding-bottom: var(--ui-space-6);
  }

  .ui-relink-title {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    font-weight: var(--ui-font-weight-medium);
  }

  .ui-relink-body {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .ui-relink-row {
    display: flex;
    align-items: flex-start;
    gap: var(--ui-space-8);
    padding: var(--ui-space-4);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    transition: background var(--ui-transition-fast);
  }

  .ui-relink-row:hover {
    background: var(--ui-hover);
  }

  /* Lift the radio slightly so it visually aligns with the first line of the
     two-line row label. Selection styling lives in UIRadio. */
  .ui-relink-row :global(.ui-radio) {
    margin-top: 0.2rem;
  }

  .ui-relink-row-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }

  .ui-relink-alias {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ui-relink-sources {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ui-relink-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--ui-space-6);
    padding-top: var(--ui-space-4);
    border-top: 1px solid var(--ui-border-low);
  }

  .ui-relink-btn {
    padding: var(--ui-space-4) var(--ui-space-12);
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-medium);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .ui-relink-btn-cancel {
    background: transparent;
    border: 1px solid var(--ui-border);
    color: var(--ui-text-secondary);
  }

  .ui-relink-btn-cancel:hover {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .ui-relink-btn-confirm {
    background: var(--ui-text-accent);
    border: 1px solid var(--ui-text-accent);
    color: var(--ui-surface-lowest);
  }

  .ui-relink-btn-confirm:hover {
    filter: brightness(1.1);
  }

  @keyframes uiRelinkPopoverIn {
    from { opacity: 0; transform: translateY(-2px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
