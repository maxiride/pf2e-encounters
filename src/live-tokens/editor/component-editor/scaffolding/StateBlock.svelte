<script lang="ts">
  /**
   * Shared inner block rendered inside a single state in VariantGroup.
   *
   * Both the tabs branch and the list branch of VariantGroup render the same
   * `<TypeEditor>` (when a state has type groups) followed by `<TokenLayout>`,
   * differing only in the surrounding chrome (preview placement, toggles,
   * tab strip). This component owns the duplicated inner block so a per-state
   * control change happens in exactly one place.
   */
  import type { Snippet } from 'svelte';
  import TokenLayout from './TokenLayout.svelte';
  import TypeEditor from './TypeEditor.svelte';
  import type { Token, TypeGroupConfig } from './types';

  
  
  
  
  
  interface ElementToggle {
    checked: boolean;
    label?: string;
    onchange: (checked: boolean) => void;
  }

  interface Props {
    /** Tokens for this state, fed to `<TokenLayout>`. */
    tokens: Token[];
    /** Type groups for this state; rendered as a row of `<TypeEditor>` blocks. */
    typeGroups?: TypeGroupConfig[];
    /** Forwarded to TypeEditor and TokenLayout so writes persist through the editor store. */
    component?: string | undefined;
    /** Per-variable rank passed through to TokenLayout for linked-block alignment. */
    linkedOrder?: Map<string, number> | undefined;
    /** Render the token grid with N visual columns. >1 spreads a long property
      list horizontally; only meaningful for state-blocks without typeGroups
      (the two-col flex layout already partitions screen real estate when
      typeGroups are present). */
    columns?: number;
    /** Per-element Show toggle. When provided for an element in element-grouped
        mode, renders a checkbox next to that section's heading. The token rows
        below stay visible regardless — the toggle drives preview visibility,
        not editor visibility. */
    elementToggles?: Record<string, ElementToggle>;
    /** Explicit element ordering. Defaults to first-encounter across tokens
        then typeGroups, which works when structural elements (frame, container)
        come before named typography elements. Pass an explicit order when the
        natural first-encounter wouldn't produce the right reading order. */
    elementOrder?: string[];
    /** Element-keyed snippet rendered between the section heading and the
        section's typography/tokens. Lets callers inject per-element controls
        (e.g. a hairline position dropdown that conceptually belongs in the
        hairline section but isn't a CSS token). */
    elementExtras?: Snippet<[string]>;
    onchange?: () => void;
  }

  let {
    tokens,
    typeGroups = [],
    component = undefined,
    linkedOrder = undefined,
    columns = 1,
    elementToggles = {},
    elementOrder,
    elementExtras,
    onchange,
  }: Props = $props();

  let hasTypeGroups = $derived(typeGroups.length > 0);

  /** Element-grouped mode: when 2+ distinct element tags appear across tokens
      and type-groups, partition the panel into labeled subsections (e.g.
      "Frame", "Header", "Body"). Element order = first-encounter across the
      combined tokens + type-groups list. */
  let elementSections = $derived.by(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    if (elementOrder) {
      for (const el of elementOrder) {
        if (!seen.has(el)) { seen.add(el); order.push(el); }
      }
    }
    for (const t of tokens) {
      if (t.element && !seen.has(t.element)) {
        seen.add(t.element);
        order.push(t.element);
      }
    }
    for (const tg of typeGroups) {
      if (tg.element && !seen.has(tg.element)) {
        seen.add(tg.element);
        order.push(tg.element);
      }
    }
    if (order.length < 2) return null;
    return order.map((el) => ({
      element: el,
      tokens: tokens.filter((t) => t.element === el),
      typeGroups: typeGroups.filter((tg) => tg.element === el),
    }));
  });
</script>

