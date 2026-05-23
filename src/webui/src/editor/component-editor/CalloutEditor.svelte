<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';
  import { calloutVariants } from '../../system/components/Callout.svelte';

  export const component = 'callout';
  const variants = calloutVariants;
  type Variant = typeof variants[number];

  function variantTokens(v: Variant): Token[] {
    return [
      { label: 'surface color', groupKey: 'surface', variable: `--callout-${v}-surface` },
      { label: 'border color', groupKey: 'border', variable: `--callout-${v}-border` },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--callout-${v}-border-width` },
      { label: 'accent edge width', canBeLinked: true, groupKey: 'accent-width', variable: `--callout-${v}-accent-width` },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--callout-${v}-radius` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--callout-${v}-padding` },
    ];
  }
  // Two type groups per variant: label (e.g. "Warning.") and message body.
  function variantTypeGroups(v: Variant): TypeGroupConfig[] {
    return [
      {
        legend: `${v} label`,
        colorVariable: `--callout-${v}-label`,
        familyVariable: `--callout-${v}-label-font-family`,
        sizeVariable: `--callout-${v}-label-font-size`,
        weightVariable: `--callout-${v}-label-font-weight`,
        lineHeightVariable: `--callout-${v}-label-line-height`,
      },
      {
        legend: `${v} message`,
        colorVariable: `--callout-${v}-text`,
        familyVariable: `--callout-${v}-text-font-family`,
        sizeVariable: `--callout-${v}-text-font-size`,
        weightVariable: `--callout-${v}-text-font-weight`,
        lineHeightVariable: `--callout-${v}-text-line-height`,
      },
    ];
  }
  function variantTypeGroupTokens(v: Variant): Token[] {
    return [
      { label: 'font family', canBeLinked: true, groupKey: 'label-font-family', variable: `--callout-${v}-label-font-family` },
      { label: 'font size', canBeLinked: true, groupKey: 'label-font-size', variable: `--callout-${v}-label-font-size` },
      { label: 'font weight', canBeLinked: true, groupKey: 'label-font-weight', variable: `--callout-${v}-label-font-weight` },
      { label: 'line height', canBeLinked: true, groupKey: 'label-line-height', variable: `--callout-${v}-label-line-height` },
      { label: 'font family', canBeLinked: true, groupKey: 'text-font-family', variable: `--callout-${v}-text-font-family` },
      { label: 'font size', canBeLinked: true, groupKey: 'text-font-size', variable: `--callout-${v}-text-font-size` },
      { label: 'font weight', canBeLinked: true, groupKey: 'text-font-weight', variable: `--callout-${v}-text-font-weight` },
      { label: 'line height', canBeLinked: true, groupKey: 'text-line-height', variable: `--callout-${v}-text-line-height` },
    ];
  }
  export const allTokens: Token[] = variants.flatMap((v) => [
    ...variantTokens(v),
    ...buildTypeGroupColorTokens(variantTypeGroups(v)),
    ...variantTypeGroupTokens(v),
  ]);

  const linkableProps = [
    'border-width', 'accent-width', 'radius', 'padding',
    'label-font-family', 'label-font-size', 'label-font-weight', 'label-line-height',
    'text-font-family', 'text-font-size', 'text-font-weight', 'text-line-height',
  ] as const;
  const linkableContexts = new Map<string, string>(
    variants.flatMap((v) => linkableProps.map((p) => [`--callout-${v}-${p}`, v] as [string, string]))
  );

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import Callout from '../../system/components/Callout.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import { buildSiblings } from './scaffolding/siblings';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleVariantTokens = $derived((v: Variant) => withLinkedDisabled(variantTokens(v), linked.varSet));

  const sample: Record<Variant, { label: string; message: string }> = {
    info: { label: 'Note.', message: 'This is contextual information you should know about.' },
    success: { label: 'Tip.', message: 'Bookmark this page so you can return when you need it.' },
    warning: { label: 'Warning.', message: 'This is a warning callout for important caveats or potential issues.' },
    danger: { label: 'Danger.', message: 'This action is destructive and cannot be undone.' },
  };
</script>

<ComponentEditorBase {component} title="Callout" description="Bordered callout box with semantic info / success / warning / danger variants, label + message text." tokens={allTokens} {linked} variants={variantOptions}>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={{ [v]: visibleVariantTokens(v) }}
      typeGroups={{ [v]: variantTypeGroups(v) }}
      {component}
      siblings={buildSiblings(variants, v, (sv) => ({ [sv]: variantTokens(sv) }), (sv) => ({ [sv]: variantTypeGroups(sv) }))}
    >
      <Callout variant={v} label={sample[v].label}>{sample[v].message}</Callout>
    </VariantGroup>
  {/each}
</ComponentEditorBase>
