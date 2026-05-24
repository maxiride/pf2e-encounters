<script module lang="ts">
  import { buildTypeGroupTokens, buildTypeGroupShareableContexts } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'input';

  // Shape lives under a `field` pseudo-state so it reads as one decision shared by every state.
  // Default/focused/disabled hold the per-state chrome; label/hint/error hold message-row typography.
  // Error also carries the invalid-state border so it sits next to the error text it pairs with.
  const states: Record<string, Token[]> = {
    field: [
      { label: 'corner radius', groupKey: 'radius', variable: '--input-radius' },
      { label: 'border width', groupKey: 'border-width', variable: '--input-border-width' },
      { label: 'padding', variable: '--input-padding', groupKey: 'padding' },
      { label: 'padding-top', variable: '--input-padding-top', groupKey: 'padding-top', hidden: true },
      { label: 'padding-right', variable: '--input-padding-right', groupKey: 'padding-right', hidden: true },
      { label: 'padding-bottom', variable: '--input-padding-bottom', groupKey: 'padding-bottom', hidden: true },
      { label: 'padding-left', variable: '--input-padding-left', groupKey: 'padding-left', hidden: true },
      { label: 'message gap', groupKey: 'gap', variable: '--input-gap' },
    ],
    default: [
      { label: 'surface color', groupKey: 'surface', variable: '--input-default-surface' },
      { label: 'border color', groupKey: 'border', variable: '--input-default-border' },
      { label: 'placeholder color', groupKey: 'placeholder', variable: '--input-default-placeholder' },
      { label: 'icon color', groupKey: 'icon', variable: '--input-default-icon' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--input-default-icon-size' },
    ],
    focused: [
      { label: 'surface color', groupKey: 'surface', variable: '--input-focused-surface' },
      { label: 'outline color', groupKey: 'outline', variable: '--input-focused-outline' },
      { label: 'outline width', canBeLinked: true, groupKey: 'outline-width', variable: '--input-focused-outline-width' },
      { label: 'icon color', groupKey: 'icon', variable: '--input-focused-icon' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--input-focused-icon-size' },
    ],
    disabled: [
      { label: 'surface color', groupKey: 'surface', variable: '--input-disabled-surface' },
      { label: 'border color', groupKey: 'border', variable: '--input-disabled-border' },
      { label: 'icon color', groupKey: 'icon', variable: '--input-disabled-icon' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: '--input-disabled-icon-size' },
    ],
    label: [],
    hint: [],
    error: [
      { label: 'outline color', groupKey: 'outline', variable: '--input-error-outline' },
      { label: 'outline width', canBeLinked: true, groupKey: 'outline-width', variable: '--input-error-outline-width' },
    ],
  };

  // Per-state input text + standalone label/hint/error message typography.
  // Slot-prefixed groupKeys keep label/hint/error from collapsing into each other.
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    default: [{
      legend: 'input text',
      colorVariable: '--input-default-text',
      familyVariable: '--input-default-text-font-family',
      sizeVariable: '--input-default-text-font-size',
      weightVariable: '--input-default-text-font-weight',
      lineHeightVariable: '--input-default-text-line-height',
    }],
    focused: [{
      legend: 'input text',
      colorVariable: '--input-focused-text',
      familyVariable: '--input-focused-text-font-family',
      sizeVariable: '--input-focused-text-font-size',
      weightVariable: '--input-focused-text-font-weight',
      lineHeightVariable: '--input-focused-text-line-height',
    }],
    disabled: [{
      legend: 'input text',
      colorVariable: '--input-disabled-text',
      familyVariable: '--input-disabled-text-font-family',
      sizeVariable: '--input-disabled-text-font-size',
      weightVariable: '--input-disabled-text-font-weight',
      lineHeightVariable: '--input-disabled-text-line-height',
    }],
    label: [{
      legend: 'label',
      colorVariable: '--input-label',
      familyVariable: '--input-label-font-family',
      sizeVariable: '--input-label-font-size',
      weightVariable: '--input-label-font-weight',
      lineHeightVariable: '--input-label-line-height',
    }],
    hint: [{
      legend: 'hint',
      colorVariable: '--input-hint',
      familyVariable: '--input-hint-font-family',
      sizeVariable: '--input-hint-font-size',
      weightVariable: '--input-hint-font-weight',
      lineHeightVariable: '--input-hint-line-height',
    }],
    error: [{
      legend: 'error',
      colorVariable: '--input-error',
      familyVariable: '--input-error-font-family',
      sizeVariable: '--input-error-font-size',
      weightVariable: '--input-error-font-weight',
      lineHeightVariable: '--input-error-line-height',
    }],
  };

  // Slot-prefixed groupKeys: input text links across default/focused/disabled;
  // label/hint/error each isolate their own typography.
  const inputTextStates = ['default', 'focused', 'disabled'] as const;
  const inputTextTypographyTokens: Token[] = inputTextStates.flatMap((s) => [
    { label: 'font family', canBeLinked: true, groupKey: 'input-text-font-family', variable: `--input-${s}-text-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: 'input-text-font-size', variable: `--input-${s}-text-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: 'input-text-font-weight', variable: `--input-${s}-text-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: 'input-text-line-height', variable: `--input-${s}-text-line-height` },
  ]);

  const messageTypographyTokens: Token[] = (['label', 'hint', 'error'] as const).flatMap((slot) => [
    { label: 'font family', canBeLinked: true, groupKey: `${slot}-font-family`, variable: `--input-${slot}-font-family` },
    { label: 'font size', canBeLinked: true, groupKey: `${slot}-font-size`, variable: `--input-${slot}-font-size` },
    { label: 'font weight', canBeLinked: true, groupKey: `${slot}-font-weight`, variable: `--input-${slot}-font-weight` },
    { label: 'line height', canBeLinked: true, groupKey: `${slot}-line-height`, variable: `--input-${slot}-line-height` },
  ]);

  // colorVariable tokens from buildTypeGroupTokens are derivable but redundant — hand-built typography
  // gives us full control. Use buildTypeGroupShareableContexts for the linkableContexts wiring only.
  // Take the color tokens via buildTypeGroupTokens-equivalent: just enumerate them inline.
  const typographyColorTokens: Token[] = [
    { label: 'color', groupKey: 'text', variable: '--input-default-text' },
    { label: 'color', groupKey: 'text', variable: '--input-focused-text' },
    { label: 'color', groupKey: 'text', variable: '--input-disabled-text' },
    { label: 'color', groupKey: 'label', variable: '--input-label' },
    { label: 'color', groupKey: 'hint', variable: '--input-hint' },
    { label: 'color', groupKey: 'error', variable: '--input-error' },
  ];

  export const allTokens: Token[] = [
    ...Object.values(states).flat(),
    ...typographyColorTokens,
    ...inputTextTypographyTokens,
    ...messageTypographyTokens,
  ];

  const linkableContexts = new Map<string, string>([
    ...buildTypeGroupShareableContexts(typeGroups),
    ['--input-default-icon-size', 'default'],
    ['--input-focused-icon-size', 'focused'],
    ['--input-disabled-icon-size', 'disabled'],
    ['--input-focused-outline-width', 'focused'],
    ['--input-error-outline-width', 'error'],
  ]);

  // Silence unused-import lint without changing behavior; buildTypeGroupTokens stays available
  // for editors that want auto-derived color rows, but we keep ours hand-built for slot-prefixed groupKeys.
  void buildTypeGroupTokens;
</script>

<script lang="ts">
  import Input from '../../system/components/Input.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  type InputType = 'text' | 'number' | 'search' | 'password';
  const typeOptions: { value: InputType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'search', label: 'Search' },
    { value: 'password', label: 'Password' },
  ];

  let previewType: InputType = $state('text');
  let showLabel = $state(true);
  let showHint = $state(true);
  let showError = $state(false);

  let demoValue = $state('');

  let placeholderFor = $derived((t: InputType) => {
    switch (t) {
      case 'number': return '0';
      case 'search': return 'Search…';
      case 'password': return 'Enter password';
      default: return 'Type something';
    }
  });

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleStates = $derived(Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase
  {component}
  title="Input"
  description="Single-line text/number/search/password input with optional label, hint, and validation error."
  tokens={allTokens}
  {linked}
>
  <VariantGroup
    name="input"
    title="Input"
    states={visibleStates}
    {typeGroups}
    {component}
  >
    {#snippet canvasToolbarExtras()}
      <hr class="canvas-toolbar-divider" />
      <label class="toolbar-field">
        <span>Type</span>
        <select class="canvas-toolbar-select" bind:value={previewType}>
          {#each typeOptions as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </label>
      <label class="toolbar-check">
        <input type="checkbox" bind:checked={showLabel} />
        <span>Label</span>
      </label>
      <label class="toolbar-check">
        <input type="checkbox" bind:checked={showHint} />
        <span>Hint</span>
      </label>
      <label class="toolbar-check">
        <input type="checkbox" bind:checked={showError} />
        <span>Error</span>
      </label>
    {/snippet}
    {#snippet children({ activeState })}
      {@const forceFocus = activeState === 'focused'}
      {@const previewDisabled = activeState === 'disabled'}
      {@const previewError = showError || activeState === 'error' ? 'Please enter a valid value.' : ''}
      {@const previewHint = showHint || activeState === 'hint' ? 'Helper text describing the field.' : ''}
      {@const previewLabel = showLabel || activeState === 'label' ? 'Field label' : ''}
      <div class="input-demo-row">
        <Input
          type={previewType}
          bind:value={demoValue}
          placeholder={placeholderFor(previewType)}
          disabled={previewDisabled}
          {forceFocus}
          label={previewLabel}
          hint={previewHint}
          error={previewError}
        />
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .input-demo-row {
    display: flex;
    width: 100%;
    max-width: 26rem;
  }

  .toolbar-check {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: rgba(255, 255, 255, 0.78);
    cursor: pointer;
  }

  .toolbar-field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    color: rgba(255, 255, 255, 0.6);
  }
</style>
