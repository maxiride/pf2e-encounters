<script lang="ts">
  /**
   * Overlay channels (dark + hover) UI lifted from VariablesTab.
   *
   * State lives in $editorState.overlays. The store's subscriber fans the
   * rgba values out to :root, so this component only orchestrates mutations
   * and reads derived display state.
   */
  import { editorState, mutate, beginSliderGesture } from '../../core/store/editorStore';
  import type { OverlayToken, OverlayChannelGlobals, EditorState } from '../../core/store/editorTypes';

  interface Props {
    copiedVar?: string | null;
    oncopy?: (variable: string) => void;
  }

  let { copiedVar = null, oncopy }: Props = $props();

  function copy(v: string) { oncopy?.(v); }

  let editingOverlay: string | null = $state(null);

  function clampNum(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }

  function getOverlayCss(t: OverlayToken): string {
    return `rgba(${t.r}, ${t.g}, ${t.b}, ${t.opacity})`;
  }

  function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r1 = 0, g1 = 0, b1 = 0;
    if (h < 60) { r1 = c; g1 = x; }
    else if (h < 120) { r1 = x; g1 = c; }
    else if (h < 180) { g1 = c; b1 = x; }
    else if (h < 240) { g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; b1 = c; }
    else { r1 = c; b1 = x; }
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255),
    };
  }

  function applyChannelColor(tokens: OverlayToken[], g: OverlayChannelGlobals): void {
    const rgb = hslToRgb(g.hue, g.saturation, g.lightness);
    for (const t of tokens) { t.r = rgb.r; t.g = rgb.g; t.b = rgb.b; }
  }
  function applyChannelOpacity(tokens: OverlayToken[], g: OverlayChannelGlobals): void {
    const last = tokens.length - 1;
    tokens.forEach((t, i) => {
      const frac = last > 0 ? i / last : 0.5;
      t.opacity = Math.round((g.opacityMin + frac * (g.opacityMax - g.opacityMin)) * 100) / 100;
    });
  }

  type OverlayChannel = 'overlay' | 'hover';
  type ColorField = 'hue' | 'saturation' | 'lightness';
  type OpacityField = 'opacityMin' | 'opacityMax';

  function pickChannelTokens(s: EditorState, ch: OverlayChannel): OverlayToken[] {
    return ch === 'overlay' ? s.overlays.tokens : s.overlays.hoverTokens;
  }

  function setOverlayColor(ch: OverlayChannel, field: ColorField, value: number) {
    mutate(`${ch} ${field}`, (s) => {
      const g = s.overlays.globals[ch];
      if (field === 'hue') g.hue = clampNum(value, 0, 360);
      else if (field === 'saturation') g.saturation = clampNum(value, 0, 100);
      else g.lightness = clampNum(value, 0, 100);
      applyChannelColor(pickChannelTokens(s, ch), g);
    });
  }

  function setOverlayOpacity(ch: OverlayChannel, field: OpacityField, value01: number) {
    mutate(`${ch} ${field}`, (s) => {
      const g = s.overlays.globals[ch];
      const clamped = Math.max(0, Math.min(1, value01));
      if (field === 'opacityMin') g.opacityMin = clamped;
      else g.opacityMax = clamped;
      applyChannelOpacity(pickChannelTokens(s, ch), g);
    });
  }

  function setOverlayTokenOpacity(ch: OverlayChannel, idx: number, value01: number) {
    mutate(`${ch} token opacity`, (s) => {
      const arr = pickChannelTokens(s, ch);
      const t = arr[idx];
      if (!t) return;
      t.opacity = Math.max(0, Math.min(1, value01));
    });
  }

  function overlayHueGrad(g: OverlayChannelGlobals): string {
    return `linear-gradient(to right, ${
      [0, 60, 120, 180, 240, 300, 360].map(h => `hsl(${h},${g.saturation}%,${g.lightness}%)`).join(',')
    })`;
  }
  function overlaySatGrad(g: OverlayChannelGlobals): string {
    return `linear-gradient(to right, hsl(${g.hue},0%,${g.lightness}%), hsl(${g.hue},100%,${g.lightness}%))`;
  }
  function overlayLightGrad(g: OverlayChannelGlobals): string {
    return `linear-gradient(to right, hsl(${g.hue},${g.saturation}%,0%), hsl(${g.hue},${g.saturation}%,50%), hsl(${g.hue},${g.saturation}%,100%))`;
  }
