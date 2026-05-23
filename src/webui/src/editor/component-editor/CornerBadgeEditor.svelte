<script module lang="ts">
  import type { Token } from './scaffolding/types';
  import { badgeVariants } from '../../system/components/Badge.svelte';

  export const component = 'cornerbadge';

  // One state per variant; role-specific groupKeys link the same role across variants while keeping roles independent within a variant.
  function variantTokens(v: typeof badgeVariants[number]): Token[] {
    return [
      { label: 'offset from corner', canBeLinked: true, groupKey: 'margin', variable: `--corner-badge-${v}-margin` },
      { label: 'outer corner radius', canBeLinked: true, groupKey: 'outer-radius', variable: `--corner-badge-${v}-outer-radius` },
      { label: 'inner corner radius', canBeLinked: true, groupKey: 'inner-radius', variable: `--corner-badge-${v}-inner-radius` },
      { label: 'horizontal-axis radius', canBeLinked: true, groupKey: 'h-axis-radius', variable: `--corner-badge-${v}-h-axis-radius` },
      { label: 'vertical-axis radius', canBeLinked: true, groupKey: 'v-axis-radius', variable: `--corner-badge-${v}-v-axis-radius` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--corner-badge-${v}-padding` },
      // Hidden per-side overrides for UIPaddingSelector split mode; declared so siblings link across variants.
      { label: 'padding-top', canBeLinked: true, groupKey: 'padding-top', variable: `--corner-badge-${v}-padding-top`, hidden: true },
      { label: 'padding-right', canBeLinked: true, groupKey: 'padding-right', variable: `--corner-badge-${v}-padding-right`, hidden: true },
      { label: 'padding-bottom', canBeLinked: true, groupKey: 'padding-bottom', variable: `--corner-badge-${v}-padding-bottom`, hidden: true },
      { label: 'padding-left', canBeLinked: true, groupKey: 'padding-left', variable: `--corner-badge-${v}-padding-left`, hidden: true },
      { label: 'font family', canBeLinked: true, groupKey: 'text-font-family', variable: `--corner-badge-${v}-text-font-family` },
      { label: 'font size', canBeLinked: true, groupKey: 'text-font-size', variable: `--corner-badge-${v}-text-font-size` },
      { label: 'font weight', canBeLinked: true, groupKey: 'text-font-weight', variable: `--corner-badge-${v}-text-font-weight` },
      { label: 'line height', canBeLinked: true, groupKey: 'text-line-height', variable: `--corner-badge-${v}-text-line-height` },
    ];
  }
  export const allTokens: Token[] = badgeVariants.flatMap((v) => variantTokens(v));

  // Linkable vars across variants; variant name as context label so chart rows mirror the tab strip.
  const linkableContexts = new Map<string, string>(
    badgeVariants.flatMap((v) =>
      variantTokens(v)
        .filter((t) => t.canBeLinked)
        .map((t) => [t.variable, v] as [string, string]),
    ),
  );

  const variantOptions = badgeVariants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import CornerBadge, { type CornerAnchor } from '../../system/components/CornerBadge.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import { buildSiblings } from './scaffolding/siblings';
  import demoImageUrl from '../../system/assets/newspaper.webp';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleVariantTokens = $derived((v: typeof badgeVariants[number]) => withLinkedDisabled(variantTokens(v), linked.varSet));

  let anchor: CornerAnchor = $state('bottom-right');
  const anchorGrid: ReadonlyArray<{ value: CornerAnchor; icon: string; label: string }> = [
    { value: 'top-left',     icon: 'fas fa-arrow-up-left',     label: 'Top left' },
    { value: 'top-right',    icon: 'fas fa-arrow-up-right',    label: 'Top right' },
    { value: 'bottom-left',  icon: 'fas fa-arrow-down-left',   label: 'Bottom left' },
    { value: 'bottom-right', icon: 'fas fa-arrow-down-right',  label: 'Bottom right' },
  ];
</script>

<ComponentEditorBase {component} title="Corner Badge" description="Badge pinned flush to a corner of a positioned ancestor. Composes <code>Badge</code>; adds offset + inner-radius tokens." tokens={allTokens} {linked} variants={variantOptions}>
  {#each badgeVariants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={{ [v]: visibleVariantTokens(v) }}
      {component}
      siblings={buildSiblings(badgeVariants, v, (sv) => ({ [sv]: variantTokens(sv) }))}
    >
      {#snippet canvasToolbarExtras()}
        <span class="canvas-toolbar-eyebrow">Anchor</span>
        <div class="anchor-grid" role="radiogroup" aria-label="Corner badge anchor">
          {#each anchorGrid as opt (opt.value)}
            <button
              type="button"
              class="anchor-btn"
              class:checked={anchor === opt.value}
              role="radio"
              aria-checked={anchor === opt.value}
              aria-label={opt.label}
              title={opt.label}
              onclick={() => (anchor = opt.value)}
            >
              <i class={opt.icon} aria-hidden="true"></i>
            </button>
          {/each}
        </div>
      {/snippet}
      <div class="corner-stage-wrap">
        <div class="corner-stage">
          <img src={demoImageUrl} alt="" class="corner-stage-image" />
          <CornerBadge variant={v} {anchor}>{v.charAt(0).toUpperCase() + v.slice(1)}</CornerBadge>
        </div>
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  /* Center stage so it doesn't stretch full-width. */
  .corner-stage-wrap {
    display: grid;
    place-items: center;
  }

  /* Positioned ancestor for CornerBadge; no overflow:hidden so badge can extend past edges. */
  .corner-stage {
    position: relative;
    width: 380px;
  }

  .corner-stage-image {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--ui-radius-md);
  }

  .anchor-grid {
    display: grid;
    grid-template-columns: repeat(2, 1.5rem);
    grid-template-rows: repeat(2, 1.5rem);
    gap: 2px;
  }
  .anchor-btn {
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--ui-border-low, rgba(255, 255, 255, 0.1));
    border-radius: var(--ui-radius-sm);
    background: transparent;
    color: var(--ui-text-tertiary);
    cursor: pointer;
    font-size: 0.7rem;
    line-height: 1;
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }
  .anchor-btn:hover {
    color: var(--ui-text-primary);
  }
  .anchor-btn.checked {
    background: var(--ui-surface-active, rgba(255, 255, 255, 0.12));
    color: var(--ui-text-primary);
    border-color: var(--ui-border-higher, rgba(255, 255, 255, 0.25));
  }
</style>
