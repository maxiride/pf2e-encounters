<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount, onDestroy } from 'svelte';
  import { resolveAliasChain } from '../core/palettes/tokenRegistry';
  import { editorState } from '../core/store/editorStore';
  import { CSS_VAR_CHANGE_EVENT } from '../core/cssVarSync';
  import type { FontFamily, FontSource } from '../core/themes/themeTypes';
  import UITokenSelector from './UITokenSelector.svelte';
  import UIOptionList from './UIOptionList.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

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

  const options = [
    { key: 'display', label: 'Display' },
    { key: 'sans', label: 'Sans' },
    { key: 'serif', label: 'Serif' },
    { key: 'mono', label: 'Mono' },
  ];

  let selector: UITokenSelector | undefined = $state();
  let chosenKey: string | null = $state(null);
  let chosenFamilyId: string | null = $state(null);
  let currentStack: string = $state('');
  let familyNameByKey: Record<string, string> = $state({});

  let fontSources = $derived($editorState.fonts.sources);
  let allFamilies = $derived((fontSources as FontSource[]).flatMap((s) => s.families));
  let hasProjectFonts = $derived(allFamilies.length > 0);

  function parseRef(value: string): string | null {
    const m = value.match(/var\((--font-[a-z]+)\)/);
    if (!m) return null;
    const key = m[1].replace(/^--font-/, '');
    return options.find((o) => o.key === key) ? key : null;
  }

  function firstFamilyName(stack: string): string {
    if (!stack) return '';
    const first = stack.split(',')[0].trim();
    return first.replace(/^['"]|['"]$/g, '');
  }

  function findProjectFamilyByCssName(name: string): FontFamily | null {
    if (!name) return null;
    for (const source of fontSources) {
      for (const fam of source.families) {
        if (fam.cssName === name) return fam;
      }
    }
    return null;
  }

  function genericFor(v: string): string {
    if (v === '--font-mono') return 'monospace';
    if (v === '--font-serif') return 'serif';
    return 'sans-serif';
  }

  function readResolved() {
    const root = getComputedStyle(document.documentElement);
    currentStack = root.getPropertyValue(variable).trim();
    const next: Record<string, string> = {};
    for (const opt of options) {
      const stack = root.getPropertyValue(`--font-${opt.key}`).trim();
      next[opt.key] = firstFamilyName(stack);
    }
    familyNameByKey = next;
  }

  function handleVarChange(e: Event) {
    const detail = (e as CustomEvent<{ name: string }>).detail;
    if (detail?.name?.startsWith('--font-')) readResolved();
  }

  function initFromCurrent() {
    readResolved();
    const raw = document.documentElement.style.getPropertyValue(variable).trim();
    if (raw) {
      const key = parseRef(raw);
      if (key) {
        chosenKey = key;
        chosenFamilyId = null;
        return;
      }
      const fam = findProjectFamilyByCssName(firstFamilyName(raw));
      if (fam) {
        chosenKey = null;
        chosenFamilyId = fam.id;
        return;
      }
    }
    for (const alias of resolveAliasChain(variable)) {
      const key = parseRef(`var(${alias})`);
      if (key) {
        chosenKey = key;
        chosenFamilyId = null;
        return;
      }
    }
    chosenKey = null;
    chosenFamilyId = null;
  }

  function handleReset() {
    chosenKey = null;
    chosenFamilyId = null;
    readResolved();
    onchange?.();
  }

  function selectOption(key: string, close: () => void) {
    const target = `--font-${key}`;
    if (target === variable) {
      selector?.writeOverride(null);
      chosenKey = null;
    } else {
      selector?.writeOverride(target);
      chosenKey = key;
    }
    chosenFamilyId = null;
    readResolved();
    close();
    onchange?.();
  }

  function selectProjectFamily(family: FontFamily, close: () => void) {
    const stack = `'${family.cssName}', ${genericFor(variable)}`;
    selector?.writeOverride(stack);
    chosenKey = null;
    chosenFamilyId = family.id;
    readResolved();
    close();
    onchange?.();
  }

  // Re-derive `chosenKey` / `chosenFamilyId` when `variable` changes (the
  // VariantGroup tabs view reuses the same selector instance across states).
  let lastSeenVariable: string | null = $state(null);
  run(() => {
    if (variable !== lastSeenVariable) {
      lastSeenVariable = variable;
      initFromCurrent();
    }
  });

  onMount(() => {
    document.addEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });
  onDestroy(() => {
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  let activeLabel = $derived(chosenFamilyId
    ? (allFamilies.find((f) => f.id === chosenFamilyId)?.name ?? 'Project font')
    : (options.find((o) => o.key === chosenKey)?.label ?? ''));
  let displayFamily = $derived(firstFamilyName(currentStack));
</script>

<UITokenSelector
  bind:this={selector}
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  dropdownMinWidth="14rem"
  onreset={handleReset}
  onvarChange={initFromCurrent}
>
  {#snippet triggerTitle()}{activeLabel}{/snippet}
  {#snippet triggerMeta()}{displayFamily || '—'}{/snippet}

  {#snippet children({ close })}
  
      <UIOptionList>
        {#each options as opt}
          <UIOptionItem
            active={chosenKey === opt.key}
            onclick={() => selectOption(opt.key, close)}
          >
            {#snippet preview()}
                    <span  class="font-sample" style="font-family: var(--font-{opt.key});">Aa</span>
                  {/snippet}
            {#snippet label()}
                    {opt.label}
                  {/snippet}
            {#snippet meta()}
                    {familyNameByKey[opt.key] ?? ''}
                  {/snippet}
          </UIOptionItem>
        {/each}

        {#if hasProjectFonts}
          <div class="pfs-divider" role="separator"></div>
          <div class="pfs-section">
            <div class="pfs-trigger" class:active={chosenFamilyId !== null}>
              <span class="pfs-label">Project Fonts</span>
              <span class="pfs-count">{allFamilies.length}</span>
              <i class="fas fa-chevron-right pfs-chevron" aria-hidden="true"></i>
            </div>
            <div class="pfs-submenu">
              {#each fontSources as source (source.id)}
                {#if source.families.length > 0}
                  <div class="pfs-source-label">{source.label ?? source.kind}</div>
                  {#each source.families as fam (fam.id)}
                    <UIOptionItem
                      active={chosenFamilyId === fam.id}
                      onclick={() => selectProjectFamily(fam, close)}
                    >
                      {#snippet preview()}
                                        <span
                          
                          class="font-sample"
                          style="font-family: '{fam.cssName}', {genericFor(variable)};"
                        >Aa</span>
                                      {/snippet}
                      {#snippet label()}
                                        {fam.name}
                                      {/snippet}
                    </UIOptionItem>
                  {/each}
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      </UIOptionList>
    
  {/snippet}
</UITokenSelector>

<style>
  .font-sample {
    display: inline-block;
    width: 2.25rem;
    margin-right: var(--ui-space-8);
    text-align: center;
    font-size: var(--ui-font-size-2xl);
    color: var(--ui-text-primary);
    line-height: 1;
  }

  .pfs-divider {
    height: 1px;
    background: var(--ui-border-low);
    margin: var(--ui-space-4) 0;
  }

  .pfs-section {
    position: relative;
  }

  .pfs-trigger {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-8);
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-sm);
    cursor: default;
  }

  .pfs-section:hover .pfs-trigger,
  .pfs-trigger.active {
    background: var(--ui-hover);
  }

  .pfs-label {
    flex: 1;
  }

  .pfs-count {
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
  }

  .pfs-chevron {
    font-size: 0.625rem;
    color: var(--ui-text-secondary);
    width: 0.75rem;
  }

  .pfs-submenu {
    display: none;
    position: absolute;
    left: 100%;
    top: calc(-1 * var(--ui-space-4));
    min-width: 14rem;
    max-width: 18rem;
    max-height: 70vh;
    overflow-y: auto;
    padding: var(--ui-space-4);
    background: var(--ui-surface-higher);
    border: 1px solid var(--ui-border-high);
    border-radius: var(--ui-radius-md);
    box-shadow: var(--ui-shadow-lg);
    z-index: 1;
  }

  .pfs-section:hover .pfs-submenu,
  .pfs-section:focus-within .pfs-submenu {
    display: flex;
    flex-direction: column;
  }

  .pfs-source-label {
    padding: var(--ui-space-4) var(--ui-space-8) var(--ui-space-2);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
  }
</style>
