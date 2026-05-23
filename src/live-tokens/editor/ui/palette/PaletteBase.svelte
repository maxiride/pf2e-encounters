<script lang="ts">
  import ColorEditPanel from '../ColorEditPanel.svelte';
  import Toggle from '../Toggle.svelte';
  import { beginSliderGesture } from '../../core/store/editorStore';

  


  interface Props {
    /**
   * The header swatch + label + base-hex + (when active) the ColorEditPanel
   * for editing the palette's base colour. In chromatic mode the user picks
   * an arbitrary hex; in gray mode the user picks tint hue + chroma and the
   * hex is derived.
   *
   * State (`editing`, scope handle) is owned by the parent — this component
   * fires callbacks (`onStartEdit`, `onConfirm`, `onCancel`, etc.). The
   * parent decides whether to apply the chromatic-vs-gray snapshot dance.
   */
    label: string;
    displayLabel?: string | null;
    mode: 'chromatic' | 'gray';
    baseColor: string;
    gray500Hex: string;
    tintHue: number;
    tintChroma: number;
    anchorToBase: boolean;
    isEditingBase: boolean;
    panelOpen: boolean;
    editingColor: string | null;
    editPanelTitle: string | null;
    copiedKey: string | null;
    onStartEdit: () => void;
    onConfirm: () => void;
    onCancel: () => void;
    onColorChange: (hex: string) => void;
    onTintChange: (hue: number, chroma: number) => void;
    onAnchorToBaseChange: (next: boolean) => void;
    onCopyBaseHex: (key: string, hex: string, event?: MouseEvent) => void;
  }

  let {
    label,
    displayLabel = null,
    mode,
    baseColor,
    gray500Hex,
    tintHue,
    tintChroma,
    anchorToBase,
    isEditingBase,
    panelOpen,
    editingColor,
    editPanelTitle,
    copiedKey,
    onStartEdit,
    onConfirm,
    onCancel,
    onColorChange,
    onTintChange,
    onAnchorToBaseChange,
    onCopyBaseHex
  }: Props = $props();

  let displayHex = $derived(mode === 'gray' ? gray500Hex : baseColor);
  let copyKey = $derived(mode === 'gray' ? 'gray-500' : '__base__');
</script>

<div class="editor-top">
  <div class="editor-primary">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="header-swatch"
      class:active={isEditingBase}
      style="background: {displayHex}"
      onclick={onStartEdit}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && onStartEdit()}
    ></div>
    <div class="primary-info">
      <span class="editor-label">{displayLabel ?? label}</span>
      <button
        class="base-hex clickable-hex"
        type="button"
        onclick={(e) => onCopyBaseHex(copyKey, displayHex, e)}
      >{copiedKey === copyKey ? 'copied!' : displayHex}</button>
    </div>
  </div>
</div>

{#if isEditingBase && panelOpen && editingColor}
  <ColorEditPanel
    color={editingColor}
    title={editPanelTitle}
    showRemoveOverride={false}
    mode={mode === 'gray' ? 'hue-chroma' : 'hsl'}
    hue={tintHue}
    chroma={tintChroma}
    onHueChromaChange={onTintChange}
    onColorChange={onColorChange}
    onConfirm={onConfirm}
    onCancel={onCancel}
    onRemoveOverride={() => {}}
    onSliderStart={() => beginSliderGesture(`edit ${label} base`)}
  >
    {#snippet actions()}
        <span  class:hidden={mode !== 'chromatic'}>
        <Toggle checked={anchorToBase} onchange={(v) => onAnchorToBaseChange(v ?? !anchorToBase)} label="Lock base color to position 500" />
      </span>
      {/snippet}
  </ColorEditPanel>
{/if}

<style>
  .editor-top {
    display: flex;
    align-items: flex-start;
    gap: var(--ui-space-16);
    flex-wrap: wrap;
  }

  .editor-primary {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    flex-shrink: 0;
  }

  .primary-info {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .header-swatch {
    width: 4rem;
    height: 4rem;
    border-radius: var(--ui-radius-md);
    border: 2px solid var(--ui-border);
    flex-shrink: 0;
    cursor: pointer;
  }

  .header-swatch:hover {
    border-color: var(--ui-border-higher);
  }

  .header-swatch.active {
    border-color: var(--ui-border-higher);
    outline: 2px solid var(--ui-border-high);
    outline-offset: 1px;
  }

  .editor-label {
    font-size: var(--ui-font-size-xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .base-hex {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
  }

  .clickable-hex {
    align-self: flex-start;
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--ui-space-2) var(--ui-space-4);
    margin-left: calc(-1 * var(--ui-space-4));
    border-radius: var(--ui-radius-sm);
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
    text-align: left;
  }

  .clickable-hex:hover {
    background: var(--ui-surface-highest);
    color: var(--ui-text-primary);
  }

  .hidden {
    display: none;
  }

  @media (max-width: 1280px) {
    .header-swatch {
      width: 3rem;
      height: 3rem;
    }
  }
</style>
