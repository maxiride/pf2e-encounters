<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'collapsiblesection';

  const VARIANTS = ['chromeless', 'divider', 'container'] as const;
  type Variant = typeof VARIANTS[number];
  // CSS-layer state names (used in the var names) vs UI-layer labels (shown in
  // the editor). The CSS keeps the historical `active` slug for compatibility;
  // the UI surfaces it as "Current" because users read `:active` as click-press.
  const HEADER_STATES = ['default', 'hover', 'active'] as const;
  type HeaderState = typeof HEADER_STATES[number];
  const HEADER_STATE_LABELS: Record<HeaderState, string> = {
    default: 'Default',
    hover: 'Hover',
    active: 'Current',
  };

  const VARIANT_LABELS: Record<Variant, string> = {
    chromeless: 'Chromeless',
    divider: 'With Divider',
    container: 'Container',
  };

  // Header tokens per variant. Chromeless has no chrome; divider exposes the
  // bottom-border (the divider line) per state; container's outer chrome lives
  // in the Container part so the header strip just owns surface + padding + text.
  function headerStateTokens(v: Variant, s: HeaderState): Token[] {
    const p = `--collapsiblesection-${v}-${s}`;
    const base: Token[] = [
      { label: 'surface color', groupKey: 'surface', variable: `${p}-surface` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `${p}-padding` },
      { label: 'icon color', groupKey: 'icon', variable: `${p}-icon` },
      { label: 'icon size', canBeLinked: true, groupKey: 'font-size', variable: `${p}-icon-size` },
    ];
    if (v === 'divider') {
      base.splice(1, 0,
        { label: 'divider color', groupKey: 'border', variable: `${p}-border` },
        { label: 'divider width', canBeLinked: true, groupKey: 'border-width', variable: `${p}-border-width` },
      );
    }
    return base;
  }

  // Container part: the always-on outer chrome of the Container variant only.
  const containerPartTokens: Token[] = [
    { label: 'border color', groupKey: 'border', variable: '--collapsiblesection-container-frame-border' },
    { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: '--collapsiblesection-container-frame-border-width' },
    { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: '--collapsiblesection-container-frame-radius' },
  ];

  // Body: revealed content area. Chromeless/divider only own padding; container
  // also paints its own surface so the body can read distinct from the header.
  // (CSS var name keeps the `expanded` slug for backward compatibility.)
  function bodyTokens(v: Variant): Token[] {
    const p = `--collapsiblesection-${v}-expanded`;
    const tokens: Token[] = [];
    if (v === 'container') tokens.push({ label: 'surface color', groupKey: 'surface', variable: `${p}-surface` });
    tokens.push({ label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `${p}-padding` });
    return tokens;
  }

  // Two-tier "Element / State" key convention. VariantGroup detects the " / "
  // separator and renders a parts strip on top with a state sub-strip beneath
  // when the active part has interaction states. Parts:
  //   - Container: outer chrome (container variant only) — no sub-states
  //   - Header: the always-visible bar — has Default/Hover/Current states
  //   - Body: the revealed content panel — no sub-states
  function variantStates(v: Variant): Record<string, Token[]> {
    const out: Record<string, Token[]> = {};
    if (v === 'container') out['Container'] = containerPartTokens;
    for (const s of HEADER_STATES) out[`Header / ${HEADER_STATE_LABELS[s]}`] = headerStateTokens(v, s);
    out['Body'] = bodyTokens(v);
    return out;
  }

  // Label typography only attaches to header states; Container and Body don't
  // own text. Keys match the corresponding entries in `variantStates`.
  function variantTypeGroups(v: Variant): Record<string, TypeGroupConfig[]> {
    return Object.fromEntries(HEADER_STATES.map((s) => [`Header / ${HEADER_STATE_LABELS[s]}`, [{
      legend: 'label',
      colorVariable: `--collapsiblesection-${v}-${s}-label`,
      familyVariable: `--collapsiblesection-${v}-${s}-label-font-family`,
      sizeVariable: `--collapsiblesection-${v}-${s}-label-font-size`,
      weightVariable: `--collapsiblesection-${v}-${s}-label-font-weight`,
      lineHeightVariable: `--collapsiblesection-${v}-${s}-label-line-height`,
    }]]));
  }

  const headerTypeGroupTokens: Token[] = VARIANTS.flatMap((v) => HEADER_STATES.flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--collapsiblesection-${v}-${s}-label-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--collapsiblesection-${v}-${s}-label-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--collapsiblesection-${v}-${s}-label-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--collapsiblesection-${v}-${s}-label-line-height` },
  ]));

  export const allTokens: Token[] = [
    ...VARIANTS.flatMap((v) => Object.values(variantStates(v)).flat()),
    ...VARIANTS.flatMap((v) => buildTypeGroupColorTokens(variantTypeGroups(v))),
    ...headerTypeGroupTokens,
  ];

  const linkableContexts = new Map<string, string>([
    ...VARIANTS.flatMap((v) => HEADER_STATES.flatMap((s) => {
      const base: Array<[string, string]> = [
        [`--collapsiblesection-${v}-${s}-padding`, `${v} ${s}`],
        [`--collapsiblesection-${v}-${s}-icon-size`, `${v} ${s}`],
        [`--collapsiblesection-${v}-${s}-label-font-family`, `${v} ${s}`],
        [`--collapsiblesection-${v}-${s}-label-font-size`, `${v} ${s}`],
        [`--collapsiblesection-${v}-${s}-label-font-weight`, `${v} ${s}`],
        [`--collapsiblesection-${v}-${s}-label-line-height`, `${v} ${s}`],
      ];
      if (v === 'divider') base.push([`--collapsiblesection-divider-${s}-border-width`, `divider ${s}`]);
      return base;
    })),
    ['--collapsiblesection-container-frame-border-width', 'container frame'],
    ['--collapsiblesection-container-frame-radius', 'container frame'],
    ...VARIANTS.flatMap((v) => [
      [`--collapsiblesection-${v}-expanded-padding`, `${v} expanded`] as [string, string],
    ]),
  ]);

  const variantOptions = VARIANTS.map((v) => ({ value: v, label: VARIANT_LABELS[v] }));
</script>

<script lang="ts">
  import CollapsibleSection from '../../system/components/CollapsibleSection.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { buildSiblings } from './scaffolding/siblings';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleVariantStates = $derived((v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Collapsible Section" description="Expandable section with chevron toggle. Variants: chromeless, divider, container." tokens={allTokens} {linked} variants={variantOptions}>
  {#each VARIANTS as v}
    <VariantGroup
      name={v}
      title={VARIANT_LABELS[v]}
      states={visibleVariantStates(v)}
      typeGroups={variantTypeGroups(v)}
      {component}
      siblings={buildSiblings(VARIANTS, v, variantStates, variantTypeGroups)}
      
    >
      {#snippet children({ activeState })}
        {@const isContainerPart = activeState === 'Container'}
        {@const isBody = activeState === 'Body'}
        {@const forceClass = activeState === 'Header / Hover' ? 'force-hover' : ''}
        {@const forceActive = activeState === 'Header / Current'}
        <CollapsibleSection
          variant={v}
          label="Click to expand"
          expanded={isBody}
          active={forceActive}
          class={forceClass}
        >
          <p style="margin: 0; color: var(--text-secondary);">
            {#if isContainerPart}
              (Container) — outer chrome only; switch to Body to see the content area.
            {:else}
              This content is revealed when the section is expanded. Any content can go here.
            {/if}
          </p>
        </CollapsibleSection>
                {/snippet}
        </VariantGroup>
  {/each}
</ComponentEditorBase>