{#if elementSections}
  <div class="state-controls element-grouped">
    {#each elementSections as section}
      {@const toggle = elementToggles[section.element]}
      <section class="element-section">
        <div class="element-heading-row">
          <h4 class="element-heading">{section.element}</h4>
          {#if toggle}
            <label class="element-show-toggle">
              <input
                type="checkbox"
                checked={toggle.checked}
                onchange={(e) => toggle.onchange((e.currentTarget as HTMLInputElement).checked)}
              />
              <span>{toggle.label ?? `Show ${section.element}`}</span>
            </label>
          {/if}
        </div>
        {@render elementExtras?.(section.element)}
        {#if section.typeGroups.length > 0}
          <div class="state-type-groups">
            {#each section.typeGroups as tg}
              <TypeEditor
                legend={tg.legend ?? ''}
                colorVariable={tg.colorVariable}
                colorLabel={tg.colorLabel ?? 'text color'}
                familyVariable={tg.familyVariable}
                familyLabel={tg.familyLabel ?? 'font family'}
                sizeVariable={tg.sizeVariable}
                sizeLabel={tg.sizeLabel ?? 'font size'}
                weightVariable={tg.weightVariable}
                weightLabel={tg.weightLabel ?? 'font weight'}
                lineHeightVariable={tg.lineHeightVariable}
                lineHeightLabel={tg.lineHeightLabel ?? 'line height'}
                letterSpacingVariable={tg.letterSpacingVariable}
                letterSpacingLabel={tg.letterSpacingLabel ?? 'letter spacing'}
                outlineWidthVariable={tg.outlineWidthVariable}
                outlineWidthLabel={tg.outlineWidthLabel ?? 'outline thickness'}
                outlineColorVariable={tg.outlineColorVariable}
                outlineColorLabel={tg.outlineColorLabel ?? 'outline color'}
                {component}
                {onchange}
              />
            {/each}
          </div>
        {/if}
        {#if section.tokens.length > 0}
          <TokenLayout
            title=""
            tokens={section.tokens}
            {component}
            {linkedOrder}
            {columns}
            {onchange}
          />
        {/if}
      </section>
    {/each}
  </div>
{:else}
<div class="state-controls" class:two-col={hasTypeGroups}>
  {#if hasTypeGroups}
    <div class="state-type-groups">
      {#each typeGroups as tg}
        <TypeEditor
          legend={tg.legend ?? 'type'}
          colorVariable={tg.colorVariable}
          colorLabel={tg.colorLabel ?? 'text color'}
          familyVariable={tg.familyVariable}
          familyLabel={tg.familyLabel ?? 'font family'}
          sizeVariable={tg.sizeVariable}
          sizeLabel={tg.sizeLabel ?? 'font size'}
          weightVariable={tg.weightVariable}
          weightLabel={tg.weightLabel ?? 'font weight'}
          lineHeightVariable={tg.lineHeightVariable}
          lineHeightLabel={tg.lineHeightLabel ?? 'line height'}
          letterSpacingVariable={tg.letterSpacingVariable}
          letterSpacingLabel={tg.letterSpacingLabel ?? 'letter spacing'}
          outlineWidthVariable={tg.outlineWidthVariable}
          outlineWidthLabel={tg.outlineWidthLabel ?? 'outline thickness'}
          outlineColorVariable={tg.outlineColorVariable}
          outlineColorLabel={tg.outlineColorLabel ?? 'outline color'}
          {component}
          {onchange}
        />
      {/each}
    </div>
  {/if}
  <TokenLayout
    title=""
    {tokens}
    {component}
    {linkedOrder}
    {columns}
    {onchange}
  />
</div>
{/if}

<style>
  .state-controls {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--ui-space-12);
    align-items: start;
    margin-top: var(--ui-space-4);
  }

  .state-controls.two-col {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16) var(--ui-space-16);
    align-items: flex-start;
    justify-content: flex-start;
  }

  .state-type-groups {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    align-items: flex-start;
  }

  /* Inside a state's two-col layout the fieldset frame is redundant with the
     surrounding state card. Flatten the border/padding but keep the legend so
     each block ("title", "body text", …) is identifiable. */
  .state-controls.two-col .state-type-groups :global(.fieldset-wrapper) {
    border: none;
    padding: 0;
  }

  .state-controls.two-col .state-type-groups :global(.fieldset-wrapper.active) {
    outline: none;
  }

  .state-controls.two-col .state-type-groups :global(.fieldset-legend) {
    padding: 0 var(--ui-space-4) var(--ui-space-4);
  }

  /* The general-properties column has no legend of its own; pad it down by
     one legend-line so its first row aligns with the first row of the
     adjacent type-group. */
  .state-controls.two-col > :global(.token-group) {
    padding-top: calc(var(--ui-font-size-xs) + var(--ui-space-4));
  }

  /* Element-grouped mode: subsections fan out across available width, each
     labeled by the element it targets (e.g. Frame / Header / Body). Three
     columns at typical editor widths, dropping to two then one as the panel
     narrows — the auto-fit + minmax does the responsive work without media
     queries. `align-items: start` keeps columns of different heights aligned
     to their top edge instead of stretching the shorter ones.
     Within a section the two-col split (typography fieldsets + property grid)
     still applies when the section has both. */
  .state-controls.element-grouped {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: var(--ui-space-20) var(--ui-space-32);
    align-items: start;
  }

  /* Each element section stacks typography fieldset(s) above the property
     grid in a single column, so both share the section's leftmost edge and
     line up with neighbouring sections that have no typography (e.g. Frame). */
  .element-section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    align-items: stretch;
  }

  .element-section .state-type-groups {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    align-items: flex-start;
  }

  /* Type-fieldsets sit chrome-less against the element-section's own
     boundary — the section heading already frames the block, and an extra
     fieldset border would double-line the visual. */
  .element-section .state-type-groups :global(.fieldset-wrapper) {
    border: none;
    padding: 0;
  }
  .element-section .state-type-groups :global(.fieldset-wrapper.active) {
    outline: none;
  }
  .element-section .state-type-groups :global(.fieldset-legend) {
    padding: 0 var(--ui-space-4) var(--ui-space-4);
  }

  /* TypeEditor's `.type-grid` and TokenLayout's `.token-grid` are independent
     grids stacked inside the same element-section. Each sizes its label
     column from its own `max-content`, so when one grid has long labels
     ("letter spacing") and the other has short ones ("padding") their
     dropdowns land at different x positions. Both grids honour
     `--editor-label-col` for their first column track; setting it here pins
     the label column to a shared minimum so short labels pad out and the
     dropdowns line up across the section. The `max-content` upper bound
     still lets exceptionally long labels grow.
     Cascades into the inner grids; @container narrow-width overrides in
     TokenLayout (which redefine `grid-template-columns` wholesale) still
     win when the panel is too tight to honour the wider track. */
  .element-section {
    --editor-label-col: minmax(7.5rem, max-content);
  }

  .element-heading-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-12);
    padding-bottom: var(--ui-space-4);
    border-bottom: 1px solid var(--ui-border-low);
  }

  .element-heading {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-medium);
    color: var(--ui-text-tertiary);
  }

  /* Show toggle next to the section heading — drives preview visibility for
     the element. Property rows below stay visible so users can still tune the
     hidden element's tokens. */
  .element-show-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
    user-select: none;
  }
  .element-show-toggle:hover { color: var(--ui-text-primary); }
  .element-show-toggle input { margin: 0; cursor: pointer; }
</style>
