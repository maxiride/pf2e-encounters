<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';
  import { setCssVar, removeCssVar, CSS_VAR_CHANGE_EVENT } from '../core/cssVarSync';
  import type { CssVarRef } from '../core/store/editorTypes';
  import {
    editorState,
    setComponentAlias,
    clearComponentAlias,
    setComponentAliasLinked,
    clearComponentAliasLinked,
    isComponentPropertyLinked,
    unlinkComponentProperty,
    relinkComponentProperty,
    getComponentPropertySiblings,
  } from '../core/store/editorStore';
  import UILinkToggle from './UILinkToggle.svelte';
  import UIRelinkConfirmPopover from './UIRelinkConfirmPopover.svelte';
  import { keepInViewport } from './keepInViewport';

  type DropdownContext = { close: () => void; handleReset: () => void };

  interface Props {
    variable: string;
    /** When set, writes persist through the editor store under this component. */
    component?: string | undefined;
    /** When true, render a link toggle that lets the user share this value across all sibling variants. */
    canBeLinked?: boolean;
    /** Minimum width of the dropdown panel. */
    dropdownMinWidth?: string;
    /** Max width of the dropdown panel (useful for grids). */
    dropdownMaxWidth?: string;
    /** When true, the default dropdown header (variable name + reset) is omitted. */
    hideDefaultHeader?: boolean;
    /** When true, the trigger becomes non-interactive and visually dimmed. */
    disabled?: boolean;
    /** When true, the trigger opens normally but the dropdown's selection area is
     *  dimmed and non-interactive. The lock toggle in the header stays active so
     *  the user can re-engage editing by re-linking. Used by the linked block to
     *  make the row openable even when currently unshared. */
    selectionsLocked?: boolean;
    /** Optional preview rendered before the trigger text (e.g. swatch). Renamed from `slot="trigger-preview"` in 0.5.0. */
    triggerPreview?: Snippet;
    /** Optional full trigger text replacement. Falls back to `triggerTitle`. Renamed from `slot="trigger-text"` in 0.5.0. */
    triggerText?: Snippet;
    /** Optional trigger title text. Renamed from `slot="trigger-title"` in 0.5.0. */
    triggerTitle?: Snippet;
    /** Optional meta text rendered after the trigger. Renamed from `slot="trigger-meta"` in 0.5.0. */
    triggerMeta?: Snippet;
    /** Optional dropdown header replacement. */
    header?: Snippet;
    /** Optional dropdown content above the selections. */
    subheader?: Snippet;
    /** Dropdown body content; receives `{ close, handleReset }`. */
    children?: Snippet<[DropdownContext]>;
    onchange?: () => void;
    onreset?: () => void;
    onopen?: () => void;
    onclose?: () => void;
    onvarChange?: () => void;
  }

  let {
    variable,
    component = undefined,
    canBeLinked = false,
    dropdownMinWidth = '14rem',
    dropdownMaxWidth = '',
    hideDefaultHeader = false,
    disabled = false,
    selectionsLocked = false,
    triggerPreview,
    triggerText,
    triggerTitle,
    triggerMeta,
    header,
    subheader,
    children,
    onchange,
    onreset,
    onopen,
    onclose,
    onvarChange,
  }: Props = $props();

  let open = $state(false);
  let container: HTMLElement;
  let relinkOpen = $state(false);
  let relinkCandidates: { variable: string; alias: string }[] = $state([]);

  let isLinkedFromData = $derived(canBeLinked && component && $editorState
    ? isComponentPropertyLinked(component, variable)
    : false);
  let isLinkedDisplay = $derived(canBeLinked && !!component && isLinkedFromData);
  let peerCount = $derived(canBeLinked && component && $editorState
    ? getComponentPropertySiblings(component, variable).length
    : 0);
  let hasSiblings = $derived(peerCount >= 2);
  let showLinkToggle = $derived(canBeLinked && !!component && hasSiblings);

  /** Persist a semantic CSS-var reference (or clear it when null). */
  export function writeOverride(semanticName: string | null): void {
    if (component) {
      const useLinked = isLinkedDisplay;
      if (semanticName) {
        // Mirror splitAliasesAndConfig: a `--…` reference becomes a token
        // (rendered as `var(name)`); anything else (color-mix expressions,
        // `transparent`, gradient tokens already wrapped) is a literal whose
        // value is emitted as-is. Storing complex CSS as a token would render
        // `var(color-mix(...))`, which is invalid and breaks the preview.
        const ref: CssVarRef = semanticName.startsWith('--')
          ? { kind: 'token', name: semanticName }
          : { kind: 'literal', value: semanticName };
        if (useLinked) setComponentAliasLinked(component, variable, ref);
        else setComponentAlias(component, variable, ref);
      } else {
        if (useLinked) clearComponentAliasLinked(component, variable);
        else clearComponentAlias(component, variable);
      }
      return;
    }
    if (semanticName) {
      setCssVar(variable, semanticName.startsWith('--') ? `var(${semanticName})` : semanticName);
    } else {
      removeCssVar(variable);
    }
  }

  export function close() {
    if (!open) return;
    open = false;
    onclose?.();
  }

  function toggle() {
    if (disabled) return;
    open = !open;
    if (open) onopen?.();
    else onclose?.();
  }

  $effect(() => {
    if (disabled && open) close();
  });

  function toggleLinked() {
    if (!canBeLinked || !component) return;
    if (isLinkedDisplay) {
      unlinkComponentProperty(component, variable);
      onchange?.();
      return;
    }
    const slice = $editorState.components[component];
    if (!slice) return;
    const siblings = getComponentPropertySiblings(component, variable);
    if (siblings.length < 2) return;

    // Re-linking this property: figure out the value to adopt by inspecting the
    // siblings *currently linked* (those not in `unlinked`, excluding the target).
    // The target itself is rejoining, so its own value isn't a candidate unless
    // every other sibling has also detached.
    const linkedSiblings = siblings.filter(
      (v) => v !== variable && !slice.unlinked?.includes(v),
    );

    if (linkedSiblings.length === 0) {
      // No remaining linked siblings — promote this property's current value.
      const currentValue = slice.aliases[variable];
      if (currentValue) {
        setComponentAliasLinked(component, variable, currentValue);
        onchange?.();
      }
      return;
    }

    const candidates = linkedSiblings.map((v) => {
      const ref = slice.aliases[v];
      const alias = ref?.kind === 'token' ? ref.name : '';
      return { variable: v, alias };
    });
    const definedCandidates = candidates.filter((c) => c.alias);
    const distinctValues = new Set(definedCandidates.map((c) => c.alias));

    if (distinctValues.size <= 1) {
      // ≤1 explicit alias among peers: adopt it; if none of them have one,
      // promote this property's current value so the lock takes effect even
      // when peers are still at their declared defaults. If no alias exists
      // anywhere in the group, rejoin as pure metadata (the group is linked
      // at its upstream default and there's nothing to write).
      const adoptRef = definedCandidates.length > 0
        ? slice.aliases[definedCandidates[0].variable]
        : slice.aliases[variable];
      if (adoptRef) setComponentAliasLinked(component, variable, adoptRef);
      else relinkComponentProperty(component, variable);
      onchange?.();
      return;
    }

    relinkCandidates = candidates;
    relinkOpen = true;
  }

  function handleRelinkConfirm(payload: { alias: string }) {
    if (!component) return;
    setComponentAliasLinked(component, variable, { kind: 'token', name: payload.alias });
    onchange?.();
    relinkOpen = false;
  }

  function handleRelinkCancel() {
    relinkOpen = false;
  }

  function handleReset() {
    // Order matters: notify children of reset first so they can clear local
    // state, THEN clear the override. writeOverride fires CSS_VAR_CHANGE_EVENT
    // synchronously, which triggers `var-change` on children — that's where
    // each selector should re-derive its display state from the new default.
    //
    // Linked properties: writeOverride(null) routes through
    // `clearComponentAliasLinked`, which clears the shared override on every
    // linked peer. That's the natural meaning of "clear" on a linked group —
    // peers all return to the upstream default together, the link stays.
    // Per-peer resets while preserving the link are impossible by definition
    // (linked = peers share one value); a "reset just this one" intent is
    // really "unlink, then reset," which the user does in two visible steps.
    onreset?.();
    writeOverride(null);
    close();
    onchange?.();
  }

  function handleClickOutside(e: MouseEvent) {
    if (container && !container.contains(e.target as Node)) {
      close();
      relinkOpen = false;
    }
  }

  function handleVarChange(e: Event) {
    const detail = (e as CustomEvent<{ name: string }>).detail;
    if (detail?.name === variable) onvarChange?.();
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside, true);
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });
</script>

