<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import TokenLayout from './TokenLayout.svelte';
  import LinkageChart from './LinkageChart.svelte';
  import { getEditorContext } from './editorContext';
  import type { LinkedBlockResult, LinkedGroup } from './linkedBlock';

  /** Honor prefers-reduced-motion: matches the rest of the editor's motion
      vocabulary (UITokenSelector pop-bar gates its transitions the same way).
      Read once at module mount; user can toggle in OS preferences and reload. */
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const fadeDur = reduceMotion ? 0 : 140;
  const slideDur = reduceMotion ? 0 : 200;

  interface Props {
    component: string;
    linked: LinkedBlockResult;
  }

  let { component, linked }: Props = $props();

  const editorCtx = getEditorContext();
  const focusedVariant = editorCtx?.focusedVariant;
  const focusedState = editorCtx?.focusedState;
  const hoveredLinkedVariable = editorCtx?.hoveredLinkedVariable;

  /** Forward a chart row click to whichever tab strip the label belongs to. The chart
      doesn't know if its rows are variants (top-level tab strip) or states (per-VariantGroup
      state tabs), so we set both stores; each consumer adopts the value only if it names
      one of its own tabs. */
  function handleChartSelect(label: string) {
    editorCtx?.focusedVariant.set(label);
    editorCtx?.focusedState.set(label);
  }

  /** Pick the sibling that backs the cell the user is currently focused on, so the row
      reflects that specific variant×state. Tries the most specific match first
      (`"variant state"`), then either dimension alone, finally the group's default rep. */
  function pickFocusedVariable(g: LinkedGroup, variant: string | null, state: string | null): string {
    const map = g.contextToVariable;
    if (variant && state) {
      const both = map.get(`${variant} ${state}`);
      if (both) return both;
    }
    if (variant) {
      const v = map.get(variant);
      if (v) return v;
    }
    if (state) {
      const s = map.get(state);
      if (s) return s;
    }
    return g.token.variable;
  }

  /** Caption for a card's chart describing the linkage scope. 2-token context
      labels (e.g. "primary default") imply variants × states; single-token
      labels imply one axis. Tuned to typography linking across variants only. */
  function captionFor(contexts: string[]): string {
    if (contexts.length === 0) return '';
    const has2D = contexts.some((c) => /\s/.test(c));
    if (has2D) return 'Links across variants and states';
    return 'Links across variants';
  }

  /** Format the bracket text on the drill-down row. ≤2 names → comma-list;
      >2 names → numeric ("3 unlinked"). The names ARE the divergence info,
      so this is the primary signal when broken; the chart is drill-down detail. */
  function formatUnlinked(brokenContexts: string[]): string {
    if (brokenContexts.length === 0) return '';
    if (brokenContexts.length <= 2) {
      return `${brokenContexts.join(', ')} unlinked`;
    }
    return `${brokenContexts.length} unlinked`;
  }

  let focusedV = $derived((focusedVariant ? $focusedVariant : null) ?? null);
  let focusedS = $derived((focusedState ? $focusedState : null) ?? null);
  let hoveredVar = $derived((hoveredLinkedVariable ? $hoveredLinkedVariable : null) ?? null);

  function setHover(variable: string | null) {
    hoveredLinkedVariable?.set(variable);
  }

  /** One card per LinkedGroup. Stable order = editor-declared order. */
  let cards = $derived(linked.groups.map((g) => ({
    contexts: g.contexts,
    brokenContexts: g.brokenContexts,
    row: { ...g.token, variable: pickFocusedVariable(g, focusedV, focusedS) },
    caption: captionFor(g.contexts),
    unlinkedText: formatUnlinked(g.brokenContexts),
    isBroken: g.brokenContexts.length > 0,
  })));

  /** Section-level summary: count of properties with any broken peers. The
      header tells the user *whether to look*; the per-card text tells them
      *what's broken*. Two layers, two granularities. */
  let brokenPropertyCount = $derived(cards.filter((c) => c.isBroken).length);
  let hasAnyBroken = $derived(brokenPropertyCount > 0);

  /** Default closed; the section header's summary count + "in sync / N unlinked"
      text is the at-a-glance signal, so users opt into the matrix only when
      they need it. */
  let sectionToggleOverride: boolean | null = $state(null);
  let sectionExpanded = $derived(sectionToggleOverride ?? false);
  function toggleSection() {
    sectionToggleOverride = !sectionExpanded;
  }

  /** Per-card chart expand state, keyed by the card's row variable (which is
      stable per LinkedGroup since pickFocusedVariable runs against the same
      group on every render). */
  let expandedCards: Record<string, boolean> = $state({});
  function toggleCard(variable: string) {
    expandedCards = { ...expandedCards, [variable]: !expandedCards[variable] };
  }
