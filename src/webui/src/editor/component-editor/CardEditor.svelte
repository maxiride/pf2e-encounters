<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'card';

  // Hover overrides only border + shadow; rest inherits default. `element` groups tokens by frame/header/body.
  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface color', groupKey: 'surface', variable: '--card-default-surface', element: 'frame' },
      { label: 'border color', groupKey: 'border', variable: '--card-default-border', element: 'frame' },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: '--card-default-border-width', element: 'frame' },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: '--card-default-radius', element: 'frame' },
      { label: 'card shadow', canBeLinked: true, groupKey: 'shadow', variable: '--card-default-shadow', element: 'frame' },
      { label: 'background blur', canBeLinked: true, groupKey: 'blur', variable: '--card-default-blur', element: 'frame' },
      { label: 'header color', groupKey: 'surface', variable: '--card-default-header-surface', element: 'header' },
      { label: 'header padding', canBeLinked: true, groupKey: 'header-padding', variable: '--card-default-header-padding', element: 'header' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--card-default-icon-size', element: 'header' },
      { label: 'body padding', canBeLinked: true, groupKey: 'body-padding', variable: '--card-default-body-padding', element: 'body' },
    ],
    hover: [
      { label: 'border color', groupKey: 'border', variable: '--card-hover-border' },
      { label: 'card shadow', canBeLinked: true, groupKey: 'shadow', variable: '--card-hover-shadow' },
    ],
  };

  // Typography shared across states (no hover overrides).
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    default: [
      {
        legend: 'title',
        element: 'header',
        colorVariable: '--card-default-title',
        familyVariable: '--card-default-title-font-family',
        sizeVariable: '--card-default-title-font-size',
        weightVariable: '--card-default-title-font-weight',
        lineHeightVariable: '--card-default-title-line-height',
      },
      {
        legend: 'body',
        element: 'body',
        colorVariable: '--card-default-body',
        familyVariable: '--card-default-body-font-family',
        sizeVariable: '--card-default-body-font-size',
        weightVariable: '--card-default-body-font-weight',
        lineHeightVariable: '--card-default-body-line-height',
      },
    ],
  };

  const typeGroupTokens: Token[] = [
    { label: 'font family', canBeLinked: true, groupKey: 'title-font-family', variable: '--card-default-title-font-family' },
    { label: 'font size', canBeLinked: true, groupKey: 'title-font-size', variable: '--card-default-title-font-size' },
    { label: 'font weight', canBeLinked: true, groupKey: 'title-font-weight', variable: '--card-default-title-font-weight' },
    { label: 'line height', canBeLinked: true, groupKey: 'title-line-height', variable: '--card-default-title-line-height' },
    { label: 'font family', canBeLinked: true, groupKey: 'body-font-family', variable: '--card-default-body-font-family' },
    { label: 'font size', canBeLinked: true, groupKey: 'body-font-size', variable: '--card-default-body-font-size' },
    { label: 'font weight', canBeLinked: true, groupKey: 'body-font-weight', variable: '--card-default-body-font-weight' },
    { label: 'line height', canBeLinked: true, groupKey: 'body-line-height', variable: '--card-default-body-line-height' },
  ];
  // Cross-state linked block; linkable props sourced from default state.
  const linkableContexts = new Map<string, string>([
    ['--card-default-border-width', 'card'],
    ['--card-default-radius', 'card'],
    ['--card-default-header-padding', 'card'],
    ['--card-default-body-padding', 'card'],
    ['--card-default-shadow', 'card'],
    ['--card-default-blur', 'card'],
    ['--card-default-icon-size', 'card'],
    ['--card-default-title-font-family', 'title'],
    ['--card-default-title-font-size', 'title'],
    ['--card-default-title-font-weight', 'title'],
    ['--card-default-title-line-height', 'title'],
    ['--card-default-body-font-family', 'body'],
    ['--card-default-body-font-size', 'body'],
    ['--card-default-body-font-weight', 'body'],
    ['--card-default-body-line-height', 'body'],
  ]);
  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups),
    ...typeGroupTokens,
  ];
</script>

<script lang="ts">
  import Card from '../../system/components/Card.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);

  let hoverEnabled = $state(true);
</script>

<ComponentEditorBase {component} title="Card" description="Generic card with icon, title, and slotted body." tokens={allTokens} {linked}>
  <VariantGroup
    name="card"
    title="Card"
    states={visibleStates}
    {typeGroups}
    {component}
  >
    {#snippet stateActions(stateName)}
      {#if stateName === 'hover'}
        <label class="hover-enable">
          <input type="checkbox" bind:checked={hoverEnabled} />
          <span>Use hover</span>
        </label>
      {/if}
    {/snippet}
    {#snippet children({ activeState })}
      {@const previewClass = activeState === 'hover' ? 'force-hover' : (hoverEnabled ? '' : 'no-hover')}
      <div class="card-demo">
        <Card title="Card title" class={previewClass}>
          <p style="margin: 0;">Slotted body content. Hover the card (or switch the editor to the Hover state) to preview hover styling.</p>
        </Card>
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .card-demo {
    max-width: 28rem;
  }
  .hover-enable {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }
</style>
