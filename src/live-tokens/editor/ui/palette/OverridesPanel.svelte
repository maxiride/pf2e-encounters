<script lang="ts">
  import ScaleCurveEditor from './ScaleCurveEditor.svelte';
  import UIPillButton from '../UIPillButton.svelte';
  import { type CurveAnchor, lightnessCurveConfig, saturationCurveConfig, textLightnessCurveConfig } from '../curveEngine';
  import { scaleToCssVar } from '../../core/palettes/paletteDerivation';

  /**
   * Per-scale derived swatch section used for Text, Surfaces, and Borders
   * (in both chromatic and gray modes). Renders the scale header (snap/clear/edit
   * buttons), the swatch grid (derived swatch + override slot per step), and
   * the inline 2-curve editor when `editorOpen` is true.
   *
   * Linked/unlinked semantics live in the parent — this component receives the
   * pre-computed `overrides`, `derivedHexFor`, and `effectiveHexFor` and renders
   * them unchanged. No state mutation here; all interactions dispatch up.
   */

  interface Step {
    name: string;
    position: number;
    lightness?: number;
    saturation?: number;
  }

  interface Scale {
    title: string;
    isText: boolean;
    steps: Step[];
  }

  type Channel = 'lightness' | 'saturation';

  interface ScaleCurveDef {
    lightness: () => CurveAnchor[];
    saturation: () => CurveAnchor[];
  }

  interface PaletteStep { label: string; hex: string }



  interface Props {
    scale: Scale;
    editorOpen: boolean;
    snapped: boolean;
    supportsSnap: boolean;
    cssNamespace: string | null;
    scaleCurves: Record<string, { lightness: CurveAnchor[]; saturation: CurveAnchor[] }>;
    curveOffset: Record<string, number>;
    defaultScaleCurves: Record<string, ScaleCurveDef>;
    overrides: Record<string, string>;
    editingKey: string | null;
    snapPickerKey: string | null;
    copiedKey: string | null;
    copiedLabelKey: string | null;
    paletteComputed: PaletteStep[];
    derivedHexFor: (step: Step, scaleTitle: string) => string;
    effectiveHexFor: (key: string, step: Step, scaleTitle: string) => string;
    stepKeyFor: (scaleTitle: string, stepName: string) => string;
    scaleCurveKeyFor: (scaleTitle: string, channel: Channel) => string;
    onToggleSnap: (scale: Scale) => void;
    onClearScaleOverrides: (scale: Scale) => void;
    onToggleEditor: (scaleTitle: string) => void;
    onResetOverride: (key: string) => void;
    onOverrideClick: (key: string, step: Step, scaleTitle: string) => void;
    onSnappedClick: (key: string) => void;
    onSelectSnapValue: (key: string, paletteHex: string, scaleTitle: string) => void;
    onCopyHex: (key: string, hex: string, event?: MouseEvent) => void;
    onCopyVarName: (key: string, varName: string, event?: MouseEvent) => void;
    onSetScaleCurve: (scaleTitle: string, channel: Channel, anchors: CurveAnchor[]) => void;
    onOffsetChange: (key: string, value: number) => void;
  }

  let {
    scale,
    editorOpen,
    snapped,
    supportsSnap,
    cssNamespace,
    scaleCurves,
    curveOffset,
    defaultScaleCurves,
    overrides,
    editingKey,
    snapPickerKey,
    copiedKey,
    copiedLabelKey,
    paletteComputed,
    derivedHexFor,
    effectiveHexFor,
    stepKeyFor,
    scaleCurveKeyFor,
    onToggleSnap,
    onClearScaleOverrides,
    onToggleEditor,
    onResetOverride,
    onOverrideClick,
    onSnappedClick,
    onSelectSnapValue,
    onCopyHex,
    onCopyVarName,
    onSetScaleCurve,
    onOffsetChange
  }: Props = $props();

  interface CurveDescriptor {
    key: string;
    anchors: CurveAnchor[];
    cfg: typeof lightnessCurveConfig;
    defaults: CurveAnchor[];
    channel: Channel;
  }

  let curveDescriptors = $derived(((): CurveDescriptor[] => {
    const lightnessCfg = scale.isText ? textLightnessCurveConfig : lightnessCurveConfig;
    const sc = scaleCurves[scale.title];
    const defs = defaultScaleCurves[scale.title];
    if (!sc || !defs) return [];
    return [
      { key: scaleCurveKeyFor(scale.title, 'lightness'), anchors: sc.lightness, cfg: lightnessCfg, defaults: defs.lightness(), channel: 'lightness' },
      { key: scaleCurveKeyFor(scale.title, 'saturation'), anchors: sc.saturation, cfg: saturationCurveConfig, defaults: defs.saturation(), channel: 'saturation' },
    ];
  })());
