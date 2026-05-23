<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'selectbadge';

  const stateNames = ['default', 'hover', 'selected'] as const;
  type State = typeof stateNames[number];

  function frameTokens(s: State): Token[] {
    return [
      { label: 'surface', element: 'frame', groupKey: 'frame-surface', variable: `--selectbadge-${s}-frame-surface` },
      { label: 'border color', element: 'frame', groupKey: 'frame-border-color', variable: `--selectbadge-${s}-frame-border-color` },
      { label: 'border width', element: 'frame', canBeLinked: true, groupKey: 'frame-border-width', variable: `--selectbadge-${s}-frame-border-width` },
      { label: 'corner radius', element: 'frame', canBeLinked: true, groupKey: 'frame-radius', variable: `--selectbadge-${s}-frame-radius` },
      { label: 'padding', element: 'frame', canBeLinked: true, groupKey: 'frame-padding', variable: `--selectbadge-${s}-frame-padding` },
    ];
  }
  function dotTokens(s: State): Token[] {
    return [
      { label: 'border color', element: 'dot', groupKey: 'dot-border-color', variable: `--selectbadge-${s}-dot-border-color` },
      { label: 'border width', element: 'dot', canBeLinked: true, groupKey: 'dot-border-width', variable: `--selectbadge-${s}-dot-border-width` },
      { label: 'fill', element: 'dot', groupKey: 'dot-fill', variable: `--selectbadge-${s}-dot-fill` },
      { label: 'size', element: 'dot', canBeLinked: true, groupKey: 'dot-size', variable: `--selectbadge-${s}-dot-size` },
    ];
  }
  const states: Record<State, Token[]> = {
    default: [...frameTokens('default'), ...dotTokens('default')],
    hover: [...frameTokens('hover'), ...dotTokens('hover')],
    selected: [...frameTokens('selected'), ...dotTokens('selected')],
  };

  const typeGroups: Record<State, TypeGroupConfig[]> = {
    default: [{
      legend: 'label',
      element: 'label',
      colorVariable: '--selectbadge-default-label',
      familyVariable: '--selectbadge-default-label-font-family',
      sizeVariable: '--selectbadge-default-label-font-size',
      weightVariable: '--selectbadge-default-label-font-weight',
      lineHeightVariable: '--selectbadge-default-label-line-height',
    }],
    hover: [{
      legend: 'label',
      element: 'label',
      colorVariable: '--selectbadge-hover-label',
      familyVariable: '--selectbadge-hover-label-font-family',
      sizeVariable: '--selectbadge-hover-label-font-size',
      weightVariable: '--selectbadge-hover-label-font-weight',
      lineHeightVariable: '--selectbadge-hover-label-line-height',
    }],
    selected: [{
      legend: 'label',
      element: 'label',
      colorVariable: '--selectbadge-selected-label',
      familyVariable: '--selectbadge-selected-label-font-family',
      sizeVariable: '--selectbadge-selected-label-font-size',
      weightVariable: '--selectbadge-selected-label-font-weight',
      lineHeightVariable: '--selectbadge-selected-label-line-height',
    }],
  };

  const typeGroupTokens: Token[] = stateNames.flatMap((s) => [
    { label: 'font family', element: 'label', canBeLinked: true, groupKey: 'font-family', variable: `--selectbadge-${s}-label-font-family` },
    { label: 'font size', element: 'label', canBeLinked: true, groupKey: 'font-size', variable: `--selectbadge-${s}-label-font-size` },
    { label: 'font weight', element: 'label', canBeLinked: true, groupKey: 'font-weight', variable: `--selectbadge-${s}-label-font-weight` },
    { label: 'line height', element: 'label', canBeLinked: true, groupKey: 'line-height', variable: `--selectbadge-${s}-label-line-height` },
  ]);

  const linkableProps = [
    'frame-border-width', 'frame-radius', 'frame-padding',
    'dot-border-width', 'dot-size',
    'label-font-family', 'label-font-size', 'label-font-weight', 'label-line-height',
  ] as const;
  const linkableContexts = new Map<string, string>(
    stateNames.flatMap((s) => linkableProps.map((p) => [`--selectbadge-${s}-${p}`, s] as [string, string]))
  );

  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(Object.values(typeGroups).flat()),
    ...typeGroupTokens,
  ];
</script>

<script lang="ts">
  import SelectBadge from '../../system/components/SelectBadge.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, setComponentAlias } from '../core/store/editorStore';
  import type { CssVarRef } from '../core/store/editorTypes';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);

  let aliases = $derived(($editorState.components[component]?.aliases ?? {}) as Record<string, CssVarRef>);
  function readLiteral(key: string): string | undefined {
    const ref = aliases[key];
    if (!ref || ref.kind !== 'literal') return undefined;
    return ref.value;
  }
  let uppercase = $derived(readLiteral('--selectbadge-label-text-transform') !== 'none');
  function setUppercase(on: boolean) {
    setComponentAlias(component, '--selectbadge-label-text-transform', { kind: 'literal', value: on ? 'uppercase' : 'none' });
  }
</script>

<ComponentEditorBase {component} title="Select Badge" description="Toggleable badge with a leading dot indicator; outlined when idle, filled when selected." tokens={allTokens} {linked}>
  <VariantGroup
    name="selectbadge"
    title="Select Badge"
    states={visibleStates}
    {typeGroups}
    {component}
  >
    {#snippet children({ activeState })}
      {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
      {@const forceSelected = activeState === 'selected'}
      <div class="selectbadge-demo-row">
        <SelectBadge label="Common" class={forceClass} selected={forceSelected} onclick={() => {}} />
        <SelectBadge label="Uncommon" class={forceClass} selected={forceSelected} onclick={() => {}} />
        <SelectBadge label="Rare" class={forceClass} selected={forceSelected} onclick={() => {}} />
      </div>
    {/snippet}
    {#snippet elementExtras(elementName)}
      {#if elementName === 'label'}
        <label class="caps-toggle">
          <input
            type="checkbox"
            checked={uppercase}
            onchange={(e) => setUppercase((e.currentTarget as HTMLInputElement).checked)}
          />
          <span>All caps</span>
        </label>
      {/if}
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .selectbadge-demo-row {
    display: flex;
    gap: var(--space-8);
    flex-wrap: wrap;
  }
  .caps-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
  }
  .caps-toggle input {
    accent-color: var(--surface-brand-high);
    cursor: pointer;
  }
</style>
