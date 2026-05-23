<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount, onDestroy } from 'svelte';
  import { CSS_VAR_CHANGE_EVENT } from '../core/cssVarSync';
  import UIVariantSelector from './UIVariantSelector.svelte';

  interface Props {
    variable: string;
    component?: string | undefined;
    canBeLinked?: boolean;
    disabled?: boolean;
    selectionsLocked?: boolean;
    onchange?: () => void;
  }

  let {
    variable,
    component = undefined,
    canBeLinked = false,
    disabled = false,
    selectionsLocked = false,
    onchange,
  }: Props = $props();

  // Icon-size variables (e.g. --tabbar-default-icon-size) pick from the
  // --icon-size-* scale; everything else from --font-size-*.
  let scalePrefix = $derived(variable.endsWith('-icon-size') ? '--icon-size-' : '--font-size-');

  const options = [
    { key: 'xs', label: 'XS' },
    { key: 'sm', label: 'SM' },
    { key: 'md', label: 'MD' },
    { key: 'lg', label: 'LG' },
    { key: 'xl', label: 'XL' },
    { key: '2xl', label: '2XL' },
    { key: '3xl', label: '3XL' },
    { key: '4xl', label: '4XL' },
    { key: '5xl', label: '5XL' },
    { key: '6xl', label: '6XL' },
  ] as const;

  let pxByKey: Record<string, string> = $state({});
  let remByKey: Record<string, string> = $state({});

  function formatRem(value: number): string {
    const rounded = Math.round(value * 1000) / 1000;
    return `${rounded}rem`;
  }

  function readPxValues() {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const nextPx: Record<string, string> = {};
    const nextRem: Record<string, string> = {};
    for (const opt of options) {
      probe.style.fontSize = `var(${scalePrefix}${opt.key})`;
      const px = parseFloat(getComputedStyle(probe).fontSize);
      if (Number.isFinite(px)) {
        nextPx[opt.key] = `${Math.round(px * 10) / 10}px`;
        nextRem[opt.key] = formatRem(px / rootPx);
      } else {
        nextPx[opt.key] = '';
        nextRem[opt.key] = '';
      }
    }
    document.body.removeChild(probe);
    pxByKey = nextPx;
    remByKey = nextRem;
  }

  function handleVarChange(e: Event) {
    const detail = (e as CustomEvent<{ name: string }>).detail;
    if (detail?.name?.startsWith('--font-size-') || detail?.name?.startsWith('--icon-size-')) readPxValues();
  }

  // Re-read sizes when the target variable's scale changes
  // (mounting one selector, then opening another whose variable resolves to a different scale).
  run(() => {
    if (typeof document !== 'undefined' && scalePrefix) readPxValues();
  });

  onMount(() => {
    readPxValues();
    document.addEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });
  onDestroy(() => {
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  varPrefix={scalePrefix}
  {options}
  dropdownGridColumns="auto auto auto auto"
  {onchange}
>
  {#snippet triggerMeta({ currentValue, activeOption })}
    {activeOption ? (pxByKey[activeOption.key] ?? '—') : (currentValue || '—')}
  {/snippet}
  {#snippet option({ opt, active, select })}
  
      <button class="font-size-row" class:active onclick={select}>
        <span class="size-sample-cell">
          <span class="size-sample" style="font-size: calc(var({scalePrefix}{opt.key}) * 1.5);">A</span>
        </span>
        <span class="size-label">{opt.label}</span>
        <code class="size-measure">{pxByKey[opt.key] ?? ''}</code>
        <code class="size-measure">{remByKey[opt.key] ?? ''}</code>
      </button>
    
  {/snippet}
</UIVariantSelector>

<style>
  .font-size-row {
    display: grid;
    grid-template-columns: subgrid;
    grid-column: 1 / -1;
    align-items: baseline;
    padding: var(--ui-space-6) var(--ui-space-8);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    text-align: left;
    transition: all var(--ui-transition-fast);
  }

  .font-size-row:hover {
    background: var(--ui-hover);
  }

  .font-size-row.active {
    background: var(--ui-hover-high);
    border-color: var(--ui-text-accent);
    box-shadow: inset 3px 0 0 var(--ui-text-accent);
  }

  .size-sample-cell {
    display: inline-flex;
    align-items: baseline;
    justify-content: center;
    padding-right: var(--ui-space-12);
    line-height: 1;
  }

  .size-sample {
    color: var(--ui-text-primary);
    line-height: 1;
  }

  .size-label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
  }

  .font-size-row.active .size-label {
    color: var(--ui-text-accent);
    font-weight: var(--ui-font-weight-semibold);
  }

  .size-measure {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    white-space: nowrap;
  }

  .size-measure:first-of-type {
    padding-left: var(--ui-space-12);
  }

  .font-size-row.active .size-measure {
    color: var(--ui-text-primary);
  }
</style>
