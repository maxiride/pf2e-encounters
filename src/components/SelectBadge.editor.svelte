<script module lang="ts">
  import type { Token } from '@motion-proto/live-tokens/component-editor';

  export const component = 'selectbadge';

  const stateNames = ['default', 'hover', 'selected'] as const;
  type State = typeof stateNames[number];

  // Frame geometry and dot/label typography typically stay equal across the
  // three states; the linked block lets one edit propagate. Colors and dot fill
  // are intentionally per-state — that is where each state's identity lives.
  function stateTokens(s: State): Token[] {
    return [
      { label: 'frame surface', groupKey: 'frame-surface', variable: `--selectbadge-${s}-frame-surface`, element: 'frame' },
      { label: 'frame border color', groupKey: 'frame-border', variable: `--selectbadge-${s}-frame-border`, element: 'frame' },
      { label: 'frame border width', canBeLinked: true, groupKey: 'frame-border-width', variable: `--selectbadge-${s}-frame-border-width`, element: 'frame' },
      { label: 'frame radius', canBeLinked: true, groupKey: 'frame-radius', variable: `--selectbadge-${s}-frame-radius`, element: 'frame' },
      { label: 'frame padding', canBeLinked: true, groupKey: 'frame-padding', variable: `--selectbadge-${s}-frame-padding`, element: 'frame' },
      { label: 'dot border color', groupKey: 'dot-border', variable: `--selectbadge-${s}-dot-border`, element: 'dot' },
      { label: 'dot border width', canBeLinked: true, groupKey: 'dot-border-width', variable: `--selectbadge-${s}-dot-border-width`, element: 'dot' },
      { label: 'dot fill', groupKey: 'dot-fill', variable: `--selectbadge-${s}-dot-fill`, element: 'dot' },
      { label: 'dot size', canBeLinked: true, groupKey: 'dot-size', variable: `--selectbadge-${s}-dot-size`, element: 'dot' },
      { label: 'label color', groupKey: 'label-color', variable: `--selectbadge-${s}-label`, element: 'label' },
      { label: 'label font family', canBeLinked: true, groupKey: 'label-font-family', variable: `--selectbadge-${s}-label-font-family`, element: 'label' },
      { label: 'label font size', canBeLinked: true, groupKey: 'label-font-size', variable: `--selectbadge-${s}-label-font-size`, element: 'label' },
      { label: 'label font weight', canBeLinked: true, groupKey: 'label-font-weight', variable: `--selectbadge-${s}-label-font-weight`, element: 'label' },
      { label: 'label line height', canBeLinked: true, groupKey: 'label-line-height', variable: `--selectbadge-${s}-label-line-height`, element: 'label' },
    ];
  }

  const states: Record<string, Token[]> = Object.fromEntries(
    stateNames.map((s) => [s, stateTokens(s)]),
  );

  export const allTokens: Token[] = Object.values(states).flat();

  const linkableContexts = new Map<string, string>(
    stateNames.flatMap((s) =>
      stateTokens(s).filter((t) => t.canBeLinked).map((t) => [t.variable, s] as [string, string]),
    ),
  );
</script>

<script lang="ts">
  import SelectBadge from './SelectBadge.svelte';
  import {
    VariantGroup,
    ComponentEditorBase,
    computeLinkedBlock,
    withLinkedDisabled,
  } from '@motion-proto/live-tokens/component-editor';
  import { editorState } from '@motion-proto/live-tokens';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);

  function previewProps(state: string) {
    return {
      selected: state === 'selected',
      forceClass: state === 'hover' ? 'force-hover' : '',
    };
  }
</script>

<ComponentEditorBase
  {component}
  title="Select Badge"
  description="Toggleable pill with dot and label, used for multi-select filter chips."
  tokens={allTokens}
  {linked}
>
  <VariantGroup name="selectbadge" title="Select Badge" states={visibleStates} {component}>
    {#snippet children({ activeState })}
      {@const p = previewProps(activeState)}
      <div class="selectbadge-preview">
        <SelectBadge selected={p.selected} class={p.forceClass} label="Filter" />
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .selectbadge-preview {
    display: flex;
    gap: var(--space-8);
    flex-wrap: wrap;
  }
</style>