</script>

<section class="section" id="overlays">
  <h2 class="section-title">Overlays</h2>

  <h3 class="group-title">Dark Overlays</h3>
  <div class="overlays-grid">
    {#each $editorState.overlays.tokens as token, i}
      <div class="overlay-item">
        <div class="overlay-swatch-wrap">
          <div class="overlay-swatch" style="background: {getOverlayCss(token)};"></div>
        </div>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.label} — {Math.round(token.opacity * 100)}%</span>
        </div>
        <button class="shadow-edit-btn" onclick={() => editingOverlay = editingOverlay === token.variable ? null : token.variable}>
          {editingOverlay === token.variable ? 'Close' : 'Edit'}
        </button>
        {#if editingOverlay === token.variable}
          <div class="shadow-editor">
            <div class="shadow-slider-row">
              <span class="shadow-slider-label">Opacity</span>
              <input type="range" min="0" max="100" value={Math.round(token.opacity * 100)}
                onpointerdown={() => beginSliderGesture(`edit ${token.variable} opacity`)}
                oninput={(e) => setOverlayTokenOpacity('overlay', i, +e.currentTarget.value / 100)} />
              <input class="shadow-slider-input" type="number" min="0" max="100"
                value={Math.round(token.opacity * 100)}
                onchange={(e) => setOverlayTokenOpacity('overlay', i, Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
              <span class="shadow-slider-unit">%</span>
            </div>
            <div class="shadow-css-output">
              <code>{getOverlayCss(token)}</code>
              <button class="shadow-copy-btn" onclick={() => copy(getOverlayCss(token))}>
                {copiedVar === getOverlayCss(token) ? 'Copied!' : 'Copy CSS'}
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Global overlay editor -->
  <div class="overlay-global-editor">
    <h4 class="global-shadow-title">Global Overlay Controls</h4>
    <div class="overlay-global-columns">
      <div class="overlay-global-col">
        <div class="global-color-group">
          <div class="global-color-swatch" style="background: hsl({$editorState.overlays.globals.overlay.hue}, {$editorState.overlays.globals.overlay.saturation}%, {$editorState.overlays.globals.overlay.lightness}%);"></div>
          <div class="global-color-sliders">
            <div class="global-shadow-row">
              <span class="shadow-slider-label">H</span>
              <div class="slider-track" style="background: {overlayHueGrad($editorState.overlays.globals.overlay)}">
                <input type="range" min="0" max="360" value={$editorState.overlays.globals.overlay.hue}
                  onpointerdown={() => beginSliderGesture('overlay hue')}
                  oninput={(e) => setOverlayColor('overlay', 'hue', +e.currentTarget.value)} />
              </div>
              <input class="shadow-slider-input" type="number" min="0" max="360"
                value={$editorState.overlays.globals.overlay.hue}
                onchange={(e) => setOverlayColor('overlay', 'hue', +e.currentTarget.value)} />
              <span class="shadow-slider-unit">&deg;</span>
            </div>
            <div class="global-shadow-row">
              <span class="shadow-slider-label">S</span>
              <div class="slider-track" style="background: {overlaySatGrad($editorState.overlays.globals.overlay)}">
                <input type="range" min="0" max="100" value={$editorState.overlays.globals.overlay.saturation}
                  onpointerdown={() => beginSliderGesture('overlay saturation')}
                  oninput={(e) => setOverlayColor('overlay', 'saturation', +e.currentTarget.value)} />
              </div>
              <input class="shadow-slider-input" type="number" min="0" max="100"
                value={$editorState.overlays.globals.overlay.saturation}
                onchange={(e) => setOverlayColor('overlay', 'saturation', +e.currentTarget.value)} />
              <span class="shadow-slider-unit">%</span>
            </div>
            <div class="global-shadow-row">
              <span class="shadow-slider-label">L</span>
              <div class="slider-track" style="background: {overlayLightGrad($editorState.overlays.globals.overlay)}">
                <input type="range" min="0" max="100" value={$editorState.overlays.globals.overlay.lightness}
                  onpointerdown={() => beginSliderGesture('overlay lightness')}
                  oninput={(e) => setOverlayColor('overlay', 'lightness', +e.currentTarget.value)} />
              </div>
              <input class="shadow-slider-input" type="number" min="0" max="100"
                value={$editorState.overlays.globals.overlay.lightness}
                onchange={(e) => setOverlayColor('overlay', 'lightness', +e.currentTarget.value)} />
              <span class="shadow-slider-unit">%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="overlay-global-col">
        <div class="global-shadow-row">
          <span class="shadow-slider-label">Op. Min</span>
          <input type="range" min="0" max="100" value={Math.round($editorState.overlays.globals.overlay.opacityMin * 100)}
            onpointerdown={() => beginSliderGesture('overlay opacity min')}
            oninput={(e) => setOverlayOpacity('overlay', 'opacityMin', +e.currentTarget.value / 100)} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={Math.round($editorState.overlays.globals.overlay.opacityMin * 100)}
            onchange={(e) => setOverlayOpacity('overlay', 'opacityMin', Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
          <span class="shadow-slider-unit">%</span>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label">Op. Max</span>
          <input type="range" min="0" max="100" value={Math.round($editorState.overlays.globals.overlay.opacityMax * 100)}
            onpointerdown={() => beginSliderGesture('overlay opacity max')}
            oninput={(e) => setOverlayOpacity('overlay', 'opacityMax', +e.currentTarget.value / 100)} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={Math.round($editorState.overlays.globals.overlay.opacityMax * 100)}
            onchange={(e) => setOverlayOpacity('overlay', 'opacityMax', Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
          <span class="shadow-slider-unit">%</span>
        </div>
      </div>
    </div>
  </div>

  <h3 class="group-title" style="margin-top: var(--ui-space-16);">Hover Overlays</h3>
  <div class="overlays-grid">
    {#each $editorState.overlays.hoverTokens as token, i}
      <div class="overlay-item">
        <div class="overlay-swatch-wrap overlay-swatch-wrap--dark">
          <div class="overlay-swatch" style="background: {getOverlayCss(token)};"></div>
        </div>
        <div class="token-info">
          <button class="token-variable copyable" class:copied={copiedVar === token.variable} onclick={() => copy(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
          <span class="token-value">{token.label} — {Math.round(token.opacity * 100)}%</span>
        </div>
        <button class="shadow-edit-btn" onclick={() => editingOverlay = editingOverlay === token.variable ? null : token.variable}>
          {editingOverlay === token.variable ? 'Close' : 'Edit'}
        </button>
        {#if editingOverlay === token.variable}
          <div class="shadow-editor">
            <div class="shadow-slider-row">
              <span class="shadow-slider-label">Opacity</span>
              <input type="range" min="0" max="100" value={Math.round(token.opacity * 100)}
                onpointerdown={() => beginSliderGesture(`edit ${token.variable} opacity`)}
                oninput={(e) => setOverlayTokenOpacity('hover', i, +e.currentTarget.value / 100)} />
              <input class="shadow-slider-input" type="number" min="0" max="100"
                value={Math.round(token.opacity * 100)}
                onchange={(e) => setOverlayTokenOpacity('hover', i, Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
              <span class="shadow-slider-unit">%</span>
            </div>
            <div class="shadow-css-output">
              <code>{getOverlayCss(token)}</code>
              <button class="shadow-copy-btn" onclick={() => copy(getOverlayCss(token))}>
                {copiedVar === getOverlayCss(token) ? 'Copied!' : 'Copy CSS'}
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Global hover editor -->
  <div class="overlay-global-editor">
    <h4 class="global-shadow-title">Global Hover Controls</h4>
    <div class="overlay-global-columns">
      <div class="overlay-global-col">
        <div class="global-color-group">
          <div class="global-color-swatch" style="background: hsl({$editorState.overlays.globals.hover.hue}, {$editorState.overlays.globals.hover.saturation}%, {$editorState.overlays.globals.hover.lightness}%);"></div>
          <div class="global-color-sliders">
            <div class="global-shadow-row">
              <span class="shadow-slider-label">H</span>
              <div class="slider-track" style="background: {overlayHueGrad($editorState.overlays.globals.hover)}">
                <input type="range" min="0" max="360" value={$editorState.overlays.globals.hover.hue}
                  onpointerdown={() => beginSliderGesture('hover hue')}
                  oninput={(e) => setOverlayColor('hover', 'hue', +e.currentTarget.value)} />
              </div>
              <input class="shadow-slider-input" type="number" min="0" max="360"
                value={$editorState.overlays.globals.hover.hue}
                onchange={(e) => setOverlayColor('hover', 'hue', +e.currentTarget.value)} />
              <span class="shadow-slider-unit">&deg;</span>
            </div>
            <div class="global-shadow-row">
              <span class="shadow-slider-label">S</span>
              <div class="slider-track" style="background: {overlaySatGrad($editorState.overlays.globals.hover)}">
                <input type="range" min="0" max="100" value={$editorState.overlays.globals.hover.saturation}
                  onpointerdown={() => beginSliderGesture('hover saturation')}
                  oninput={(e) => setOverlayColor('hover', 'saturation', +e.currentTarget.value)} />
              </div>
              <input class="shadow-slider-input" type="number" min="0" max="100"
                value={$editorState.overlays.globals.hover.saturation}
                onchange={(e) => setOverlayColor('hover', 'saturation', +e.currentTarget.value)} />
              <span class="shadow-slider-unit">%</span>
            </div>
            <div class="global-shadow-row">
              <span class="shadow-slider-label">L</span>
              <div class="slider-track" style="background: {overlayLightGrad($editorState.overlays.globals.hover)}">
                <input type="range" min="0" max="100" value={$editorState.overlays.globals.hover.lightness}
                  onpointerdown={() => beginSliderGesture('hover lightness')}
                  oninput={(e) => setOverlayColor('hover', 'lightness', +e.currentTarget.value)} />
              </div>
              <input class="shadow-slider-input" type="number" min="0" max="100"
                value={$editorState.overlays.globals.hover.lightness}
                onchange={(e) => setOverlayColor('hover', 'lightness', +e.currentTarget.value)} />
              <span class="shadow-slider-unit">%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="overlay-global-col">
        <div class="global-shadow-row">
          <span class="shadow-slider-label">Op. Min</span>
          <input type="range" min="0" max="100" value={Math.round($editorState.overlays.globals.hover.opacityMin * 100)}
            onpointerdown={() => beginSliderGesture('hover opacity min')}
            oninput={(e) => setOverlayOpacity('hover', 'opacityMin', +e.currentTarget.value / 100)} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={Math.round($editorState.overlays.globals.hover.opacityMin * 100)}
            onchange={(e) => setOverlayOpacity('hover', 'opacityMin', Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
          <span class="shadow-slider-unit">%</span>
        </div>
        <div class="global-shadow-row">
          <span class="shadow-slider-label">Op. Max</span>
          <input type="range" min="0" max="100" value={Math.round($editorState.overlays.globals.hover.opacityMax * 100)}
            onpointerdown={() => beginSliderGesture('hover opacity max')}
            oninput={(e) => setOverlayOpacity('hover', 'opacityMax', +e.currentTarget.value / 100)} />
          <input class="shadow-slider-input" type="number" min="0" max="100"
            value={Math.round($editorState.overlays.globals.hover.opacityMax * 100)}
            onchange={(e) => setOverlayOpacity('hover', 'opacityMax', Math.min(100, Math.max(0, +e.currentTarget.value)) / 100)} />
          <span class="shadow-slider-unit">%</span>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-24);
  }

  .section-title {
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 2px solid var(--ui-border-high);
  }

  .group-title {
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    margin: 0;
  }

  .token-info {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .token-variable.copyable {
    all: unset;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .token-variable.copyable:hover {
    color: var(--ui-text-accent);
  }

  .token-variable.copyable.copied {
    color: var(--ui-text-success);
  }

  .token-value {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-muted);
  }

  /* Overlays */
  .overlays-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--ui-space-16);
  }

  .overlay-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .overlay-swatch-wrap {
    width: 4rem;
    height: 4rem;
    border-radius: var(--ui-radius-md);
    position: relative;
    overflow: hidden;
    border: 1px solid var(--ui-border-low);
    background-image:
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
    background-color: #fff;
  }

  .overlay-swatch-wrap--dark {
    background-color: #222;
    background-image:
      linear-gradient(45deg, #333 25%, transparent 25%),
      linear-gradient(-45deg, #333 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #333 75%),
      linear-gradient(-45deg, transparent 75%, #333 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
  }

  .overlay-swatch {
    position: absolute;
    inset: 0;
  }

  .overlay-item .token-info {
    align-items: center;
    text-align: center;
  }

  .overlay-global-editor {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    margin-top: var(--ui-space-8);
  }

  .overlay-global-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
    gap: var(--ui-space-16);
    align-items: start;
  }

  .overlay-global-col {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    min-width: 0;
  }

  .global-shadow-title {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    margin: 0;
  }

  .global-shadow-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .global-shadow-row .shadow-slider-label {
    width: 3rem;
  }

  .global-shadow-row input[type="range"] {
    flex: 1;
    min-width: 4rem;
    accent-color: var(--ui-text-accent);
    height: 4px;
    cursor: pointer;
  }

  .shadow-slider-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .shadow-slider-row input[type="range"] {
    flex: 1;
    min-width: 5rem;
    accent-color: var(--ui-text-accent);
    height: 4px;
    cursor: pointer;
  }

  .shadow-slider-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    width: 4rem;
    text-align: right;
    flex-shrink: 0;
  }

  .shadow-slider-input {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-mono);
    width: 2.5rem;
    text-align: right;
    flex-shrink: 0;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2) var(--ui-space-4);
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .shadow-slider-input::-webkit-inner-spin-button,
  .shadow-slider-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .shadow-slider-input:focus {
    outline: none;
    border-color: var(--ui-border-high);
  }

  .shadow-slider-unit {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    font-family: var(--ui-font-mono);
    width: 1rem;
    flex-shrink: 0;
  }

  .shadow-edit-btn {
    all: unset;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--ui-space-2) var(--ui-space-8);
    border-radius: var(--ui-radius-sm);
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
  }

  .shadow-edit-btn:hover {
    color: var(--ui-text-accent);
    background: var(--ui-surface-low);
  }

  .shadow-editor {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    width: 100%;
    min-width: 14rem;
  }

  .shadow-css-output {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    margin-top: var(--ui-space-4);
    padding-top: var(--ui-space-8);
    border-top: 1px solid var(--ui-border-low);
  }

  .shadow-css-output code {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-accent);
    font-family: var(--ui-font-mono);
    word-break: break-all;
  }

  .shadow-copy-btn {
    all: unset;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    cursor: pointer;
    padding: var(--ui-space-2) var(--ui-space-6);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    text-align: center;
    transition: color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .shadow-copy-btn:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-high);
  }

  .slider-track {
    flex: 1;
    min-width: 4rem;
    position: relative;
    height: 12px;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
  }

  .slider-track input[type="range"] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }

  .slider-track input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 10px;
    height: 14px;
    border-radius: 2px;
    background: white;
    border: 1px solid var(--ui-border-low);
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    cursor: pointer;
  }

  .slider-track input[type="range"]::-moz-range-thumb {
    width: 10px;
    height: 14px;
    border-radius: 2px;
    background: white;
    border: 1px solid var(--ui-border-low);
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    cursor: pointer;
  }

  .slider-track input[type="range"]::-moz-range-track {
    background: transparent;
    border: none;
  }

  .global-color-group {
    display: flex;
    gap: var(--ui-space-8);
    align-items: stretch;
  }

  .global-color-swatch {
    width: 2rem;
    flex-shrink: 0;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
  }

  .global-color-sliders {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }
</style>
