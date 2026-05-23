<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';
  import { badgeVariants } from '../../system/components/Badge.svelte';

  export const component = 'badge';
  const variants = badgeVariants;
  type Variant = typeof variants[number];

  // Each variant is its own visual presentation; surface/text/border colors are unique.
  // Shape props (radius/border-width/padding/shadow) and font props can be linked across variants.
  function variantTokens(variant: Variant): Token[] {
    return [
      { label: 'surface color', groupKey: 'surface', variable: `--badge-${variant}-surface` },
      { label: 'border color', groupKey: 'border', variable: `--badge-${variant}-border` },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--badge-${variant}-border-width` },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--badge-${variant}-radius` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--badge-${variant}-padding` },
      { label: 'badge shadow', canBeLinked: true, groupKey: 'shadow', variable: `--badge-${variant}-shadow` },
      { label: 'backdrop blur', canBeLinked: true, groupKey: 'blur', variable: `--badge-${variant}-blur` },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: `--badge-${variant}-icon-size` },
    ];
  }
  function variantTypeGroups(variant: Variant): TypeGroupConfig[] {
    return [{
      legend: `${variant} text`,
      colorVariable: `--badge-${variant}-text`,
      familyVariable: `--badge-${variant}-text-font-family`,
      sizeVariable: `--badge-${variant}-text-font-size`,
      weightVariable: `--badge-${variant}-text-font-weight`,
      lineHeightVariable: `--badge-${variant}-text-line-height`,
    }];
  }
  function variantTypeGroupTokens(variant: Variant): Token[] {
    return [
      { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--badge-${variant}-text-font-family` },
      { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--badge-${variant}-text-font-size` },
      { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--badge-${variant}-text-font-weight` },
      { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--badge-${variant}-text-line-height` },
    ];
  }
  export const allTokens: Token[] = variants.flatMap((v) => [
    ...variantTokens(v),
    ...buildTypeGroupColorTokens(variantTypeGroups(v)),
    ...variantTypeGroupTokens(v),
  ]);

  // Cross-variant sharing: any token with canBeLinked+groupKey participates in
  // the linked block when ≥2 variants currently agree on its alias.
  const linkableProps = [
    'border-width', 'radius', 'padding', 'shadow', 'blur', 'icon-size',
    'text-font-family', 'text-font-size', 'text-font-weight', 'text-line-height',
  ] as const;
  const linkableContexts = new Map<string, string>(
    variants.flatMap((v) => linkableProps.map((p) => [`--badge-${v}-${p}`, v] as [string, string]))
  );

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import Badge from '../../system/components/Badge.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import { buildSiblings } from './scaffolding/siblings';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleVariantTokens = $derived((v: Variant) => withLinkedDisabled(variantTokens(v), linked.varSet));
</script>

<ComponentEditorBase {component} title="Badge" description="Pill-shaped badges with color variants." tokens={allTokens} {linked} variants={variantOptions}>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={{ [v]: visibleVariantTokens(v) }}
      typeGroups={{ [v]: variantTypeGroups(v) }}
      {component}
      siblings={buildSiblings(variants, v, (sv) => ({ [sv]: variantTokens(sv) }), (sv) => ({ [sv]: variantTypeGroups(sv) }))}
    >
      <div class="badge-showcase-grid">
        <Badge variant={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</Badge>
        <Badge variant={v} icon="fa-solid fa-dice-d20">With Icon</Badge>
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .badge-showcase-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
    align-items: center;
  }
</style>
