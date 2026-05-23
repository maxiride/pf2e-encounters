<script module lang="ts">
  import { buildTypeGroupTokens, buildTypeGroupShareableContexts } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'segmentedcontrol';

  // Non-text tokens per state. Text/font properties live in `typeGroups` below
  // and are rendered via TypeEditor instead of TokenLayout.
  const states: Record<string, Token[]> = {
    'control bar': [
      { label: 'surface color', groupKey: 'surface', variable: '--segmentedcontrol-bar-surface' },
      { label: 'border color', groupKey: 'border', variable: '--segmentedcontrol-bar-border' },
      { label: 'border width', groupKey: 'width', variable: '--segmentedcontrol-bar-border-width' },
      { label: 'divider color', groupKey: 'color', variable: '--segmentedcontrol-divider-color' },
      { label: 'divider width', groupKey: 'thickness', variable: '--segmentedcontrol-divider-thickness' },
      { label: 'divider height', groupKey: 'height', variable: '--segmentedcontrol-divider-height' },
      { label: 'corner radius', groupKey: 'radius', variable: '--segmentedcontrol-bar-radius' },
      { label: 'option gap', groupKey: 'gap', variable: '--segmentedcontrol-bar-gap' },
      { label: 'padding', variable: '--segmentedcontrol-bar-padding', groupKey: 'bar-padding' },
      { label: 'padding-top', variable: '--segmentedcontrol-bar-padding-top', groupKey: 'bar-padding-top', hidden: true },
      { label: 'padding-right', variable: '--segmentedcontrol-bar-padding-right', groupKey: 'bar-padding-right', hidden: true },
      { label: 'padding-bottom', variable: '--segmentedcontrol-bar-padding-bottom', groupKey: 'bar-padding-bottom', hidden: true },
      { label: 'padding-left', variable: '--segmentedcontrol-bar-padding-left', groupKey: 'bar-padding-left', hidden: true },
    ],
    'default option': [
      { label: 'icon color', groupKey: 'icon', variable: '--segmentedcontrol-option-icon' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--segmentedcontrol-option-icon-size' },
    ],
    'selected option': [
      { label: 'surface color', groupKey: 'surface', variable: '--segmentedcontrol-selected-surface' },
      { label: 'icon color', groupKey: 'icon', variable: '--segmentedcontrol-selected-icon' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--segmentedcontrol-selected-icon-size' },
      { label: 'border color', groupKey: 'border', variable: '--segmentedcontrol-selected-border' },
      { label: 'border width', groupKey: 'width', variable: '--segmentedcontrol-selected-border-width' },
      { label: 'corner radius', groupKey: 'radius', variable: '--segmentedcontrol-selected-radius' },
    ],
    'hover option': [
      { label: 'surface color', groupKey: 'surface', variable: '--segmentedcontrol-option-hover-surface' },
      { label: 'icon color', groupKey: 'icon', variable: '--segmentedcontrol-option-hover-icon' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--segmentedcontrol-option-hover-icon-size' },
    ],
    'disabled option': [
      { label: 'surface color', groupKey: 'surface', variable: '--segmentedcontrol-disabled-surface' },
      { label: 'icon color', groupKey: 'icon', variable: '--segmentedcontrol-disabled-icon' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--segmentedcontrol-disabled-icon-size' },
    ],
  };

  // Per-state typography groups for the option text element. All five
  // properties are exposed and individually share-able via groupKey across
  // the four states.
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    'default option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-option-text',
      familyVariable: '--segmentedcontrol-option-text-font-family',
      sizeVariable: '--segmentedcontrol-option-text-font-size',
      weightVariable: '--segmentedcontrol-option-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-option-text-line-height',
    }],
    'selected option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-selected-text',
      familyVariable: '--segmentedcontrol-selected-text-font-family',
      sizeVariable: '--segmentedcontrol-selected-text-font-size',
      weightVariable: '--segmentedcontrol-selected-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-selected-text-line-height',
    }],
    'hover option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-option-hover-text',
      familyVariable: '--segmentedcontrol-option-hover-text-font-family',
      sizeVariable: '--segmentedcontrol-option-hover-text-font-size',
      weightVariable: '--segmentedcontrol-option-hover-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-option-hover-text-line-height',
    }],
    'disabled option': [{
      legend: 'option text',
      colorVariable: '--segmentedcontrol-disabled-text',
      familyVariable: '--segmentedcontrol-disabled-text-font-family',
      sizeVariable: '--segmentedcontrol-disabled-text-font-size',
      weightVariable: '--segmentedcontrol-disabled-text-font-weight',
      lineHeightVariable: '--segmentedcontrol-disabled-text-line-height',
    }],
  };

  // Schema entries for the type-group variables — registered for groupKey
  // resolution but not rendered through TokenLayout. Derived from `typeGroups`
  // so the four font props × four states stay in lockstep with the per-state
  // TypeGroupConfig declarations above.
  const typeGroupTokens: Token[] = buildTypeGroupTokens(typeGroups);
  export const allTokens: Token[] = [...Object.values(states).flat(), ...typeGroupTokens];

  const linkableContexts = new Map<string, string>([
    ...buildTypeGroupShareableContexts(typeGroups),
    ['--segmentedcontrol-option-icon-size', 'default option'],
    ['--segmentedcontrol-selected-icon-size', 'selected option'],
    ['--segmentedcontrol-option-hover-icon-size', 'hover option'],
    ['--segmentedcontrol-disabled-icon-size', 'disabled option'],
  ]);
</script>

<script lang="ts">
  import SegmentedControl from '../../system/components/SegmentedControl.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  type Segment = { value: string; label: string; icon?: string; disabled?: boolean };
  const segments: Segment[] = [
    { value: 'option-1', label: 'Option 1', icon: 'fas fa-star' },
    { value: 'option-2', label: 'Option 2', icon: 'fas fa-check' },
    { value: 'option-3', label: 'Option 3', icon: 'fas fa-heart' },
  ];
  let showIcons = $state(true);
  let previewSegments = $derived(showIcons ? segments : segments.map((s) => ({ ...s, icon: undefined })));

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Segmented Control" description="A connected set of buttons for toggling between mutually exclusive options." tokens={allTokens} {linked}>
  {#snippet config()}
  
      <label>
        <input type="checkbox" bind:checked={showIcons} />
        <span>Show icons</span>
      </label>
    
  {/snippet}
  <VariantGroup
    name="segmentedcontrol"
    title="Segmented Control"
    states={visibleStates}
    {typeGroups}
    {component}
    
  >
    {#snippet children({ activeState })}
        {@const previewValue = activeState === 'selected option' ? 'option-2' : ''}
      {@const previewForceHover = activeState === 'hover option' ? 'option-1' : null}
      {@const previewDisabled = activeState === 'disabled option'}
      <div>
        <SegmentedControl
          segments={previewSegments}
          value={previewValue}
          forceHoverValue={previewForceHover}
          disabled={previewDisabled}
        />
      </div>
          {/snippet}
    </VariantGroup>
</ComponentEditorBase>

