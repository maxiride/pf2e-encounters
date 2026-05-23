<script module lang="ts">
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'table';

  // Shared border/width groupKeys link all table lines; other groupKeys are slot-unique to keep surfaces independent.
  const states: Record<string, Token[]> = {
    wrapper: [
      { label: 'surface color', groupKey: 'wrapper-surface', variable: '--table-default-surface' },
      { label: 'border color', canBeLinked: true, groupKey: 'border', variable: '--table-default-border' },
      { label: 'border width', canBeLinked: true, groupKey: 'width', variable: '--table-default-border-width' },
      { label: 'corner radius', groupKey: 'radius', variable: '--table-default-radius' },
      { label: 'table shadow', groupKey: 'shadow', variable: '--table-default-shadow' },
    ],
    header: [
      { label: 'surface color', groupKey: 'header-surface', variable: '--table-default-header-surface' },
      { label: 'border color', canBeLinked: true, groupKey: 'border', variable: '--table-default-header-border' },
      { label: 'border width', canBeLinked: true, groupKey: 'width', variable: '--table-default-header-border-width' },
      { label: 'padding', groupKey: 'header-padding', variable: '--table-default-header-padding' },
    ],
    cell: [
      { label: 'padding', groupKey: 'cell-padding', variable: '--table-default-cell-padding' },
    ],
    row: [
      { label: 'surface color', groupKey: 'row-surface', variable: '--table-default-row-surface' },
      { label: 'stripe surface', groupKey: 'row-stripe-surface', variable: '--table-default-row-stripe-surface' },
      { label: 'divider color', canBeLinked: true, groupKey: 'border', variable: '--table-default-row-divider' },
      { label: 'divider width', canBeLinked: true, groupKey: 'width', variable: '--table-default-row-divider-width' },
    ],
    column: [
      { label: 'divider color', canBeLinked: true, groupKey: 'border', variable: '--table-default-column-divider' },
      { label: 'divider width', canBeLinked: true, groupKey: 'width', variable: '--table-default-column-divider-width' },
    ],
  };

  // State name as context label so LinkageChart rows read wrapper/header/row/column.
  const linkableContexts = new Map<string, string>(
    Object.entries(states).flatMap(([state, tokens]) =>
      tokens
        .filter((t) => t.canBeLinked)
        .map((t) => [t.variable, state] as [string, string]),
    ),
  );

  const typeGroups: Record<string, TypeGroupConfig[]> = {
    header: [{
      legend: 'header text',
      colorVariable: '--table-default-header-text',
      familyVariable: '--table-default-header-font-family',
      sizeVariable: '--table-default-header-font-size',
      weightVariable: '--table-default-header-font-weight',
      lineHeightVariable: '--table-default-header-line-height',
    }],
    cell: [{
      legend: 'cell text',
      colorVariable: '--table-default-cell-text',
      familyVariable: '--table-default-cell-font-family',
      sizeVariable: '--table-default-cell-font-size',
      weightVariable: '--table-default-cell-font-weight',
      lineHeightVariable: '--table-default-cell-line-height',
    }],
  };
  // Hand-rolled (not buildTypeGroupColorTokens) because its suffix-derived groupKey would phantom-link header-text and cell-text.
  const typeGroupColorTokens: Token[] = [
    { label: 'color', groupKey: 'header-text', variable: '--table-default-header-text' },
    { label: 'color', groupKey: 'cell-text', variable: '--table-default-cell-text' },
  ];
  const typeGroupTokens: Token[] = [
    { label: 'font family', groupKey: 'header-font-family', variable: '--table-default-header-font-family' },
    { label: 'font size', groupKey: 'header-font-size', variable: '--table-default-header-font-size' },
    { label: 'font weight', groupKey: 'header-font-weight', variable: '--table-default-header-font-weight' },
    { label: 'line height', groupKey: 'header-line-height', variable: '--table-default-header-line-height' },
    { label: 'font family', groupKey: 'cell-font-family', variable: '--table-default-cell-font-family' },
    { label: 'font size', groupKey: 'cell-font-size', variable: '--table-default-cell-font-size' },
    { label: 'font weight', groupKey: 'cell-font-weight', variable: '--table-default-cell-font-weight' },
    { label: 'line height', groupKey: 'cell-line-height', variable: '--table-default-cell-line-height' },
  ];

  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...typeGroupColorTokens,
    ...typeGroupTokens,
  ];
</script>

<script lang="ts">
  import Table from '../../system/components/Table.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([state, tokens]) => [state, withLinkedDisabled(tokens, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Table" description="Styled wrapper around <code>&lt;table&gt;</code> with horizontal scroll on narrow viewports." tokens={allTokens} {linked}>
  <VariantGroup name="table" title="Table" states={visibleStates} {typeGroups} {component}>
    <Table>
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Yield</th>
            <th>Tier</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Farmland</td><td>2 Food</td><td>I</td></tr>
          <tr><td>Quarry</td><td>1 Stone</td><td>II</td></tr>
          <tr><td>Mine</td><td>1 Ore</td><td>II</td></tr>
          <tr><td>Forest</td><td>2 Lumber</td><td>I</td></tr>
        </tbody>
      </table>
    </Table>
  </VariantGroup>
</ComponentEditorBase>
