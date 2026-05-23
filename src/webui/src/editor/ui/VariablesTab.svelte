<script lang="ts">
  import { onMount } from 'svelte';
  import PaletteEditor from './PaletteEditor.svelte';
  import FontStackEditor from './FontStackEditor.svelte';
  import ProjectFontsSection from './ProjectFontsSection.svelte';
  import ColumnsSection from './sections/ColumnsSection.svelte';
  import TokenScaleTable from './sections/TokenScaleTable.svelte';
  import OverlaysSection from './sections/OverlaysSection.svelte';
  import GradientsSection from './sections/GradientsSection.svelte';
  import ShadowsSection from './sections/ShadowsSection.svelte';
  import {
    SPACING_VARS, BORDER_WIDTH_VARS, RADIUS_VARS, FONT_SIZE_VARS,
    ICON_SIZE_VARS, FONT_WEIGHT_VARS, LINE_HEIGHT_VARS,
    DURATION_TOKENS, Z_INDEX_TOKENS, OPACITY_TOKENS,
  } from './sections/tokenScales';

  /** Visual flash for the copy-to-clipboard chip, kept short enough to
   *  feel like immediate confirmation but long enough to register. */
  const COPIED_FLASH_MS = 1000;

  // Bumped on breakpoint flips; passed to TokenScaleTable so it re-resolves.
  // tokens.css declares responsive overrides at 768px and 480px.
  let liveVersion = $state(0);
  const BREAKPOINTS = ['(max-width: 768px)', '(max-width: 480px)'] as const;

  onMount(() => {
    liveVersion++; // initial read once the DOM has tokens.css applied
    if (typeof window === 'undefined') return;
    const mqls = BREAKPOINTS.map((q) => window.matchMedia(q));
    const bump = () => { liveVersion++; };
    for (const m of mqls) m.addEventListener('change', bump);
    return () => {
      for (const m of mqls) m.removeEventListener('change', bump);
    };
  });

  let copiedVar: string | null = $state(null);
  function copyVariable(v: string) {
    navigator.clipboard.writeText(v);
    copiedVar = v;
    setTimeout(() => { copiedVar = null; }, COPIED_FLASH_MS);
  }

</script>

