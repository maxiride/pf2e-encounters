<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'progressbar';
  const variants = ['primary', 'success', 'warning', 'danger', 'info'] as const;
  type Variant = typeof variants[number];

  // Per variant: track (surface, border, border-width, radius, height) + fill (color).
  function variantTokens(v: Variant): Token[] {
    return [
      { label: 'fill color', groupKey: 'fill', variable: `--progressbar-${v}-fill` },
      { label: 'track surface color', groupKey: 'surface', variable: `--progressbar-${v}-track-surface` },
      { label: 'track border color', groupKey: 'border', variable: `--progressbar-${v}-track-border` },
      { label: 'track border width', canBeLinked: true, groupKey: 'track-border-width', variable: `--progressbar-${v}-track-border-width` },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--progressbar-${v}-radius` },
      { label: 'track height', canBeLinked: true, groupKey: 'track-height', variable: `--progressbar-${v}-track-height` },
    ];
  }

  // Two type groups per variant: label and value.
  function variantTypeGroups(v: Variant): TypeGroupConfig[] {
    return [
      {
        legend: 'label',
        colorVariable: `--progressbar-${v}-label`,
        familyVariable: `--progressbar-${v}-label-font-family`,
        sizeVariable: `--progressbar-${v}-label-font-size`,
        weightVariable: `--progressbar-${v}-label-font-weight`,
        lineHeightVariable: `--progressbar-${v}-label-line-height`,
      },
      {
        legend: 'value',
        colorVariable: `--progressbar-${v}-value`,
        familyVariable: `--progressbar-${v}-value-font-family`,
        sizeVariable: `--progressbar-${v}-value-font-size`,
        weightVariable: `--progressbar-${v}-value-font-weight`,
        lineHeightVariable: `--progressbar-${v}-value-line-height`,
      },
    ];
  }
  function variantTypeGroupTokens(v: Variant): Token[] {
    return [
      { label: 'font family', canBeLinked: true, groupKey: 'label-font-family', variable: `--progressbar-${v}-label-font-family` },
      { label: 'font size', canBeLinked: true, groupKey: 'label-font-size', variable: `--progressbar-${v}-label-font-size` },
      { label: 'font weight', canBeLinked: true, groupKey: 'label-font-weight', variable: `--progressbar-${v}-label-font-weight` },
      { label: 'line height', canBeLinked: true, groupKey: 'label-line-height', variable: `--progressbar-${v}-label-line-height` },
      { label: 'font family', canBeLinked: true, groupKey: 'value-font-family', variable: `--progressbar-${v}-value-font-family` },
      { label: 'font size', canBeLinked: true, groupKey: 'value-font-size', variable: `--progressbar-${v}-value-font-size` },
      { label: 'font weight', canBeLinked: true, groupKey: 'value-font-weight', variable: `--progressbar-${v}-value-font-weight` },
      { label: 'line height', canBeLinked: true, groupKey: 'value-line-height', variable: `--progressbar-${v}-value-line-height` },
    ];
  }
  export const allTokens: Token[] = variants.flatMap((v) => [
    ...variantTokens(v),
    ...buildTypeGroupColorTokens(variantTypeGroups(v)),
    ...variantTypeGroupTokens(v),
  ]);

  // Cross-variant linked block surfaces shape and font props that may be linked.
  const linkableContexts = new Map<string, string>(variants.flatMap((v) => [
    [`--progressbar-${v}-track-border-width`, v] as const,
    [`--progressbar-${v}-radius`, v] as const,
    [`--progressbar-${v}-track-height`, v] as const,
    [`--progressbar-${v}-label-font-family`, v] as const,
    [`--progressbar-${v}-label-font-size`, v] as const,
    [`--progressbar-${v}-label-font-weight`, v] as const,
    [`--progressbar-${v}-label-line-height`, v] as const,
    [`--progressbar-${v}-value-font-family`, v] as const,
    [`--progressbar-${v}-value-font-size`, v] as const,
    [`--progressbar-${v}-value-font-weight`, v] as const,
    [`--progressbar-${v}-value-line-height`, v] as const,
  ]));

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import ProgressBar from '../../system/components/ProgressBar.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import { buildSiblings } from './scaffolding/siblings';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleVariantTokens = $derived((v: Variant) => withLinkedDisabled(variantTokens(v), linked.varSet));
</script>

<ComponentEditorBase {component} title="Progress Bar" description="Animated progress bar with variants." tokens={allTokens} {linked} variants={variantOptions}>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={{ [v]: visibleVariantTokens(v) }}
      typeGroups={{ [v]: variantTypeGroups(v) }}
      {component}
      siblings={buildSiblings(variants, v, (sv) => ({ [sv]: variantTokens(sv) }), (sv) => ({ [sv]: variantTypeGroups(sv) }))}
    >
      <div class="progress-demo-stack">
        {#if v === 'primary'}
          <ProgressBar value={25} label="Getting Started" variant="primary" />
        {:else if v === 'success'}
          <ProgressBar value={100} label="Complete" variant="success" />
        {:else if v === 'warning'}
          <ProgressBar value={75} label="Almost Done" variant="warning" />
        {:else if v === 'danger'}
          <ProgressBar value={33} label="Danger Zone" variant="danger" />
        {:else if v === 'info'}
          <ProgressBar value={50} label="Halfway There" variant="info" />
        {/if}
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .progress-demo-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    width: 100%;
    max-width: 32rem;
  }
</style>
