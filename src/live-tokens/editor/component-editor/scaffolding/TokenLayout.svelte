<script lang="ts">
  import type { Component } from 'svelte';
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIVariantSelector from '../../ui/UIVariantSelector.svelte';
  import UIFontFamilySelector from '../../ui/UIFontFamilySelector.svelte';
  import UIFontWeightSelector from '../../ui/UIFontWeightSelector.svelte';
  import UIFontSizeSelector from '../../ui/UIFontSizeSelector.svelte';
  import UILineHeightSelector from '../../ui/UILineHeightSelector.svelte';
  import UIPaddingSelector from '../../ui/UIPaddingSelector.svelte';
  import { BLUR, BORDER_WIDTH, DOT_SIZE, RADIUS, SHADOW, DIVIDER_HEIGHT } from '../../ui/variantScales';
  import {
    editorState,
    getComponentPropertySiblings,
    setComponentAliasLinked,
    clearComponentAliasLinked,
  } from '../../core/store/editorStore';
  import { getEditorContext } from './editorContext';
  import type { Token } from './types';

  /** Selector kind. `padding-split` is `padding` whose per-side variables exist;
      it renders the four-sided field group instead of the single-value row. */
  type Kind =
    | 'surface'
    | 'border'
    | 'border-width'
    | 'radius'
    | 'divider-width'
    | 'divider-height'
    | 'dot-size'
    | 'blur'
    | 'shadow'
    | 'font-family'
    | 'font-weight'
    | 'font-size'
    | 'line-height'
    | 'padding'
    | 'padding-split'
    | 'gap'
    | 'extras';

  type Entry = { kind: Kind; token: Token };

  
  
  
  
  
  interface Props {
    title?: string;
    tokens: Token[];
    /** Forwarded to each selector; when set, writes persist through the editor store. */
    component?: string | undefined;
    /** Optional context labels per variable (shown below the selector). */
    contexts?: Record<string, string[]>;
    /** Per-variable rank that overrides kind rank when sorting; lets linked tokens align with the top linked row. */
    linkedOrder?: Map<string, number> | undefined;
    /** Set true on the linked-block instance so dimmed variant rows can scroll/flash to the matching anchor. */
    isLinkedBlock?: boolean;
    /** Number of visual columns. >1 switches to a column-major grid (grid-auto-flow: column)
      so the consumer can spread a long property list across the available width. In
      multi-col mode, the linked-first sort + zone divider are dropped — kind-grouped flow
      reads more naturally when columns themselves carry the visual grouping. */
    columns?: number;
    onchange?: () => void;
  }

  let {
    title = '',
    tokens,
    component = undefined,
    contexts = {},
    linkedOrder = undefined,
    isLinkedBlock = false,
    columns = 1,
    onchange,
  }: Props = $props();

  /** Suffix/prefix patterns mapped to kinds — single source of truth used by `categorize`.
      Order matters: `text` must run before `border`/`surface` because `--text-*` would
      otherwise match `surface` checks if any pattern overlapped. */
  const KIND_PATTERNS: Array<{ kind: Kind; matches: (v: string) => boolean }> = [
    { kind: 'font-family', matches: (v) => v.endsWith('-font-family') },
    { kind: 'font-weight', matches: (v) => v.endsWith('-font-weight') },
    { kind: 'font-size', matches: (v) => v.endsWith('-font-size') || v.endsWith('-icon-size') },
    { kind: 'line-height', matches: (v) => v.endsWith('-line-height') },
    { kind: 'extras', matches: (v) => v.endsWith('-text') || v.startsWith('--text-') },
    { kind: 'radius', matches: (v) => v.endsWith('-radius') || v.startsWith('--radius-') },
    { kind: 'divider-width', matches: (v) => v.endsWith('-divider-width') || v.endsWith('-divider-thickness') },
    { kind: 'divider-height', matches: (v) => v.endsWith('-divider-height') || v.endsWith('-track-height') },
    { kind: 'dot-size', matches: (v) => v.endsWith('-dot-size') },
    { kind: 'blur', matches: (v) => v.endsWith('-blur') || v.startsWith('--blur-') },
    { kind: 'shadow', matches: (v) => v.endsWith('-shadow') || v.startsWith('--shadow-') },
    { kind: 'padding', matches: (v) => v.endsWith('-padding') || v.endsWith('-margin') },
    { kind: 'gap', matches: (v) => v.endsWith('-gap') },
    { kind: 'border-width', matches: (v) => v.endsWith('-border-width') || v.endsWith('-accent-width') || v.endsWith('-hairline-thickness') || v.startsWith('--border-width-') },
    { kind: 'border', matches: (v) => v.endsWith('-border') || v.startsWith('--border-') },
    { kind: 'surface', matches: (v) => v.endsWith('-surface') || v.startsWith('--surface-') },
  ];

  /** Fixed internal order for tokens within a layout. `padding-split` co-orders with `padding`. */
  const baseKindOrder: Kind[] = [
    'font-family',
    'font-weight',
    'font-size',
    'line-height',
    'divider-width',
    'divider-height',
    'dot-size',
    'radius',
    'padding',
    'padding-split',
    'gap',
    'blur',
    'shadow',
    'extras',
    'surface',
    'border-width',
    'border',
  ];
  const orderRank: Record<Kind, number> = Object.fromEntries(
    baseKindOrder.map((k, i) => [k, i]),
  ) as Record<Kind, number>;

  function rawKind(v: string): Kind {
    for (const { kind, matches } of KIND_PATTERNS) {
      if (matches(v)) return kind;
    }
    return 'extras';
  }

  /** A padding token is "split" when its per-side variables exist for this component. */
  function paddingIsSplit(varName: string, comp: string | undefined, state: typeof $editorState): boolean {
    const sides = ['top', 'right', 'bottom', 'left'];
    if (comp) {
      const slice = state.components[comp];
      if (!slice) return false;
      return sides.some((s) => `${varName}-${s}` in slice.aliases);
    }
    return sides.some((s) => !!document.documentElement.style.getPropertyValue(`${varName}-${s}`).trim());
  }

  function categorize(token: Token, comp: string | undefined, state: typeof $editorState): Kind {
    const k = rawKind(token.variable);
    if (k === 'padding' && token.splittable !== false && paddingIsSplit(token.variable, comp, state)) {
      return 'padding-split';
    }
    return k;
  }

  /** For sibling/grouping checks we want the canonical kind, not the split-vs-single distinction. */
  function groupingKind(v: string): Kind {
    return rawKind(v);
  }

  /** Selector registry: one entry per kind. `extra` props (e.g. UIPaddingSelector's
      `mode`/`splittable`/`rowLabel`) are forwarded alongside the linked props. */
  type SelectorEntry = {
    component: Component<any, any, any>;
    extra?: (token: Token) => Record<string, unknown>;
    /** When true, the row is rendered as a self-contained block (spans all grid columns,
        no .token-row wrapper, no contexts strip). Currently only `padding-split`. */
    standalone?: boolean;
  };

  const SELECTOR_REGISTRY: Record<Kind, SelectorEntry> = {
    'font-family': { component: UIFontFamilySelector },
    'font-weight': { component: UIFontWeightSelector },
    'font-size': { component: UIFontSizeSelector },
    'line-height': { component: UILineHeightSelector },
    'border-width': { component: UIVariantSelector, extra: () => ({ ...BORDER_WIDTH }) },
    'divider-width': { component: UIVariantSelector, extra: () => ({ ...BORDER_WIDTH }) },
    'divider-height': { component: UIVariantSelector, extra: () => ({ ...DIVIDER_HEIGHT }) },
    'dot-size': { component: UIVariantSelector, extra: () => ({ ...DOT_SIZE }) },
    'radius': { component: UIVariantSelector, extra: () => ({ ...RADIUS }) },
    'padding': { component: UIPaddingSelector, extra: (t) => ({ mode: 'single', splittable: t.splittable !== false }) },
    /* padding-split is NOT standalone: TokenLayout renders the .token-label
       (e.g. "padding") in col 1 and the wrapper provides the [label][trigger][value]
       subgrid. UIPaddingSelector's sides template fills cols 2-3 of row 1 with
       the link/merge header and cols 1-3 of row 2 with the side rows, so the
       four side dropdowns align with the same trigger and value columns as
       every other property in the panel. */
    'padding-split': {
      component: UIPaddingSelector,
      extra: () => ({ mode: 'sides' }),
    },
    'gap': { component: UIPaddingSelector, extra: () => ({ mode: 'single', splittable: false }) },
    'blur': { component: UIVariantSelector, extra: () => ({ ...BLUR }) },
    'shadow': { component: UIVariantSelector, extra: () => ({ ...SHADOW }) },
    'surface': { component: UIPaletteSelector },
    'border': { component: UIPaletteSelector },
    'extras': { component: UIPaletteSelector },
  };

  /** Multi-col rank: same as `orderRank` but with `extras` (text-color-like) hoisted
      between `line-height` and `border-width` so typography reads as one logical
      block in column flow. Single-col mode keeps `orderRank` (linked-first sort
      already segregates extras to the bottom). */
  const multiColRank: Record<Kind, number> = (() => {
    const reordered: Kind[] = [
      'font-family',
      'font-weight',
      'font-size',
      'line-height',
      'extras',
      'divider-width',
      'divider-height',
      'dot-size',
      'radius',
      'padding',
      'padding-split',
      'gap',
      'blur',
      'shadow',
      'surface',
      'border-width',
      'border',
    ];
    return Object.fromEntries(reordered.map((k, i) => [k, i])) as Record<Kind, number>;
  })();

  function buildEntries(list: Token[], order: Map<string, number> | undefined, linked: Set<Kind>, comp: string | undefined, state: typeof $editorState, multiCol: boolean): Entry[] {
    const indexed = list.map((token, i) => ({ e: { kind: categorize(token, comp, state), token }, i }));
    const rank = multiCol ? multiColRank : orderRank;
    indexed.sort((a, b) => {
      if (!multiCol) {
        const aLinked = linked.has(a.e.kind) ? 0 : 1;
        const bLinked = linked.has(b.e.kind) ? 0 : 1;
        if (aLinked !== bLinked) return aLinked - bLinked;
      }
      const rankDiff = rank[a.e.kind] - rank[b.e.kind];
      if (rankDiff !== 0) return rankDiff;
      const aKey = order?.get(a.e.token.variable);
      const bKey = order?.get(b.e.token.variable);
      if (aKey !== undefined && bKey !== undefined) return aKey - bKey;
      if (aKey !== undefined) return -1;
      if (bKey !== undefined) return 1;
      return a.i - b.i;
    });
    return indexed.map((x) => x.e);
  }

  /** Kinds that currently have at least one variable with ≥2 siblings in the component.
      Returns canonical kinds (so a `padding` linked-set covers `padding-split` rows too). */
  function computeLinkedKinds(comp: string | undefined, state: typeof $editorState): Set<Kind> {
    const set = new Set<Kind>();
    if (!comp) return set;
    const slice = state.components[comp];
    if (!slice) return set;
    for (const varName of Object.keys(slice.aliases)) {
      if (getComponentPropertySiblings(comp, varName).length >= 2) {
        const k = groupingKind(varName);
        set.add(k);
        if (k === 'padding') set.add('padding-split');
      }
    }
    return set;
  }

  /** When a row collapses several groupKey leads into one display, mirror the lead's
      new alias onto each peer (and its siblings) so the merged display stays in sync. */
  function handleRowChange(token: Token) {
    if (token.mergeVariables?.length && component) {
      const slice = $editorState.components[component];
      const leadAlias = slice?.aliases[token.variable];
      for (const peer of token.mergeVariables) {
        if (leadAlias) setComponentAliasLinked(component, peer, leadAlias);
        else clearComponentAliasLinked(component, peer);
      }
    }
    onchange?.();
  }

  /** Bidirectional hover cue with the Linked-properties block. The upper grid
      (isLinkedBlock=false) drives and reads the shared store; the inner grid
      inside each linked card (isLinkedBlock=true) sits out — its parent card
      already provides the visual cue, and re-emitting from the inner row would
      flicker hover state when the cursor crossed sub-elements. */
  const editorCtx = getEditorContext();
  const hoveredLinkedVariable = editorCtx?.hoveredLinkedVariable;
  function setHover(variable: string | null) {
    if (isLinkedBlock) return;
    hoveredLinkedVariable?.set(variable);
  }

  let hoveredVar = $derived(!isLinkedBlock && hoveredLinkedVariable ? $hoveredLinkedVariable : null);
  let isMultiCol = $derived(columns > 1);
  let linkedKinds = $derived(computeLinkedKinds(component, $editorState));
  let entries = $derived(buildEntries(tokens.filter((t) => !t.hidden), linkedOrder, linkedKinds, component, $editorState, isMultiCol));
  /** Index of the first independent (non-linked) entry; -1 when there are no linked entries or no boundary.
      Suppressed in multi-col mode (no divider — column structure is the grouping). */
  let firstIndependentIdx = $derived((() => {
    if (isMultiCol) return -1;
    const idx = entries.findIndex((e) => !linkedKinds.has(e.kind));
    if (idx <= 0) return -1;
    return idx;
  })());
  /** Rows per column for column-major flow; ceil so the last column may be short. */
  let rowsPerCol = $derived(isMultiCol ? Math.max(1, Math.ceil(entries.length / columns)) : entries.length);