<div class="ui-token-selector" class:disabled bind:this={container}>
  <div class="ui-ts-trigger-wrap">
    <button
      class="ui-ts-trigger"
      class:linked={isLinkedDisplay}
      class:unlinked={showLinkToggle && !isLinkedDisplay}
      onclick={toggle}
      {disabled}
    >
      <div class="ui-ts-content">
        {#if triggerPreview}
          <div class="ui-ts-preview">
            {@render triggerPreview()}
          </div>
        {/if}
        <div class="ui-ts-text">
          {#if triggerText}
            {@render triggerText()}
          {:else if triggerTitle}
            <span class="ui-ts-category">{@render triggerTitle()}</span>
          {/if}
        </div>
      </div>
      <i class="fas fa-chevron-down ui-ts-chevron" class:open></i>
    </button>

    {#if relinkOpen && component}
      <UIRelinkConfirmPopover
        candidates={relinkCandidates}
        initialVariable={variable}
        prefixToStrip={`--${component}-`}
        onconfirm={handleRelinkConfirm}
        oncancel={handleRelinkCancel}
      />
    {/if}

    {#if open}
      <div
        class="ui-ts-dropdown"
        style="min-width: {dropdownMinWidth};{dropdownMaxWidth ? ` max-width: ${dropdownMaxWidth};` : ''}"
        use:keepInViewport
      >
        {#if !hideDefaultHeader}
          {#if header}
            {@render header()}
          {:else}
            <div class="ui-ts-header">
              {#if showLinkToggle}
                <UILinkToggle linked={isLinkedDisplay} ontoggle={toggleLinked} />
              {/if}
              <button
                type="button"
                class="ui-ts-reset"
                onclick={handleReset}
                disabled={selectionsLocked}
                title={selectionsLocked ? 'Unlock to reset' : 'Reset to default'}
              >
                <i class="fas fa-undo" aria-hidden="true"></i>
                <span>Reset</span>
              </button>
            </div>
          {/if}
        {/if}
        <div class="ui-ts-selections" class:locked={selectionsLocked}>
          {@render subheader?.()}
          {@render children?.({ close, handleReset })}
        </div>
      </div>
    {/if}
  </div>

  {#if triggerMeta}
    <span
      class="ui-ts-meta-text"
      onmouseenter={(e) => { e.currentTarget.title = e.currentTarget.textContent ?? ''; }}
    >{@render triggerMeta()}</span>
  {/if}
</div>

<style>
  /* Subgrid spanning the parent's trigger + meta columns. */
  .ui-token-selector {
    display: grid;
    grid-template-columns: subgrid;
    grid-column: span 2;
    align-items: stretch;
    column-gap: var(--ui-space-8);
  }

  .ui-ts-trigger-wrap {
    position: relative;
    min-width: 0;
    justify-self: stretch;
  }

  .ui-token-selector.disabled {
    opacity: 0.4;
  }

  .ui-token-selector.disabled .ui-ts-trigger {
    cursor: not-allowed;
  }

  .ui-token-selector.disabled .ui-ts-trigger:hover {
    border-color: var(--ui-border);
    background: var(--ui-surface-low);
  }

  .ui-ts-trigger {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-2) var(--ui-space-8);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    min-height: 1.75rem;
    width: 100%;
  }

  .ui-ts-content {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    justify-content: flex-start;
    gap: var(--ui-space-6);
    overflow: hidden;
    align-self: stretch;
  }

  .ui-ts-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 0 1 auto;
    text-align: left;
    align-items: flex-start;
    min-width: 0;
  }

  .ui-ts-text:has(.ui-ts-category:empty) {
    display: none;
  }

  .ui-ts-category {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-medium);
    text-align: left;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ui-ts-trigger:hover {
    border-color: var(--ui-border-higher);
    background: var(--ui-surface-high);
  }

  /* Link-state pop-bar. The wrap already has `position: relative` (so the
     dropdown can anchor). The bar is a `::before` anchored at the wrap's
     left edge — same column position regardless of state, so a stack of
     mixed linked/unlinked rows shares one continuous link-state column.
     Linked rows: bar is teal, full size, sitting flush against the trigger.
     Unlinked rows: bar shrinks to a smaller amber tick and the trigger is
     indented (`padding-left` on the wrap) so the bar sits clear of it. */
  .ui-ts-trigger-wrap {
    transition: padding-left 320ms cubic-bezier(0.5, 1.6, 0.5, 1);
  }
  .ui-ts-trigger-wrap:has(> .ui-ts-trigger.linked, > .ui-ts-trigger.unlinked)::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    width: 4px;
    height: 1.75rem;
    border-radius: var(--ui-radius-md) 0 0 var(--ui-radius-md);
    background: var(--ui-text-primary);
    transform: translateY(-50%);
    pointer-events: none;
    transition:
      width 220ms cubic-bezier(0.4, 0, 0.2, 1),
      height 220ms cubic-bezier(0.4, 0, 0.2, 1),
      border-radius 220ms cubic-bezier(0.4, 0, 0.2, 1),
      background-color 220ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ui-ts-trigger-wrap:has(> .ui-ts-trigger.unlinked) {
    padding-left: 0.5rem;
  }
  .ui-ts-trigger-wrap:has(> .ui-ts-trigger.unlinked)::before {
    background: var(--ui-link-broken);
    width: 2px;
    height: 0.875rem;
    border-radius: 1px;
  }
  /* Keep the dropdown's left edge aligned with the (indented) trigger rather
     than the column anchor, so an open dropdown doesn't bleed left of its
     associated control. */
  .ui-ts-trigger-wrap:has(> .ui-ts-trigger.unlinked) > .ui-ts-dropdown {
    left: 0.5rem;
  }
  @media (prefers-reduced-motion: reduce) {
    .ui-ts-trigger-wrap,
    .ui-ts-trigger-wrap::before { transition: none; }
  }

  .ui-ts-preview {
    flex: 1;
    align-self: stretch;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ui-ts-preview:empty {
    display: none;
  }

  .ui-ts-meta-text {
    align-self: center;
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .ui-ts-chevron {
    font-size: 0.625rem;
    color: var(--ui-text-secondary);
    transition: transform var(--ui-transition-fast);
  }

  .ui-ts-chevron.open {
    transform: rotate(180deg);
  }

  .ui-ts-dropdown {
    position: absolute;
    top: calc(100% + var(--ui-space-4));
    left: 0;
    background: var(--ui-surface-higher);
    border: 1px solid var(--ui-border-high);
    border-radius: var(--ui-radius-md);
    box-shadow: var(--ui-shadow-lg);
    z-index: 10;
  }

  .ui-ts-header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-8);
    border-bottom: 1px solid var(--ui-border-low);
  }

  .ui-ts-reset {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    height: 1.5rem;
    padding: var(--ui-space-2) var(--ui-space-8);
    background: none;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-family: inherit;
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    flex-shrink: 0;
    transition: all var(--ui-transition-fast);
  }

  .ui-ts-reset i {
    font-size: 0.625rem;
  }

  .ui-ts-reset:hover:not(:disabled) {
    background: var(--ui-hover);
    border-color: var(--ui-border-higher);
    color: var(--ui-text-primary);
  }

  .ui-ts-reset:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ui-ts-selections.locked {
    opacity: 0.4;
    pointer-events: none;
  }
</style>
