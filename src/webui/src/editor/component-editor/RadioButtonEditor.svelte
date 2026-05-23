<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'radiobutton';

  const states: Record<string, Token[]> = {
    default: [
      { label: 'border color', groupKey: 'color', variable: '--radiobutton-default-dot-border-color' },
      { label: 'border thickness', canBeLinked: true, groupKey: 'border-width', variable: '--radiobutton-default-dot-border-width' },
      { label: 'dot fill', groupKey: 'fill', variable: '--radiobutton-default-dot-fill' },
      { label: 'dot size', groupKey: 'size', variable: '--radiobutton-default-dot-size' },
    ],
    hover: [
      { label: 'border color', groupKey: 'color', variable: '--radiobutton-hover-dot-border-color' },
      { label: 'border thickness', canBeLinked: true, groupKey: 'border-width', variable: '--radiobutton-hover-dot-border-width' },
      { label: 'dot fill', groupKey: 'fill', variable: '--radiobutton-hover-dot-fill' },
      { label: 'dot size', groupKey: 'size', variable: '--radiobutton-hover-dot-size' },
    ],
    active: [
      { label: 'border color', groupKey: 'color', variable: '--radiobutton-active-dot-border-color' },
      { label: 'border thickness', canBeLinked: true, groupKey: 'border-width', variable: '--radiobutton-active-dot-border-width' },
      { label: 'dot fill', groupKey: 'fill', variable: '--radiobutton-active-dot-fill' },
      { label: 'dot size', groupKey: 'size', variable: '--radiobutton-active-dot-size' },
    ],
  };

  const typeGroups: Record<string, TypeGroupConfig[]> = {
    default: [{
      legend: 'label',
      colorVariable: '--radiobutton-default-label',
      familyVariable: '--radiobutton-default-label-font-family',
      sizeVariable: '--radiobutton-default-label-font-size',
      weightVariable: '--radiobutton-default-label-font-weight',
      lineHeightVariable: '--radiobutton-default-label-line-height',
    }],
    hover: [{
      legend: 'label',
      colorVariable: '--radiobutton-hover-label',
      familyVariable: '--radiobutton-hover-label-font-family',
      sizeVariable: '--radiobutton-hover-label-font-size',
      weightVariable: '--radiobutton-hover-label-font-weight',
      lineHeightVariable: '--radiobutton-hover-label-line-height',
    }],
    active: [{
      legend: 'label',
      colorVariable: '--radiobutton-active-label',
      familyVariable: '--radiobutton-active-label-font-family',
      sizeVariable: '--radiobutton-active-label-font-size',
      weightVariable: '--radiobutton-active-label-font-weight',
      lineHeightVariable: '--radiobutton-active-label-line-height',
    }],
  };
  const typeGroupTokens: Token[] = (['default', 'hover', 'active'] as const).flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--radiobutton-${s}-label-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--radiobutton-${s}-label-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--radiobutton-${s}-label-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--radiobutton-${s}-label-line-height` },
  ]);
  const linkableContexts = new Map<string, string>([
    ['--radiobutton-default-dot-border-width', 'default'],
    ['--radiobutton-hover-dot-border-width', 'hover'],
    ['--radiobutton-active-dot-border-width', 'active'],
    ['--radiobutton-default-label-font-family', 'default'],
    ['--radiobutton-hover-label-font-family', 'hover'],
    ['--radiobutton-active-label-font-family', 'active'],
    ['--radiobutton-default-label-font-size', 'default'],
    ['--radiobutton-hover-label-font-size', 'hover'],
    ['--radiobutton-active-label-font-size', 'active'],
    ['--radiobutton-default-label-font-weight', 'default'],
    ['--radiobutton-hover-label-font-weight', 'hover'],
    ['--radiobutton-active-label-font-weight', 'active'],
    ['--radiobutton-default-label-line-height', 'default'],
    ['--radiobutton-hover-label-line-height', 'hover'],
    ['--radiobutton-active-label-line-height', 'active'],
  ]);
  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups),
    ...typeGroupTokens,
  ];
</script>

<script lang="ts">
  import RadioButton from '../../system/components/RadioButton.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let selectedRadio = $state('option-b');

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Radio Button" description="Styled radio buttons with icon and color support." tokens={allTokens} {linked}>
  <VariantGroup
    name="radio"
    title="Radio Button"
    states={visibleStates}
    {typeGroups}
    {component}
    
  >
    {#snippet children({ activeState })}
        {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
      {@const forceActive = activeState === 'active'}
      <div class="radio-demo-row">
        <RadioButton
          label="Defense"
          active={forceActive || selectedRadio === 'option-a'}
          class={forceClass}
          on:click={() => (selectedRadio = 'option-a')}
        />
        <RadioButton
          label="Economy"
          active={forceActive || selectedRadio === 'option-b'}
          class={forceClass}
          on:click={() => (selectedRadio = 'option-b')}
        />
        <RadioButton
          label="Loyalty"
          active={forceActive || selectedRadio === 'option-c'}
          class={forceClass}
          on:click={() => (selectedRadio = 'option-c')}
        />
      </div>
          {/snippet}
    </VariantGroup>
</ComponentEditorBase>

<style>
  .radio-demo-row {
    display: flex;
    gap: var(--space-16);
    flex-wrap: wrap;
  }
</style>
