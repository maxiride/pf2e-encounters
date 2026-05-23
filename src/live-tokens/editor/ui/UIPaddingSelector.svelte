<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount, onDestroy } from 'svelte';
  import { fade, fly, slide } from 'svelte/transition';
  import { cubicOut, cubicIn, cubicInOut } from 'svelte/easing';
  import UITokenSelector from './UITokenSelector.svelte';
  import UIOptionList from './UIOptionList.svelte';
  import UIOptionItem from './UIOptionItem.svelte';
  import { setCssVar, removeCssVar, CSS_VAR_CHANGE_EVENT } from '../core/cssVarSync';
  import {
    editorState,
    setComponentAlias,
    clearComponentAlias,
    getComponentPropertySiblings,
    isComponentPropertyLinked,
    setComponentAliasLinked,
    unlinkComponentProperty,
    relinkComponentProperty,
  } from '../core/store/editorStore';
  import UIRelinkConfirmPopover from './UIRelinkConfirmPopover.svelte';
  import UILinkToggle from './UILinkToggle.svelte';

  interface Props {
    variable: string;
    component?: string | undefined;
    canBeLinked?: boolean;
    disabled?: boolean;
    selectionsLocked?: boolean;
    /** When 'sides', renders the per-side rows alongside the link/merge header.
      The header occupies cols 2-3 of the parent token-row (sharing row 1 with
      TokenLayout's .token-label) and the side rows fill cols 1-3 of row 2. */
    mode?: 'single' | 'sides';
    /** When false, hide the split-to-sides affordance (e.g. for non-box spacing like gap). */
    splittable?: boolean;
    onchange?: () => void;
  }

  let {
    variable,
    component = undefined,
    canBeLinked = false,
    disabled = false,
    selectionsLocked = false,
    mode = 'single',
    splittable = true,
    onchange,
  }: Props = $props();

  type Side = 'top' | 'right' | 'bottom' | 'left';
  const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left'];

  /** Honor prefers-reduced-motion: skip the orchestrated split↔merge entry/exit
      when the OS asks for less motion. Read once at module mount. The split
      transition has two phases — old-block fades, then new-block expands; the
      cumulative time is large enough that ignoring this preference would be
      annoying for users who set it. */
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const t = (ms: number) => (reduceMotion ? 0 : ms);

  function sideVar(s: Side): string {
    return `${variable}-${s}`;
  }

  const options = [
    { key: '0', label: 'None', size: '0' },
    { key: '2', label: '2XS', size: '0.125rem' },
    { key: '4', label: 'XS', size: '0.25rem' },
    { key: '6', label: 'Small', size: '0.375rem' },
    { key: '8', label: 'Medium', size: '0.5rem' },
    { key: '10', label: 'Large', size: '0.625rem' },
    { key: '12', label: 'XL', size: '0.75rem' },
    { key: '16', label: '2XL', size: '1rem' },
    { key: '20', label: '3XL', size: '1.25rem' },
    { key: '24', label: '4XL', size: '1.5rem' },
    { key: '32', label: '5XL', size: '2rem' },
    { key: '48', label: '6XL', size: '3rem' },
  ];

  function tokenForKey(key: string): string {
    return `--space-${key}`;
  }

  function readAlias(v: string): string {
    if (component) {
      const ref = $editorState.components[component]?.aliases?.[v];
      return ref?.kind === 'token' ? ref.name : '';
    }
    const inline = document.documentElement.style.getPropertyValue(v).trim();
    const m = inline.match(/var\((--space-[a-z0-9]+)\)/);
    return m ? m[1] : '';
  }

  function parseKey(value: string): string | null {
    if (!value) return null;
    const m = value.match(/^--space-([a-z0-9]+)$/);
    if (!m) return null;
    return options.find((o) => o.key === m[1]) ? m[1] : null;
  }

  function readResolved(v: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  function writeAlias(v: string, semantic: string | null) {
    if (component) {
      if (semantic) setComponentAlias(component, v, { kind: 'token', name: semantic });
      else clearComponentAlias(component, v);
      return;
    }
    if (semantic) setCssVar(v, `var(${semantic})`);
    else removeCssVar(v);
  }

  /** Honor the parent token's linkage on every write the padding selector
   *  performs — for the parent var itself and for any per-side child var. When
   *  the parent is linked, mirror the write across every linked peer's
   *  matching var (parent → peer; parent-side → peer-side); otherwise fall
   *  through to the local write. The split topology is "shared" because the
   *  parent's groupKey is — peers stay in lockstep on single↔split toggles
   *  and per-side picks alike. */
  function writeAliasLinked(targetVar: string, semantic: string | null) {
    if (!component) {
      writeAlias(targetVar, semantic);
      return;
    }
    if (!isComponentPropertyLinked(component, variable)) {
      writeAlias(targetVar, semantic);
      return;
    }
    const peers = getComponentPropertySiblings(component, variable);
    if (peers.length < 2) {
      writeAlias(targetVar, semantic);
      return;
    }
    const slice = $editorState.components[component];
    const unlinked = slice?.unlinked ?? [];
    const suffix = targetVar.slice(variable.length);
    for (const peer of peers) {
      if (unlinked.includes(peer)) continue;
      const peerVar = `${peer}${suffix}`;
      if (semantic) setComponentAlias(component, peerVar, { kind: 'token', name: semantic });
      else clearComponentAlias(component, peerVar);
    }
  }

  let chosenKey: string | null = $state(null);
  let resolvedSize = $state('');
  let sideKeys: Record<Side, string | null> = $state({ top: null, right: null, bottom: null, left: null });
  let sideResolved: Record<Side, string> = $state({ top: '', right: '', bottom: '', left: '' });

  function refreshFromState() {
    chosenKey = parseKey(readAlias(variable));
    resolvedSize = readResolved(variable);
    const nextKeys: Record<Side, string | null> = { top: null, right: null, bottom: null, left: null };
    const nextResolved: Record<Side, string> = { top: '', right: '', bottom: '', left: '' };
    for (const s of SIDES) {
      nextKeys[s] = parseKey(readAlias(sideVar(s)));
      nextResolved[s] = readResolved(sideVar(s));
    }
    sideKeys = nextKeys;
    sideResolved = nextResolved;
  }

  function selectSingle(key: string, close: () => void) {
    writeAliasLinked(variable, tokenForKey(key));
    close();
    onchange?.();
  }

  function selectSide(s: Side, key: string, close: () => void) {
    writeAliasLinked(sideVar(s), tokenForKey(key));
    close();
    onchange?.();
  }

  function handleResetAll() {
    for (const s of SIDES) writeAliasLinked(sideVar(s), null);
    writeAliasLinked(variable, null);
    onchange?.();
  }

  function handleResetSide(s: Side) {
    writeAliasLinked(sideVar(s), null);
    onchange?.();
  }

  function splitToSides() {
    if (disabled) return;
    const seed = readAlias(variable) || tokenForKey('4');
    for (const s of SIDES) writeAliasLinked(sideVar(s), seed);
    onchange?.();
  }

  function mergeToSingle() {
    if (disabled) return;
    const seed = readAlias(sideVar('top')) || readAlias(variable);
    if (seed && !readAlias(variable)) writeAliasLinked(variable, seed);
    for (const s of SIDES) writeAliasLinked(sideVar(s), null);
    onchange?.();
  }

  function handleVarChange() {
    refreshFromState();
  }

  onMount(() => {
    refreshFromState();
    document.addEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  onDestroy(() => {
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  // Track `variable` alongside `$editorState` so a VariantGroup tabs view that
  // reuses this selector across states refreshes when the bound prop swaps.
  run(() => { variable; if ($editorState) refreshFromState(); });

  let activeKey = $derived(chosenKey ?? (options.find((o) => o.size === resolvedSize)?.key ?? null));
  let activeLabel = $derived(options.find((o) => o.key === activeKey)?.label ?? '');
  let sideActiveKey = $derived({
    top: sideKeys.top ?? (options.find((o) => o.size === sideResolved.top)?.key ?? null),
    right: sideKeys.right ?? (options.find((o) => o.size === sideResolved.right)?.key ?? null),
    bottom: sideKeys.bottom ?? (options.find((o) => o.size === sideResolved.bottom)?.key ?? null),
    left: sideKeys.left ?? (options.find((o) => o.size === sideResolved.left)?.key ?? null),
  } as Record<Side, string | null>);
  let sideLabels = $derived({
    top: options.find((o) => o.key === sideActiveKey.top)?.label ?? '',
    right: options.find((o) => o.key === sideActiveKey.right)?.label ?? '',
    bottom: options.find((o) => o.key === sideActiveKey.bottom)?.label ?? '',
    left: options.find((o) => o.key === sideActiveKey.left)?.label ?? '',
  } as Record<Side, string>);

  // Linkage state for the parent token. The split fieldset is a single
  // linkage unit — peers either share the parent (and their per-side state
  // mirrors via `writeAliasLinked`) or one peer has detached. Mirrors the
  // pop-bar/lock-toggle vocabulary used by `UITokenSelector` so the visual
  // and interaction language is the same at both scales.
  let hasParentSiblings = $derived(canBeLinked && component && $editorState
    ? getComponentPropertySiblings(component, variable).length >= 2
    : false);
  let showLinkUI = $derived(canBeLinked && !!component && hasParentSiblings);
  /** $editorState is referenced directly so this re-evaluates on every store
   *  update. isComponentPropertyLinked reads `get(store)` internally — Svelte
   *  can't see that as a dependency. Without the explicit reference, an
   *  unlink mutation (which leaves siblings count and showLinkUI unchanged)
   *  would not re-run this expression: Svelte's $$invalidate skips marking
   *  a boolean dirty when the new value equals the old, so the dirty bit
   *  never propagates to isLinkedParent. */
  let isLinkedParent = $derived(!!$editorState
    && showLinkUI
    && !!component
    && isComponentPropertyLinked(component, variable));

  let relinkOpen = $state(false);
  let relinkCandidates: { variable: string; alias: string }[] = $state([]);

  /** Adopt one peer's entire padding block (parent + four sides) onto every
   *  currently-linked peer. Padding is treated as a single shared unit — when
   *  peers diverge in split topology (one in single mode, another in split),
   *  relinking must converge them, not just mirror the parent var. The source
   *  peer's split-or-single state, plus all four side aliases, become the
   *  group's canonical state. */
  function adoptBlockFromPeer(sourcePeer: string) {
    if (!component) return;
    const slice = $editorState.components[component];
    if (!slice) return;

    const sourceParent = slice.aliases[sourcePeer];
    const sourceSides: Record<Side, ReturnType<typeof readSideAlias>> = {
      top: readSideAlias(sourcePeer, 'top'),
      right: readSideAlias(sourcePeer, 'right'),
      bottom: readSideAlias(sourcePeer, 'bottom'),
      left: readSideAlias(sourcePeer, 'left'),
    };

    if (sourceParent) setComponentAliasLinked(component, variable, sourceParent);
    else relinkComponentProperty(component, variable);

    // After re-engaging linkage, fan the source's per-side state to every
    // peer not currently opted out. `setComponentAliasLinked` already removed
    // `variable` from `unlinked`; re-read so we don't skip self.
    const next = $editorState.components[component];
    if (!next) return;
    const peers = getComponentPropertySiblings(component, variable);
    const unlinked = new Set(next.unlinked ?? []);
    for (const peer of peers) {
      if (unlinked.has(peer)) continue;
      for (const side of SIDES) {
        const peerSide = `${peer}-${side}`;
        const ref = sourceSides[side];
        if (ref) setComponentAlias(component, peerSide, ref);
        else clearComponentAlias(component, peerSide);
      }
    }
  }

  function readSideAlias(peer: string, side: Side) {
    if (!component) return undefined;
    const slice = $editorState.components[component];
    return slice?.aliases[`${peer}-${side}`];
  }

  function toggleLinkPaddingGroup() {
    if (!showLinkUI || !component) return;
    if (isLinkedParent) {
      unlinkComponentProperty(component, variable);
      onchange?.();
      return;
    }
    const slice = $editorState.components[component];
    if (!slice) return;
    const peers = getComponentPropertySiblings(component, variable);
    if (peers.length < 2) return;
    const linkedPeers = peers.filter(
      (v) => v !== variable && !slice.unlinked?.includes(v),
    );
    if (linkedPeers.length === 0) {
      const currentValue = slice.aliases[variable];
      if (currentValue) {
        adoptBlockFromPeer(variable);
        onchange?.();
      }
      return;
    }
    const candidates = linkedPeers.map((v) => {
      const ref = slice.aliases[v];
      const alias = ref?.kind === 'token' ? ref.name : '';
      return { variable: v, alias };
    });
    const definedCandidates = candidates.filter((c) => c.alias);
    const distinctValues = new Set(definedCandidates.map((c) => c.alias));
    if (distinctValues.size <= 1) {
      const sourcePeer = definedCandidates.length > 0
        ? definedCandidates[0].variable
        : variable;
      adoptBlockFromPeer(sourcePeer);
      onchange?.();
      return;
    }
    relinkCandidates = candidates;
    relinkOpen = true;
  }

  function handleRelinkConfirm(payload: { alias: string }) {
    if (!component) return;
    // Find the peer whose parent alias matches the chosen one — its full
    // block (split state + side values) becomes canonical.
    const sourcePeer = relinkCandidates.find((c) => c.alias === payload.alias)?.variable ?? variable;
    adoptBlockFromPeer(sourcePeer);
    onchange?.();
    relinkOpen = false;
  }

  function handleRelinkCancel() {
    relinkOpen = false;
  }
</script>

{#if mode === 'sides'}
  <!--
    Sides mode renders into the parent token-row subgrid, NOT inside a
    self-contained fieldset. TokenLayout puts the .token-label "padding" in
    col 1; we fill cols 2-3 of the same row with the link/merge header, then
    drop the four side rows onto row 2 spanning cols 1-3 (still subgridded so
    each side's dropdown lands in the same trigger column as the surrounding
    properties — border-width, corner-radius, etc.).

    Both .padding-header and .padding-sides-block carry explicit grid-row so
    auto-placement during the transition can't push them onto extra rows when
    the leaving .padding-single-row briefly co-occupies cols 2-3 row 1; with
    the explicit row anchors the OLD and NEW header content cross-fade in
    the same cell instead of stacking.
  -->
  <div
    class="padding-header"
    in:fade|local={{ duration: t(220), delay: t(200) }}
    out:fade|local={{ duration: t(180), easing: cubicIn }}
  >
    {#if showLinkUI}
      <div class="link-toggle-wrap">
        <UILinkToggle linked={isLinkedParent} ontoggle={toggleLinkPaddingGroup} />
        {#if relinkOpen && component}
          <UIRelinkConfirmPopover
            candidates={relinkCandidates}
            initialVariable={variable}
            prefixToStrip={`--${component}-`}
            onconfirm={handleRelinkConfirm}
            oncancel={handleRelinkCancel}
          />
        {/if}
      </div>
    {/if}
    <button
      type="button"
      class="merge-btn"
      onclick={mergeToSingle}
      title="Use the same value for all sides"
      disabled={disabled || selectionsLocked}
    >
      <i class="fas fa-square" aria-hidden="true"></i>
      <span>Merge</span>
    </button>
  </div>
  <div
    class="padding-sides-block"
    class:linked={showLinkUI && isLinkedParent}
    class:unlinked={showLinkUI && !isLinkedParent}
    in:slide|local={{ duration: t(360), delay: t(200), easing: cubicOut }}
    out:slide|local={{ duration: t(320), easing: cubicInOut }}
  >
    {#each SIDES as s}
      <span class="side-label">{s}</span>
      <UITokenSelector
        variable={sideVar(s)}
        {component}
        canBeLinked={false}
        {disabled}
        {selectionsLocked}
        onreset={() => handleResetSide(s)}
        onvarChange={handleVarChange}
      >
        {#snippet triggerTitle()}{sideLabels[s] || '—'}{/snippet}
        {#snippet triggerMeta()}{sideResolved[s] || '—'}{/snippet}

        {#snippet children({ close })}
              
            <UIOptionList>
              {#each options as opt}
                <UIOptionItem
                  active={sideActiveKey[s] === opt.key}
                  onclick={() => selectSide(s, opt.key, close)}
                >
                  {#snippet label()}
                                {opt.label}
                              {/snippet}
                  {#snippet meta()}
                                {opt.size}
                              {/snippet}
                </UIOptionItem>
              {/each}
            </UIOptionList>
          
              {/snippet}
      </UITokenSelector>
    {/each}
  </div>
{:else}
  <!--
    Parent fade carries the row's overall opacity (and through it, the
    nested UITokenSelector trigger's apparent opacity, since opacity
    cascades through the stacking context). The split-button's `fly`
    sets `opacity: 1` to disable fly's built-in fade so we don't
    double-fade it: the parent already handles opacity, fly handles
    only the right-ward translate. Result: as the user clicks split,
    the trigger fades in place while the grid icon glides to the right
    and disappears in lockstep.
  -->
  <div
    class="padding-single-row"
    class:disabled
    in:fade|local={{ duration: t(220), delay: t(320) }}
    out:fade|local={{ duration: t(200), easing: cubicIn }}
  >
    <UITokenSelector
      {variable}
      {component}
      {canBeLinked}
      {disabled}
      {selectionsLocked}
      onreset={handleResetAll}
      onvarChange={handleVarChange}
    >
      {#snippet triggerTitle()}{activeLabel || '—'}{/snippet}

      {#snippet children({ close })}
          
          <UIOptionList>
            {#each options as opt}
              <UIOptionItem
                active={activeKey === opt.key}
                onclick={() => selectSingle(opt.key, close)}
              >
                {#snippet label()}
                            {opt.label}
                          {/snippet}
                {#snippet meta()}
                            {opt.size}
                          {/snippet}
              </UIOptionItem>
            {/each}
          </UIOptionList>
        
          {/snippet}
    </UITokenSelector>
    {#if splittable}
      <button
        type="button"
        class="split-btn"
        onclick={splitToSides}
        title="Set each side independently"
        disabled={disabled || selectionsLocked}
        in:fly|local={{ x: 24, opacity: 1, duration: t(220), delay: t(320), easing: cubicOut }}
        out:fly|local={{ x: 24, opacity: 1, duration: t(200), easing: cubicIn }}
      >
        <i class="fas fa-border-all" aria-hidden="true"></i>
      </button>
    {/if}
  </div>
{/if}

<style>
  /* Single-mode padding row: trigger + split-toggle, sitting side-by-side.
     The row spans grid columns from the trigger slot onward —
     `--padding-row-start` defaults to column 2 (matches the per-variant
     `[label][trigger][value]` grid) and is overridden to 1 by callers whose
     grid skips the label column (the linked-block layout). The inner
     UITokenSelector switches from its default subgrid to inline-flex so it
     occupies natural width inside this flex row instead of stealing both
     parent columns via `grid-column: span 2`. */
  .padding-single-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    grid-column: var(--padding-row-start, 2) / -1;
    /* Pin to row 1 so during a sides→single transition the leaving header
       and the entering single row co-occupy the same cell instead of
       stacking on adjacent grid rows. */
    grid-row: 1;
    min-width: 0;
  }
  .padding-single-row :global(.ui-token-selector) {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
    grid-column: auto;
    flex: 0 0 auto;
  }
  /* Pin the trigger to the same width as the surrounding selectors' trigger
     column (`--token-selector-w` on the parent .token-grid, 8rem default).
     Without this, a short token label like "XS" collapses the inline-flex
     trigger to natural width and breaks the column alignment with the
     border-width/corner-radius/etc. rows above and below. */
  .padding-single-row :global(.ui-ts-trigger-wrap) {
    min-width: var(--token-selector-w, 8rem);
  }

  .split-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    flex-shrink: 0;
  }

  .split-btn:hover:not(:disabled) {
    border-color: var(--ui-border-higher);
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .split-btn:disabled {
    cursor: not-allowed;
  }

  /* Header row: link-toggle + Merge button, sharing row 1 with the parent's
     .token-label "padding". Cols 2-3 of the parent subgrid by default; the
     left col stays free for the label TokenLayout already rendered. The
     --padding-row-start hook lets a host (the linked-block, which renders
     the property name as an h4 instead of an in-row label) re-anchor the
     header to col 1 so it spans the full row width. */
  .padding-header {
    grid-column: var(--padding-row-start, 2) / -1;
    grid-row: 1;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: var(--ui-space-6);
    min-width: 0;
  }

  .link-toggle-wrap {
    position: relative;
  }

  .merge-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-8);
    height: 1.5rem;
    background: none;
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-muted);
    font-family: inherit;
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .merge-btn:hover:not(:disabled) {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
    border-color: var(--ui-border);
  }

  .merge-btn:disabled {
    cursor: not-allowed;
  }

  /* Sides block: spans all three parent columns on its own row, then
     subgrids back to those same columns so each side's label, dropdown, and
     resolved value land in the same tracks as the surrounding properties.
     Position: relative anchors the link-state pop-bar (::before) at the
     left edge of col 1; side labels carry padding-left so they clear the
     bar and read as visually indented under "padding". */
  .padding-sides-block {
    grid-column: 1 / -1;
    grid-row: 2;
    display: grid;
    grid-template-columns: subgrid;
    row-gap: var(--ui-space-6);
    align-items: center;
    margin-top: var(--ui-space-6);
    position: relative;
  }

  /* Group-scale link-state pop-bar. The bar runs the full height of the
     sides block in both states — the four sides are conceptually one
     property, so the indicator never breaks into a tick. Linked = thick
     teal stripe; unlinked = thinner amber stripe, drifted slightly left
     to mirror the dropdown's "trigger pulls away from indicator" cue. */
  .padding-sides-block.linked::before,
  .padding-sides-block.unlinked::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    height: 100%;
    transform: translateY(-50%);
    pointer-events: none;
    background: var(--ui-text-primary);
    border-radius: var(--ui-radius-md);
    transition:
      width 220ms cubic-bezier(0.4, 0, 0.2, 1),
      border-radius 220ms cubic-bezier(0.4, 0, 0.2, 1),
      background-color 220ms cubic-bezier(0.4, 0, 0.2, 1),
      left 220ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .padding-sides-block.linked::before {
    width: 4px;
  }
  .padding-sides-block.unlinked::before {
    background: var(--ui-link-broken);
    width: 2px;
    border-radius: 1px;
    left: -0.25rem;
  }
  @media (prefers-reduced-motion: reduce) {
    .padding-sides-block::before { transition: none; }
  }

  .side-label {
    grid-column: 1;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    text-align: left;
    line-height: 1;
    /* Reserve gutter for the link-state bar so labels don't jostle when the
       indicator changes shape. Indents the side names slightly under
       "padding" — matching the sketch where top/right/bottom/left sit one
       step in from the parent label. */
    padding-left: 0.75rem;
  }
</style>
