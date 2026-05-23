<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'tabbar';

  // The tab object — four states (default/hover/active/disabled) of the same tab button.
  const tabStateNames = ['default', 'hover', 'active', 'disabled'] as const;
  type TabState = typeof tabStateNames[number];
  function tabStateTokens(s: TabState): Token[] {
    return [
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: `--tabbar-${s}-icon-size` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--tabbar-${s}-padding` },
      { label: 'surface color', groupKey: 'surface', variable: `--tabbar-${s}-surface` },
      { label: 'top radius', canBeLinked: true, groupKey: 'tab-top-radius', variable: `--tabbar-${s}-tab-top-radius` },
      { label: 'bottom radius', canBeLinked: true, groupKey: 'tab-bottom-radius', variable: `--tabbar-${s}-tab-bottom-radius` },
      { label: 'border color', canBeLinked: true, groupKey: 'tab-border-color', variable: `--tabbar-${s}-tab-border-color` },
      { label: 'border width', canBeLinked: true, groupKey: 'tab-border-width', variable: `--tabbar-${s}-tab-border-width` },
    ];
  }
  function tabStateTypeGroups(s: TabState): TypeGroupConfig[] {
    return [{
      legend: 'tab text',
      colorVariable: `--tabbar-${s}-text`,
      familyVariable: `--tabbar-${s}-text-font-family`,
      sizeVariable: `--tabbar-${s}-text-font-size`,
      weightVariable: `--tabbar-${s}-text-font-weight`,
      lineHeightVariable: `--tabbar-${s}-text-line-height`,
    }];
  }

  // One VariantGroup with the bar exposed as a state alongside the three tab
  // states (mirrors SegmentedControl's "control bar" + per-option states layout).
  const states: Record<string, Token[]> = {
    bar: [
      { label: 'divider color', groupKey: 'bar-divider', variable: '--tabbar-bar-divider' },
      { label: 'divider thickness', groupKey: 'bar-divider-thickness', variable: '--tabbar-bar-divider-thickness' },
      { label: 'indicator thickness', groupKey: 'bar-indicator-thickness', variable: '--tabbar-bar-indicator-thickness' },
      { label: 'space above', groupKey: 'bar-top-margin', variable: '--tabbar-bar-top-margin' },
      // Consumed via `padding-bottom: var(--tabbar-bar-bottom-padding)` — a
      // one-axis read. Splitting would produce top/left/right values that have
      // nowhere to render.
      { label: 'space below tabs', groupKey: 'bar-bottom-padding', variable: '--tabbar-bar-bottom-padding', splittable: false },
      { label: 'space under divider', groupKey: 'bar-bottom-margin', variable: '--tabbar-bar-bottom-margin' },
      { label: 'tab gap', groupKey: 'tab-gap', variable: '--tabbar-tab-gap' },
    ],
    ...Object.fromEntries(tabStateNames.map((s) => [`${s} tab`, tabStateTokens(s)])),
  };
  states['active tab'] = [
    ...states['active tab'],
    { label: 'indicator color', groupKey: 'indicator-color', variable: '--tabbar-active-border' },
  ];
  const typeGroups: Record<string, TypeGroupConfig[]> = Object.fromEntries(
    tabStateNames.map((s) => [`${s} tab`, tabStateTypeGroups(s)]),
  );
  const tabTypeGroupTokens: Token[] = tabStateNames.flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--tabbar-${s}-text-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--tabbar-${s}-text-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--tabbar-${s}-text-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--tabbar-${s}-text-line-height` },
  ]);
  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...buildTypeGroupColorTokens(typeGroups),
    ...tabTypeGroupTokens,
  ];

  // Linking: shape props across tab states (same tab object).
  const linkableContexts = new Map<string, string>([
    [`--tabbar-active-border`, `active tab`] as const,
    ...tabStateNames.flatMap((s) => [
    [`--tabbar-${s}-tab-border-color`, `${s} tab`] as const,
    [`--tabbar-${s}-tab-border-width`, `${s} tab`] as const,
    [`--tabbar-${s}-tab-top-radius`, `${s} tab`] as const,
    [`--tabbar-${s}-tab-bottom-radius`, `${s} tab`] as const,
    [`--tabbar-${s}-padding`, `${s} tab`] as const,
    [`--tabbar-${s}-icon-size`, `${s} tab`] as const,
    [`--tabbar-${s}-text-font-family`, `${s} tab`] as const,
    [`--tabbar-${s}-text-font-size`, `${s} tab`] as const,
    [`--tabbar-${s}-text-font-weight`, `${s} tab`] as const,
    [`--tabbar-${s}-text-line-height`, `${s} tab`] as const,
  ]),
  ]);
</script>

<script lang="ts">
  import TabBar from '../../system/components/TabBar.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let selectedDemoTab = $state('overview');
  const demoTabs = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-home' },
    { id: 'details', label: 'Details', icon: 'fas fa-info-circle' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog' },
    { id: 'disabled', label: 'Disabled', icon: 'fas fa-ban', disabled: true },
  ];

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Tab Bar" description="Tab navigation with icon support and disabled state." tokens={allTokens} {linked}>
  <VariantGroup
    name="tabbar"
    title="Tab Bar"
    states={visibleStates}
    {typeGroups}
    {component}
    
  >
    {#snippet children({ activeState })}
        {@const forceClass = activeState === 'hover tab' ? 'force-hover' : ''}
      <TabBar tabs={demoTabs} selectedTab={selectedDemoTab} class={forceClass} on:tabChange={(e) => (selectedDemoTab = e.detail)} />
      <div class="tab-content-demo">
        <p style="margin: 0;">placeholder tab content</p>
      </div>
          {/snippet}
    </VariantGroup>
</ComponentEditorBase>

<style>
  .tab-content-demo {
    width: 100%;
    padding: var(--space-16);
    color: var(--ui-text-secondary);
    background: var(--ui-surface-low);
  }
</style>
