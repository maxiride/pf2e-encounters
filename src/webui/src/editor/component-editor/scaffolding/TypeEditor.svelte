<script lang="ts">
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIVariantSelector from '../../ui/UIVariantSelector.svelte';
  import UIFontFamilySelector from '../../ui/UIFontFamilySelector.svelte';
  import UIFontSizeSelector from '../../ui/UIFontSizeSelector.svelte';
  import UIFontWeightSelector from '../../ui/UIFontWeightSelector.svelte';
  import UILineHeightSelector from '../../ui/UILineHeightSelector.svelte';
  import UILetterSpacingSelector from '../../ui/UILetterSpacingSelector.svelte';
  import FieldsetWrapper from './FieldsetWrapper.svelte';
  import { BORDER_WIDTH } from '../../ui/variantScales';

  
  
  
  interface Props {
    colorVariable: string;
    colorLabel?: string;
    familyVariable?: string | undefined;
    familyLabel?: string;
    sizeVariable?: string | undefined;
    sizeLabel?: string;
    weightVariable?: string | undefined;
    weightLabel?: string;
    lineHeightVariable?: string | undefined;
    lineHeightLabel?: string;
    letterSpacingVariable?: string | undefined;
    letterSpacingLabel?: string;
    /** Optional outline rows rendered under the typography rows so a text-with-
      stroke group keeps stroke controls visually nested with the type they
      drive (e.g. SectionDivider title outline). */
    outlineWidthVariable?: string | undefined;
    outlineWidthLabel?: string;
    outlineColorVariable?: string | undefined;
    outlineColorLabel?: string;
    /** When set, writes persist through the editor store under this component. */
    component?: string | undefined;
    /** Legend text for the fieldset. */
    legend?: string;
    onchange?: () => void;
  }

  let {
    colorVariable,
    colorLabel = 'color',
    familyVariable = undefined,
    familyLabel = 'family',
    sizeVariable = undefined,
    sizeLabel = 'size',
    weightVariable = undefined,
    weightLabel = 'weight',
    lineHeightVariable = undefined,
    lineHeightLabel = 'line-h',
    letterSpacingVariable = undefined,
    letterSpacingLabel = 'letter-sp',
    outlineWidthVariable = undefined,
    outlineWidthLabel = 'outline thickness',
    outlineColorVariable = undefined,
    outlineColorLabel = 'outline color',
    component = undefined,
    legend = 'type',
    onchange,
  }: Props = $props();
</script>

<FieldsetWrapper {legend}>
  <div class="type-grid">
    <span class="row-label">{colorLabel}</span>
    <UIPaletteSelector variable={colorVariable} {component} {onchange} />

    {#if familyVariable}
      <span class="row-label">{familyLabel}</span>
      <UIFontFamilySelector variable={familyVariable} {component} canBeLinked {onchange} />
    {/if}
    {#if weightVariable}
      <span class="row-label">{weightLabel}</span>
      <UIFontWeightSelector variable={weightVariable} {component} canBeLinked {onchange} />
    {/if}
    {#if sizeVariable}
      <span class="row-label">{sizeLabel}</span>
      <UIFontSizeSelector variable={sizeVariable} {component} canBeLinked {onchange} />
    {/if}
    {#if lineHeightVariable}
      <span class="row-label">{lineHeightLabel}</span>
      <UILineHeightSelector variable={lineHeightVariable} {component} canBeLinked {onchange} />
    {/if}
    {#if letterSpacingVariable}
      <span class="row-label">{letterSpacingLabel}</span>
      <UILetterSpacingSelector variable={letterSpacingVariable} {component} canBeLinked {onchange} />
    {/if}
    {#if outlineWidthVariable}
      <span class="row-label">{outlineWidthLabel}</span>
      <UIVariantSelector variable={outlineWidthVariable} {component} canBeLinked {...BORDER_WIDTH} {onchange} />
    {/if}
    {#if outlineColorVariable}
      <span class="row-label">{outlineColorLabel}</span>
      <UIPaletteSelector variable={outlineColorVariable} {component} canBeLinked {onchange} />
    {/if}
  </div>
</FieldsetWrapper>

<style>
  .type-grid {
    display: grid;
    /* Label column tracks the editor-wide `--editor-label-col` when an
       ancestor (e.g. StateBlock's `.element-section`) sets one, so this
       grid lines up with sibling `.token-grid`s in the same section. */
    grid-template-columns: var(--editor-label-col, max-content) 8rem 1fr;
    column-gap: var(--ui-space-10);
    row-gap: var(--ui-space-6);
    align-items: center;
    padding: var(--ui-space-4) var(--ui-space-12);
  }

  .row-label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    text-align: left;
    line-height: 1;
  }
</style>