<div class="variables-container">
  <!-- Palette Editor -->
  <section class="section" id="palette-editor">
    <h2 class="section-title">Palette Editor</h2>
    <p class="editor-intro">Derived palettes via <code>color-mix(in oklch)</code>. Change a base color to update all derived steps. Click any derived swatch to add a manual override.</p>
    <div class="palette-editors">
      <PaletteEditor label="Brand" initialColor="#c93636" cssNamespace="brand" />
      <PaletteEditor label="Accent" initialColor="#f49e0b" cssNamespace="accent" />
      <PaletteEditor label="Background" initialColor="#1a1a2e" cssNamespace="canvas" emptySelector />
      <PaletteEditor mode="gray" label="Neutral" cssNamespace="neutral"/>
      <PaletteEditor mode="gray" label="Alternate" displayLabel="Alternate (neutral)" cssNamespace="alternate" />
      <PaletteEditor label="Special" initialColor="#8b5cf6" cssNamespace="special" />
      <PaletteEditor label="Info" initialColor="#3077e8" cssNamespace="info" />
      <PaletteEditor label="Success" initialColor="#21c45d" cssNamespace="success" />
      <PaletteEditor label="Warning" initialColor="#e66e1a" cssNamespace="warning" />
      <PaletteEditor label="Danger" initialColor="#e8304f" cssNamespace="danger" />
    </div>
  </section>

  <!-- Spacing & Borders -->
  <section class="section" id="spacing">
    <h2 class="section-title">Spacing &amp; Borders</h2>
    <div class="spacing-borders-columns">
      <div class="spacing-borders-group">
        <h3 class="subsection-title">Spacing</h3>
        <TokenScaleTable kind="spacing" vars={SPACING_VARS} {liveVersion} {copiedVar} oncopy={copyVariable} />
      </div>
      <div class="spacing-borders-group">
        <h3 class="subsection-title">Borders</h3>
        <TokenScaleTable kind="border" vars={BORDER_WIDTH_VARS} {liveVersion} {copiedVar} oncopy={copyVariable} />
      </div>
    </div>
  </section>

  <!-- Columns -->
  <ColumnsSection />

  <!-- Border Radius -->
  <section class="section" id="border-radius">
    <h2 class="section-title">Border Radius</h2>
    <TokenScaleTable kind="radius" vars={RADIUS_VARS} {liveVersion} {copiedVar} oncopy={copyVariable} />
  </section>

  <!-- Typography -->
  <section class="section" id="typography">
    <h2 class="section-title">Typography</h2>

    <div class="typography-columns">
      <div class="typography-group font-families-group">
        <ProjectFontsSection />
        <h3 class="group-title">Font Families</h3>
        <FontStackEditor />
      </div>

      <div class="typography-group">
        <h3 class="group-title">Font Sizes</h3>
        <TokenScaleTable kind="font-size" vars={FONT_SIZE_VARS} {liveVersion} {copiedVar} oncopy={copyVariable} />
      </div>

      <div class="typography-group">
        <h3 class="group-title">Font Weights</h3>
        <TokenScaleTable kind="font-weight" vars={FONT_WEIGHT_VARS} {liveVersion} {copiedVar} oncopy={copyVariable} />
      </div>

      <div class="typography-group">
        <h3 class="group-title">Line Heights</h3>
        <TokenScaleTable kind="line-height" vars={LINE_HEIGHT_VARS} {liveVersion} {copiedVar} oncopy={copyVariable} />
      </div>
    </div>
  </section>

  <!-- Icon Sizes -->
  <section class="section" id="icon-sizes">
    <h2 class="section-title">Icon Sizes</h2>
    <TokenScaleTable kind="icon-size" vars={ICON_SIZE_VARS} {liveVersion} {copiedVar} oncopy={copyVariable} />
  </section>


  <!-- Shadows -->
  <ShadowsSection {copiedVar} oncopy={copyVariable} />


  <!-- Overlays -->
  <OverlaysSection {copiedVar} oncopy={copyVariable} />

  <!-- Gradients -->
  <GradientsSection {copiedVar} oncopy={copyVariable} />

  <!-- Utility Tokens -->
  <section class="section" id="utility-tokens">
    <h2 class="section-title">Utility Tokens</h2>
    <div class="utility-columns">
      <div class="utility-group">
        <h3 class="group-title">Durations</h3>
        <TokenScaleTable kind="line-height" tokens={DURATION_TOKENS} {copiedVar} oncopy={copyVariable} />
      </div>

      <div class="utility-group">
        <h3 class="group-title">Z-Index Layers</h3>
        <TokenScaleTable kind="line-height" tokens={Z_INDEX_TOKENS} {copiedVar} oncopy={copyVariable} />
      </div>

      <div class="utility-group">
        <h3 class="group-title">Opacity</h3>
        <TokenScaleTable kind="line-height" tokens={OPACITY_TOKENS} {copiedVar} oncopy={copyVariable} />
      </div>
    </div>
  </section>
</div>

<style>
  .variables-container {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-48);
  }

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

  /* Tier-2 group header: xl bold white. No divider — vertical rhythm carries the
     separation, matching the palette section's title style at a smaller size. */
  .group-title {
    font-size: var(--ui-font-size-xl);
    font-weight: var(--ui-font-weight-bold);
    color: var(--ui-text-primary);
    margin: 0;
  }

  /* Subsection title (used by Spacing & Borders) */
  .subsection-title {
    margin: var(--ui-space-16) 0 var(--ui-space-8);
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
  }

  .subsection-title:first-child {
    margin-top: 0;
  }

  /* Spacing & Borders columns */
  .spacing-borders-columns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(20rem, 100%), 1fr));
    gap: var(--ui-space-24);
    align-items: start;
  }

  .spacing-borders-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    min-width: 0;
  }

  .spacing-borders-group .subsection-title {
    margin: 0;
  }

  /* Typography */
  .typography-columns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(22rem, 100%), 1fr));
    gap: var(--ui-space-24);
    align-items: start;
  }

  .typography-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    min-width: 0;
  }

  .font-families-group {
    grid-column: 1 / -1;
    /* Two logical groups stacked here (Project Fonts + Font Families); space them
       further apart than peers inside a single group. */
    gap: var(--ui-space-32);
  }

  /* Utility Tokens */
  .utility-columns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--ui-space-24);
    align-items: start;
  }

  .utility-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  /* Palette Editor */
  .editor-intro {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    margin: 0;
  }

  .editor-intro code {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-accent);
    background: var(--ui-surface-lowest);
    padding: var(--ui-space-2) var(--ui-space-4);
    border-radius: var(--ui-radius-sm);
    font-family: var(--ui-font-mono);
  }

  .palette-editors {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-16);
  }

  /* Utility fill tightens at narrow widths */
  .utility-columns {
    grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
  }
</style>