</script>

{#if cards.length > 0}
  <section class="linked-block">
    <button
      type="button"
      class="section-header"
      class:expanded={sectionExpanded}
      aria-expanded={sectionExpanded}
      onclick={toggleSection}
    >
      <i class="fas fa-chevron-right chevron"></i>
      <span class="editor-section-title">Linked properties</span>
      <span class="section-summary">
        <span class="section-summary-sep">·</span>
        <span class="section-summary-count">{cards.length}</span>
        <span class="section-summary-sep">·</span>
        {#if hasAnyBroken}
          <span class="section-summary-broken">{brokenPropertyCount} unlinked</span>
        {:else}
          <span class="section-summary-ok">in sync</span>
        {/if}
      </span>
    </button>
    {#if sectionExpanded}
      <div class="linked-grid" transition:slide|local={{ duration: slideDur }}>
        {#each cards as card (card.row.variable)}
          {@const cardExpanded = expandedCards[card.row.variable] === true}
          {@const cardHovered = hoveredVar === card.row.variable}
          <article
            class="linked-card"
            class:broken={card.isBroken}
            class:hovered={cardHovered}
            onmouseenter={() => setHover(card.row.variable)}
            onmouseleave={() => setHover(null)}
          >
            <h4 class="property-name">{card.row.label}</h4>
            <div class="control-row">
              <TokenLayout
                tokens={[card.row]}
                {component}
                linkedOrder={linked.linkedOrder}
                isLinkedBlock
              />
            </div>
            <button
              type="button"
              class="drill-down"
              class:expanded={cardExpanded}
              aria-expanded={cardExpanded}
              onclick={() => toggleCard(card.row.variable)}
            >
              <i class="fas fa-chevron-right chevron"></i>
              <span class="drill-label">Links</span>
              {#if !cardExpanded && card.isBroken}
                <span
                  class="unlinked-bracket"
                  transition:fade|local={{ duration: fadeDur }}
                >({card.unlinkedText})</span>
              {/if}
            </button>
            {#if cardExpanded}
              <div class="chart-wrap" transition:slide|local={{ duration: slideDur }}>
                <LinkageChart
                  contexts={card.contexts}
                  broken={card.brokenContexts}
                  caption={card.caption}
                  selectedRow={focusedV}
                  selectedCol={focusedS}
                  onselect={handleChartSelect}
                />
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<style>
  /* Panel chrome matches NonStylableConfig (the "Configuration" panel) so the
     three sibling sections — config, variants, linked — read as a coherent
     family. Background + full border + radius give the section the same
     presence as its siblings even when collapsed to just the header row. */
  .linked-block {
    margin-top: var(--ui-space-12);
    padding: var(--ui-space-12);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface-low);
  }

  /* Section header — clickable strip that doubles as the collapsed-state
     summary. Reads "Linked properties · 7 · in sync" or "· 2 unlinked"; the
     count + status are the at-a-glance signal. The header sits at the top of
     the panel; when the body opens, it slides in below the header (the panel
     grows downward, the header stays put). */
  .section-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    width: 100%;
    padding: 0;
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .section-header .chevron {
    font-size: 0.625rem;
    color: var(--ui-text-tertiary);
    transition: transform var(--ui-transition-fast);
    width: 0.75rem;
  }
  .section-header.expanded .chevron {
    transform: rotate(90deg);
  }
  .section-summary {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
  }
  .section-summary-sep {
    color: var(--ui-border);
  }
  .section-summary-count {
    font-family: var(--ui-font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--ui-text-secondary);
  }
  .section-summary-ok {
    color: var(--ui-text-tertiary);
  }
  .section-summary-broken {
    color: var(--ui-link-broken);
  }

  .linked-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--ui-space-12);
    margin-top: var(--ui-space-20);
  }

  /* Card — vertical stack: label heading · control row · drill-down · chart.
     Chrome is the property's visual envelope. The card grows vertically when
     drilled down; adjacent cards keep their position. */
  .linked-card {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-lg);
    padding: var(--ui-space-12) var(--ui-space-16);
    min-width: 14rem;
  }
  /* Broken cards adopt the deep amber link-broken color directly — same hue
     as the section-summary text and the inline bracket, so the cue carries
     across all three layers (header → card border → bracket text). */
  .linked-card.broken {
    border-color: var(--ui-link-broken);
  }
  /* Bidirectional hover cue: when the user hovers this card, or the matching
     row in the per-state Properties grid, both surfaces light up so the
     linkage is legible at a glance. Background lift + border bump; broken
     cards keep their amber border so the link-state cue isn't overwritten. */
  .linked-card {
    transition: background var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }
  .linked-card.hovered {
    background: var(--ui-hover-lowest);
    border-color: var(--ui-border);
  }
  .linked-card.hovered.broken {
    border-color: var(--ui-link-broken);
  }
  /* Mirror the trigger-bg suppression from TokenLayout: while the card is
     hovered, the inner trigger drops its own surface fill so the card's
     hover band reads as one strip. Direct trigger hover keeps its style. */
  .linked-card.hovered :global(.ui-ts-trigger:not(:hover)) {
    background: transparent;
  }

  .property-name {
    margin: 0;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-medium);
    color: var(--ui-text-primary);
  }

  /* Control row hosts a single TokenLayout-rendered selector + resolved value.
     TokenLayout's inline label is suppressed here (we render our own heading
     above), and the grid is reduced to selector + value columns. */
  .control-row {
    display: flex;
    flex-direction: column;
  }
  .control-row :global(.token-row .token-label) {
    display: none;
  }
  .control-row :global(.token-group .token-grid) {
    /* Inherit --token-selector-w from TokenLayout's default (8rem) so the
       trigger renders at the same fixed width here as in per-variant view.
       The earlier 9rem override existed to give the chain badge breathing
       room inside the trigger; the badge is gone now, so the wider column
       just leaves dead space and visually misaligns the two contexts. */
    grid-template-columns: var(--token-selector-w) max-content;
    column-gap: var(--ui-space-8);
    padding: 0;
    /* Linked-block grid skips the label column (we render the property name
       above as a heading), so padding-single-row should start at col 1 here. */
    --padding-row-start: 1;
  }
  .control-row :global(.token-group .token-grid .ui-token-selector) {
    grid-column: span 2;
  }
  /* Linked-block parent grid only has 2 cols (selector + value), so
     UIPaddingSelector's .padding-sides-block can't subgrid into the
     [side-label][trigger][value] layout it uses in per-variant view —
     auto-placement would push each <UITokenSelector> onto its own row.
     Override to a self-contained 3-col grid so each side row keeps the
     [name][dropdown][value] alignment side by side. The `span 2` from the
     rule above still lands the dropdown in cols 2-3 of this local grid,
     after the side label takes col 1. */
  .control-row :global(.padding-sides-block) {
    grid-template-columns: max-content var(--token-selector-w) max-content;
    column-gap: var(--ui-space-8);
  }

  /* Drill-down row — chevron at the front, "Links" label, optional amber
     bracket of unlinked context names. Whole row is the click target. The
     bracket is hidden when expanded (the chart becomes the source of truth)
     and when nothing is broken (chart still drillable for inspection). */
  .drill-down {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) 0;
    background: none;
    border: 0;
    color: var(--ui-text-tertiary);
    font: inherit;
    font-size: var(--ui-font-size-sm);
    text-align: left;
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }
  .drill-down:hover {
    color: var(--ui-text-secondary);
  }
  .drill-down .chevron {
    font-size: 0.625rem;
    color: var(--ui-text-tertiary);
    transition: transform var(--ui-transition-fast);
    width: 0.75rem;
  }
  .drill-down.expanded .chevron {
    transform: rotate(90deg);
  }
  .drill-down .drill-label {
    color: var(--ui-text-secondary);
  }
  .unlinked-bracket {
    color: var(--ui-link-broken);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
  }

  /* Chart sits in its own wrapper so the column gap above the chart is the
     drill-down row's natural spacing, not the card's main gap. */
  .chart-wrap {
    display: flex;
    flex-direction: column;
  }

  .linked-card :global(.chart .chart-grid-wrap .grid > *) {
    padding: var(--ui-space-4) var(--ui-space-8);
  }
  .linked-card :global(.chart .chart-grid-wrap .grid-1d) {
    grid-template-columns: auto 28px;
  }
  .linked-card :global(.chart) {
    gap: var(--ui-space-6);
  }
  .linked-card :global(.chart .chart-label) {
    font-size: var(--ui-font-size-sm);
    font-weight: 400;
    color: var(--ui-text-tertiary);
  }
</style>
