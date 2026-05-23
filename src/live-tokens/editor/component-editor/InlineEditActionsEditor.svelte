<script module lang="ts">
  import { buildSiblings } from './scaffolding/siblings';
  import type { Token } from './scaffolding/types';

  export const component = 'inlineeditactions';

  // Two objects (save button, cancel button), each with default/hover states.
  // Within each button, link shape props (border-width, radius, padding, icon-size) across states.
  // Save and cancel are different objects, so they don't link to each other by default.
  const buttons = ['save', 'cancel'] as const;
  type Button = typeof buttons[number];
  const variantOptions = buttons.map((b) => ({ value: b, label: b === 'save' ? 'Save button' : 'Cancel button' }));
  function buttonStateTokens(btn: Button, state: 'default' | 'hover'): Token[] {
    return [
      { label: 'surface color', groupKey: 'surface', variable: `--inlineeditactions-${btn}-${state}-surface` },
      { label: 'text color', groupKey: 'text', variable: `--inlineeditactions-${btn}-${state}-text` },
      { label: 'border color', groupKey: 'border', variable: `--inlineeditactions-${btn}-${state}-border` },
      { label: 'border width', canBeLinked: true, groupKey: `${btn}-border-width`, variable: `--inlineeditactions-${btn}-${state}-border-width` },
      { label: 'corner radius', canBeLinked: true, groupKey: `${btn}-radius`, variable: `--inlineeditactions-${btn}-${state}-radius` },
      { label: 'padding', canBeLinked: true, groupKey: `${btn}-padding`, variable: `--inlineeditactions-${btn}-${state}-padding` },
      { label: 'icon size', canBeLinked: true, groupKey: `${btn}-icon-size`, variable: `--inlineeditactions-${btn}-${state}-icon-size` },
    ];
  }

  // Each button gets its own VariantGroup with its own default/hover states.
  function buttonStates(btn: Button): Record<string, Token[]> {
    return {
      default: buttonStateTokens(btn, 'default'),
      hover: buttonStateTokens(btn, 'hover'),
    };
  }
  export const allTokens: Token[] = buttons.flatMap((b) => Object.values(buttonStates(b)).flat());

  // Linked block surfaces shape props per button (linked across default/hover within same button).
  const linkableContexts = new Map<string, string>(buttons.flatMap((btn) => [
    [`--inlineeditactions-${btn}-default-border-width`, btn] as const,
    [`--inlineeditactions-${btn}-default-radius`, btn] as const,
    [`--inlineeditactions-${btn}-default-padding`, btn] as const,
    [`--inlineeditactions-${btn}-default-icon-size`, btn] as const,
  ]));
</script>

<script lang="ts">
  import InlineEditActions from '../../system/components/InlineEditActions.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStatesByButton = $derived((btn: Button) => Object.fromEntries(
    Object.entries(buttonStates(btn)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Inline Edit Actions" description="Confirm/cancel button pair for inline editing." tokens={allTokens} {linked} variants={variantOptions}>
  {#each buttons as btn}
    <VariantGroup
      name={btn}
      title={btn === 'save' ? 'Save button' : 'Cancel button'}
      states={visibleStatesByButton(btn)}
      {component}
      siblings={buildSiblings(buttons, btn, buttonStates)}
    >
      {#snippet children({ activeState })}
            {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
        <div class="inline-edit-demo-row">
          <span style="color: var(--text-secondary);">Editing value...</span>
          <InlineEditActions
            onSave={() => {}}
            onCancel={() => {}}
            class={forceClass}
          />
        </div>
                {/snippet}
        </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .inline-edit-demo-row {
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }
</style>