</script>

<div class="token-group">
  {#if title}
    <span class="token-group-title">{title}</span>
  {/if}
  <div
    class="token-grid"
    class:multi-col={isMultiCol}
    style:--columns={columns}
    style:--rows-per-col={rowsPerCol}
  >
    {#each entries as entry, i}
      {@const token = entry.token}
      {@const dis = token.disabled ?? false}
      {@const ctxs = contexts[token.variable]}
      {@const lockedSelections = dis}
      {@const sel = SELECTOR_REGISTRY[entry.kind]}
      {@const sharedProps = {
        variable: token.variable,
        component,
        canBeLinked: token.canBeLinked ?? false,
        selectionsLocked: lockedSelections,
      }}
      {@const extra = sel.extra ? sel.extra(token) : {}}
      {@const isNonFirstSet = isMultiCol && Math.floor(i / rowsPerCol) > 0}
      {#if i === firstIndependentIdx}
        <div class="zone-divider" aria-hidden="true"></div>
      {/if}
      <!--
        Same wrapper for standalone and row-chrome modes so the inner
        <svelte:component> stays at one template position across a kind
        change (e.g. padding ↔ padding-split). If we branched on
        sel.standalone with the component inside each branch, Svelte
        would treat them as different mount points and remount the
        selector — which kills any |local transition the selector runs
        on internal prop changes (mode in UIPaddingSelector). Class
        toggling alone keeps the instance alive; the label and contexts
        come and go around it.
      -->
      {@const isLinkedRow = linkedKinds.has(entry.kind)}
      {@const isHovered = !isLinkedBlock && isLinkedRow && hoveredVar === token.variable}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="token-entry"
        class:token-row={!sel.standalone}
        class:has-contexts={!sel.standalone && !!ctxs?.length}
        class:linked-hovered={isHovered}
        class:non-first-set={isNonFirstSet}
        onmouseenter={isLinkedBlock || !isLinkedRow ? undefined : () => setHover(token.variable)}
        onmouseleave={isLinkedBlock || !isLinkedRow ? undefined : () => setHover(null)}
      >
        {#if !sel.standalone}
          <span class="token-label">{token.label}</span>
        {/if}
        <sel.component
          {...sharedProps}
          {...extra}
          onchange={() => handleRowChange(token)}
        />
        {#if !sel.standalone && ctxs?.length}
          <div class="token-contexts">
            {#each ctxs as ctx}
              <span class="token-context">{ctx}</span>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .token-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .token-group-title {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .token-grid {
    --token-selector-w: 8rem;
    --columns: 1;
    display: grid;
    /* Label column tracks `--editor-label-col` when an ancestor sets one
       (e.g. StateBlock's `.element-section`), so this grid lines up with a
       sibling `.type-grid` whose `max-content` would otherwise differ. */
    grid-template-columns: repeat(var(--columns), var(--editor-label-col, max-content) var(--token-selector-w) 1fr);
    column-gap: var(--ui-space-10);
    row-gap: var(--ui-space-6);
    align-items: center;
    padding: var(--ui-space-4) var(--ui-space-12);
    min-width: 0;
  }
  /* Multi-col mode: column-major flow with explicit row count so items fill
     column 1 top-to-bottom before spilling into column 2, etc. The value track
     drops to `auto` so column-sets pack at natural width instead of letting
     `1fr` value cells eat the panel and shove sets to opposite edges. The
     inter-set gap is applied as `padding-left` on the lead column of every
     non-first set — see `.non-first-set > .token-label`. Selector width and
     gap are intentionally tighter than single-col so the layout stays viable
     inside the docked overlay's iframe (~624px container at default width). */
  .token-grid.multi-col {
    --token-selector-w: 7rem;
    grid-template-columns: repeat(var(--columns), max-content var(--token-selector-w) auto);
    grid-template-rows: repeat(var(--rows-per-col), auto);
    grid-auto-flow: column;
    column-gap: var(--ui-space-8);
    justify-content: start;
  }
  .token-grid.multi-col .token-entry.token-row.non-first-set > .token-label {
    padding-left: var(--ui-space-20);
  }

  @container variant-group (max-width: 480px) {
    .token-grid { --token-selector-w: 6rem; }
  }

  /* Narrow multi-col: shrink selector + inter-set gap further before giving
     up the second column. Targets the overlay's typical docked width range. */
  @container variant-group (max-width: 640px) {
    .token-grid.multi-col {
      --token-selector-w: 6rem;
      column-gap: var(--ui-space-6);
    }
    .token-grid.multi-col .token-entry.token-row.non-first-set > .token-label {
      padding-left: var(--ui-space-12);
    }
  }

  /* Drop to one column only when even the tightened layout can't fit two
     sets. Single col uses row flow (default), so unsetting the column-flow +
     row template restores the original layout. The value track returns to
     `1fr` so the lone column fills the panel like single-col mode, and the
     inter-set padding is suppressed so wrapped "set 2" rows don't sit
     indented. */
  @container variant-group (max-width: 520px) {
    .token-grid.multi-col {
      --columns: 1;
      grid-template-columns: max-content var(--token-selector-w) 1fr;
      grid-template-rows: none;
      grid-auto-flow: row;
      column-gap: var(--ui-space-10);
    }
    .token-grid.multi-col .token-entry.token-row.non-first-set > .token-label {
      padding-left: 0;
    }
  }

  @container variant-group (max-width: 380px) {
    .token-grid {
      grid-template-columns: max-content 1fr;
      column-gap: var(--ui-space-6);
    }
    .token-grid :global(.ui-token-selector) { grid-column: 2; }
  }

  .zone-divider {
    grid-column: 1 / -1;
    height: 1.75rem;
  }

  /* The wrapper exists in both standalone and row-chrome modes to keep
     the inner <svelte:component> at one template position across kind
     changes (so its internal |local transitions can fire on prop
     updates instead of being short-circuited by a remount).
     - Standalone (no .token-row): `display: contents` makes the
       wrapper transparent to the parent grid, letting the standalone
       child (e.g. UIPaddingSelector's split fieldset) place itself
       directly against `.token-grid`'s columns just like it did when
       it was rendered without a wrapper.
     - Row chrome (.token-row): grid + subgrid + alignment, the
       original .token-row layout for [label][trigger][value]. */
  .token-entry {
    display: contents;
  }
  .token-entry.token-row {
    display: grid;
    grid-template-columns: subgrid;
    /* Span one [label][selector][value] column-set. Equivalent to `1 / -1`
       in single-col mode (3 sub-cols total) and lands the row in one
       column-set in multi-col mode (3*N sub-cols total). */
    grid-column: span 3;
    align-items: center;
    row-gap: var(--ui-space-2);
    border-radius: var(--ui-radius-sm);
    transition: background var(--ui-transition-fast), box-shadow var(--ui-transition-fast);
    min-width: 0;
  }
  /* Bidirectional hover cue with the Linked-properties block. Background
     lift extends the row beyond its three columns so the cue reads as a
     full-width band; box-shadow adds the same horizontal padding the grid's
     own padding provides without pushing the row's inner layout. */
  .token-entry.token-row.linked-hovered {
    background: var(--ui-hover-lowest);
    box-shadow: 0 0 0 var(--ui-space-6) var(--ui-hover-lowest);
  }
  /* Suppress the trigger's own surface fill while the row is in the linked-
     hover state so the row's hover band reads as one continuous strip
     instead of being broken by the trigger's brighter chip. `:not(:hover)`
     keeps the trigger's direct hover style intact when the cursor lands on
     it specifically. */
  .token-entry.token-row.linked-hovered :global(.ui-ts-trigger:not(:hover)) {
    background: transparent;
  }

  .token-label {
    grid-column: 1;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    text-align: left;
    line-height: 1;
  }

  .token-contexts {
    grid-column: 2 / -1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .token-context {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    white-space: nowrap;
  }
</style>
