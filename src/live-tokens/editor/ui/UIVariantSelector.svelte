<script lang="ts" generics="T extends { key: string; label?: string; value?: string }">
  import type { Snippet } from 'svelte';
  import { resolveAliasChain } from '../core/palettes/tokenRegistry';
  import UITokenSelector from './UITokenSelector.svelte';
  import UIOptionList from './UIOptionList.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  interface Props<O extends { key: string; label?: string; value?: string }> {
    variable: string;
    component?: string | undefined;
    canBeLinked?: boolean;
    disabled?: boolean;
    selectionsLocked?: boolean;
    dropdownMinWidth?: string;
    dropdownMaxWidth?: string;
    /** Forwarded to UIOptionList — when set, options render in a linked-column grid. */
    dropdownGridColumns?: string;
    /** CSS var prefix that, joined with an option `key`, forms the target var (e.g. `--font-weight-`). */
    varPrefix: string;
    /** Selectable options. Each must have a unique `key`. */
    options: ReadonlyArray<O>;
    /** Trigger title slot. Renamed from `slot="trigger-title"` in 0.5.0. */
    triggerTitle?: Snippet<[{ activeOption: O | null }]>;
    /** Trigger meta slot. Renamed from `slot="trigger-meta"` in 0.5.0. */
    triggerMeta?: Snippet<[{ currentValue: string; activeOption: O | null }]>;
    /** Per-option custom render. */
    option?: Snippet<[{ opt: O; active: boolean; select: () => void }]>;
    /** Trailing dropdown content (e.g. action buttons). */
    extras?: Snippet<[{ close: () => void }]>;
    onchange?: () => void;
  }

  let {
    variable,
    component = undefined,
    canBeLinked = false,
    disabled = false,
    selectionsLocked = false,
    dropdownMinWidth = '12rem',
    dropdownMaxWidth = '',
    dropdownGridColumns = '',
    varPrefix,
    options,
    triggerTitle: callerTriggerTitle,
    triggerMeta: callerTriggerMeta,
    option: callerOption,
    extras: callerExtras,
    onchange,
  }: Props<T> = $props();

  let selector: UITokenSelector;
  let chosenKey: string | null = $state(null);
  let currentValue: string = $state('');

  let validKeys = $derived(new Set(options.map((o) => o.key)));
  let refMatcher = $derived.by(() => {
    const escaped = varPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`var\\((${escaped}[^)\\s]+)\\)`);
  });

  function parseRef(value: string): string | null {
    const m = value.match(refMatcher);
    if (!m) return null;
    const key = m[1].slice(varPrefix.length);
    return validKeys.has(key) ? key : null;
  }

  function readResolved() {
    currentValue = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }

  function initFromCurrent() {
    readResolved();
    const raw = document.documentElement.style.getPropertyValue(variable).trim();
    if (raw) {
      const key = parseRef(raw);
      if (key) {
        chosenKey = key;
        return;
      }
    }
    for (const alias of resolveAliasChain(variable)) {
      const key = parseRef(`var(${alias})`);
      if (key) {
        chosenKey = key;
        return;
      }
    }
    // Last-ditch fallback: match the resolved value against an option's `value`
    // (lets us highlight a variant even when the default is a literal, not an alias).
    const matchedByValue = options.find((o) => o.value !== undefined && o.value === currentValue);
    chosenKey = matchedByValue ? matchedByValue.key : null;
  }

  function handleReset() {
    chosenKey = null;
    readResolved();
    onchange?.();
  }

  function selectKey(key: string, close: () => void) {
    const target = `${varPrefix}${key}`;
    if (target === variable) {
      selector.writeOverride(null);
      chosenKey = null;
    } else {
      selector.writeOverride(target);
      chosenKey = key;
    }
    readResolved();
    close();
    onchange?.();
  }

  // Re-derive `chosenKey` when the bound `variable` changes (e.g. when a
  // VariantGroup tabs view reuses the same selector across states). Without
  // this, prop swaps leave the trigger label stale.
  let lastSeenVariable: string | null = null;
  $effect(() => {
    if (variable !== lastSeenVariable) {
      lastSeenVariable = variable;
      initFromCurrent();
    }
  });

  let activeOption = $derived((options.find((o) => o.key === chosenKey) ?? null) as T | null);
</script>

<UITokenSelector
  bind:this={selector}
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  {dropdownMinWidth}
  {dropdownMaxWidth}
  onreset={handleReset}
  onvarChange={initFromCurrent}
>
  {#snippet triggerTitle()}
    {#if callerTriggerTitle}{@render callerTriggerTitle({ activeOption })}{:else}{activeOption?.label ?? ''}{/if}
  {/snippet}
  {#snippet triggerMeta()}
    {#if callerTriggerMeta}{@render callerTriggerMeta({ currentValue, activeOption })}{:else}{currentValue || '—'}{/if}
  {/snippet}

  {#snippet children({ close })}
    <UIOptionList gridColumns={dropdownGridColumns}>
      {#each options as opt (opt.key)}
        {#if callerOption}
          {@render callerOption({ opt, active: chosenKey === opt.key, select: () => selectKey(opt.key, close) })}
        {:else if opt.value !== undefined}
          <UIOptionItem active={chosenKey === opt.key} onclick={() => selectKey(opt.key, close)}>
            {#snippet label()}{opt.label ?? ''}{/snippet}
            {#snippet meta()}{opt.value}{/snippet}
          </UIOptionItem>
        {:else}
          <UIOptionItem active={chosenKey === opt.key} onclick={() => selectKey(opt.key, close)}>
            {#snippet label()}{opt.label ?? ''}{/snippet}
          </UIOptionItem>
        {/if}
      {/each}
      {@render callerExtras?.({ close })}
    </UIOptionList>
  {/snippet}
</UITokenSelector>