</script>

<div class="scale-section">
  <div class="scale-header">
    <h4 class="scale-title">{scale.title}</h4>
    {#if supportsSnap}
      <UIPillButton
        size="compact"
        variant={snapped ? 'primary' : 'outline'}
        onclick={() => onToggleSnap(scale)}
      >{snapped ? 'Unsnap' : 'Snap All'}</UIPillButton>
    {/if}
    <UIPillButton size="compact" variant="outline" onclick={() => onClearScaleOverrides(scale)}>Clear Overrides</UIPillButton>
    <UIPillButton size="compact" variant="outline" onclick={() => onToggleEditor(scale.title)}>
      {editorOpen ? 'Close' : 'Edit'}
    </UIPillButton>
  </div>
  <div class="swatch-grid" style="--swatch-cols: {scale.steps.length}; --swatch-gap: var(--ui-space-8)">
    {#each scale.steps as step}
      {@const k = stepKeyFor(scale.title, step.name)}
      {@const hex = effectiveHexFor(k, step, scale.title)}
      {@const dHex = derivedHexFor(step, scale.title)}
      <div class="step-column">
        <button class="step-label copyable-label" class:copied={copiedLabelKey === k} type="button" onclick={(e) => { const v = scaleToCssVar(scale.title, step.name, cssNamespace); if (v) onCopyVarName(k, v, e); }}>
          {copiedLabelKey === k ? 'copied!' : step.name}
        </button>
        {#if scale.isText}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div
            class="swatch derived text-swatch"
            class:dimmed={k in overrides}
            class:clickable={k in overrides}
            onclick={() => onResetOverride(k)}
            role={k in overrides ? 'button' : undefined}
            tabindex={k in overrides ? 0 : undefined}
            onkeydown={(e) => k in overrides && e.key === 'Enter' && onResetOverride(k)}
          >
            <span style="color: {dHex}">Ag</span>
          </div>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div
            class="swatch override-slot text-swatch"
            class:active={editingKey === k}
            class:populated={k in overrides}
            class:matching={k in overrides && overrides[k] === dHex}
            onclick={() => onOverrideClick(k, step, scale.title)}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && onOverrideClick(k, step, scale.title)}
          >
            {#if k in overrides}
              <span style="color: {overrides[k]}">Ag</span>
            {/if}
          </div>
        {:else}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div
            class="swatch derived"
            class:border-preview={scale.title === 'Borders'}
            class:dimmed={k in overrides}
            class:clickable={k in overrides}
            style={scale.title === 'Borders'
              ? `border: 3px solid ${dHex}`
              : `background: ${dHex}`}
            onclick={() => onResetOverride(k)}
            role={k in overrides ? 'button' : undefined}
            tabindex={k in overrides ? 0 : undefined}
            onkeydown={(e) => k in overrides && e.key === 'Enter' && onResetOverride(k)}
          ></div>
          <div class="override-slot-wrapper">
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
              class="swatch override-slot"
              class:border-preview={scale.title === 'Borders'}
              class:active={editingKey === k || snapPickerKey === k}
              class:populated={k in overrides}
              class:matching={k in overrides && overrides[k] === dHex}
              onclick={() => snapped ? onSnappedClick(k) : onOverrideClick(k, step, scale.title)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && (snapped ? onSnappedClick(k) : onOverrideClick(k, step, scale.title))}
            >
              {#if k in overrides}
                {#if scale.title === 'Borders'}
                  <div class="override-fill border-fill" style="border: 3px solid {overrides[k]}"></div>
                {:else}
                  <div class="override-fill" style="background: {overrides[k]}"></div>
                {/if}
                {#if snapped}
                  {@const plabel = paletteComputed.find(ps => ps.hex === overrides[k])?.label ?? null}
                  {#if plabel}
                    <span class="palette-step-label">{plabel}</span>
                  {/if}
                {/if}
              {/if}
            </div>
            {#if snapPickerKey === k}
              <div class="snap-picker">
                {#each paletteComputed as ps}
                  <button
                    class="snap-picker-item"
                    class:selected={overrides[k] === ps.hex}
                    type="button"
                    onclick={() => onSelectSnapValue(k, ps.hex, scale.title)}
                  >
                    <span class="snap-picker-swatch" style="background: {ps.hex}"></span>
                    <span class="snap-picker-label">{ps.label}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
        <button
          class="step-hex"
          class:copied={copiedKey === k}
          type="button"
          onclick={(e) => onCopyHex(k, hex, e)}
        >{copiedKey === k ? 'copied!' : hex}</button>
      </div>
    {/each}
    {#if editorOpen}
      <div class="curve-grid-span" style="grid-column: 1 / -1">
        {#each curveDescriptors as curve (curve.key)}
          <ScaleCurveEditor
            curveKey={curve.key}
            anchors={curve.anchors}
            cfg={curve.cfg}
            stepCount={scale.steps.length}
            defaults={curve.defaults}
            offset={curveOffset[curve.key] ?? 0}
            onAnchorsChange={(a) => onSetScaleCurve(scale.title, curve.channel, a)}
            onOffsetChange={onOffsetChange}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .scale-section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    min-width: 0;
    max-width: 100%;
  }

  .scale-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding-bottom: 0.5rem;
  }

  .scale-title {
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-bold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-right: 1rem;
  }

  .swatch-grid {
    display: grid;
    grid-template-columns: repeat(var(--swatch-cols), minmax(0, 1fr));
    gap: var(--ui-space-4) var(--swatch-gap, var(--ui-space-4));
    align-items: start;
    justify-content: start;
    min-width: 0;
    max-width: calc(var(--swatch-cols) * 4rem + (var(--swatch-cols) - 1) * var(--swatch-gap, var(--ui-space-4)));
  }

  .curve-grid-span {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .step-column {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-self: stretch;
    gap: var(--ui-space-2);
    width: auto;
    min-width: 0;
    overflow: visible;
  }

  .step-label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    text-align: center;
    line-height: 1;
    height: var(--ui-font-size-xs);
    display: flex;
    align-items: flex-end;
  }

  .step-label.copyable-label {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
    font-size: var(--ui-font-size-sm);
    justify-content: center;
    transition: color var(--ui-transition-fast);
  }

  .step-label.copyable-label:hover {
    color: var(--ui-text-primary);
  }

  .step-label.copyable-label.copied {
    color: var(--ui-text-accent, var(--ui-text-primary));
  }

  .swatch {
    width: 100%;
    height: 2rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
  }

  .swatch.text-swatch {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-bold);
  }

  .swatch.border-preview {
    background: none;
    border-radius: var(--ui-radius-md);
  }

  .override-fill.border-fill {
    background: none;
    border-radius: var(--ui-radius-sm);
  }

  .swatch.derived.clickable {
    cursor: pointer;
  }

  .swatch.derived.clickable:hover {
    outline: 2px solid var(--ui-border-high);
    outline-offset: 1px;
  }

  .swatch.derived.dimmed {
    position: relative;
  }

  .swatch.derived.dimmed::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom left,
      transparent calc(50% - 0.5px),
      white calc(50% - 0.5px),
      white calc(50% + 0.5px),
      transparent calc(50% + 0.5px)
    );
    border-radius: inherit;
  }

  .override-slot {
    border-style: dashed;
    border-color: var(--ui-border-low);
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .override-slot:hover {
    border-color: var(--ui-border-high);
  }

  .override-slot.active {
    border-color: var(--ui-border-higher);
    outline: 1px solid var(--ui-border-high);
    outline-offset: 1px;
  }

  .override-slot.populated {
    border-color: var(--ui-border-high);
  }

  .override-slot.matching::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom left,
      transparent calc(50% - 0.5px),
      white calc(50% - 0.5px),
      white calc(50% + 0.5px),
      transparent calc(50% + 0.5px)
    );
    border-radius: inherit;
    pointer-events: none;
  }

  .override-fill {
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }

  .palette-step-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    pointer-events: none;
    z-index: 1;
  }

  .override-slot-wrapper {
    position: relative;
  }

  .snap-picker {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    margin-top: var(--ui-space-4);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-high);
    border-radius: var(--ui-radius-md);
    padding: var(--ui-space-4);
    display: flex;
    flex-direction: column;
    gap: 1px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    min-width: 5.5rem;
  }

  .snap-picker-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-2) var(--ui-space-6);
    border: none;
    background: none;
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    font-family: var(--ui-font-mono);
    white-space: nowrap;
  }

  .snap-picker-item:hover {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .snap-picker-item.selected {
    background: var(--ui-surface-highest);
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-semibold);
  }

  .snap-picker-swatch {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
    flex-shrink: 0;
  }

  .snap-picker-label {
    line-height: 1;
  }

  .step-hex {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    padding: 1px var(--ui-space-2);
    border-radius: var(--ui-radius-sm);
    white-space: nowrap;
    background: none;
    border: none;
    text-align: center;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .step-hex:hover {
    background: var(--ui-surface-highest);
    color: var(--ui-text-primary);
  }

  .step-hex.copied {
    color: var(--ui-text-accent);
  }
</style>
