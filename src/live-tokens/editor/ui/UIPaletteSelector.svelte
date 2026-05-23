<script lang="ts">
  import { run } from 'svelte/legacy';

  import { slide } from 'svelte/transition';
  import { cubicOut, cubicIn } from 'svelte/easing';
  import { resolveAliasChain } from '../core/palettes/tokenRegistry';
  import { editorState } from '../core/store/editorStore';
  import { formatGradientStops } from '../core/themes/slices/gradients';
  import type { GradientToken } from '../core/store/editorTypes';
  import UITokenSelector from './UITokenSelector.svelte';

  /** Honor prefers-reduced-motion: `t()` zeroes durations when the OS asks for
   *  less motion, so the detail-row enter/exit slides skip outright. Mirrors
   *  the pattern used in UIPaddingSelector for split↔merge transitions. */
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const t = (ms: number) => (reduceMotion ? 0 : ms);

  /** Tokens that match the surface/fill suffix but live in <color>-only CSS contexts
      (color-mix, box-shadow color slot) where a gradient would invalidate the declaration. */
  const GRADIENT_DENYLIST = new Set<string>([
    '--radiobutton-default-surface',
    '--radiobutton-hover-surface',
    '--radiobutton-active-surface',
  ]);

  /** Slot kinds where a gradient is a renderable assignment. */
  function acceptsGradient(name: string): boolean {
    if (GRADIENT_DENYLIST.has(name)) return false;
    return name.endsWith('-surface') || name.endsWith('-fill');
  }

  interface Props {
    variable: string;
    component?: string | undefined;
    canBeLinked?: boolean;
    disabled?: boolean;
    selectionsLocked?: boolean;
    /** When set, restrict picker family choices to this family (one of the
     *  entries in the `families` list). Other families render but are
     *  rendered disabled and not clickable. Out-of-family already-set
     *  choices still surface in the trigger meta. */
    familyFilter?: string | null;
    onchange?: () => void;
  }

  let {
    variable,
    component = undefined,
    canBeLinked = false,
    disabled = false,
    selectionsLocked = false,
    familyFilter = null,
    onchange,
  }: Props = $props();

  type Category = 'palette' | 'surface' | 'border' | 'text';

  const families = [
    { name: 'neutral', label: 'Neutral' },
    { name: 'alternate', label: 'Alternate' },
    { name: 'canvas', label: 'Canvas' },
    { name: 'brand', label: 'Brand' },
    { name: 'accent', label: 'Accent' },
    { name: 'special', label: 'Special' },
    { name: 'success', label: 'Success' },
    { name: 'warning', label: 'Warning' },
    { name: 'info', label: 'Info' },
    { name: 'danger', label: 'Danger' },
  ];

  const familyNames = families.map(f => f.name);

  const paletteSteps = ['100', '200', '300', '400', '500', '600', '700', '800', '850', '900', '950'];

  const surfaceSteps = [
    { key: 'lowest', label: 'Lowest' },
    { key: 'lower', label: 'Lower' },
    { key: 'low', label: 'Low' },
    { key: '', label: 'Default' },
    { key: 'high', label: 'High' },
    { key: 'higher', label: 'Higher' },
    { key: 'highest', label: 'Highest' },
  ];

  const borderSteps = [
    { key: 'faint', label: 'Faint' },
    { key: 'subtle', label: 'Subtle' },
    { key: '', label: 'Default' },
    { key: 'medium', label: 'Medium' },
    { key: 'strong', label: 'Strong' },
  ];

  const textSteps = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'tertiary', label: 'Tertiary' },
    { key: 'muted', label: 'Muted' },
    { key: 'disabled', label: 'Disabled' },
  ];

  const surfaceStepKeys = surfaceSteps.map(s => s.key);
  const borderStepKeys = borderSteps.map(s => s.key);
  const textStepKeys = textSteps.map(s => s.key);

  const familiesWithText = ['neutral', 'alternate', 'canvas', 'brand', 'accent', 'special', 'success', 'warning', 'info', 'danger'];

  const allCategories: { id: Category; label: string }[] = [
    { id: 'palette', label: 'Palette' },
    { id: 'surface', label: 'Surface' },
    { id: 'border', label: 'Border' },
    { id: 'text', label: 'Text' },
  ];

  let selector: UITokenSelector | undefined = $state();
  let selectedFamily: string | null = $state(null);
  let selectedTab: Category = $state('palette');

  /** Compass-rose layout for the orientation grid. Angles follow the CSS
   *  linear-gradient convention (0° points up, 90° points right). */
  const directionGrid: { angle: number; glyph: string; col: number; row: number; label: string }[] = [
    { angle: 315, glyph: '↖', col: 1, row: 1, label: 'top-left' },
    { angle: 0,   glyph: '↑', col: 2, row: 1, label: 'top' },
    { angle: 45,  glyph: '↗', col: 3, row: 1, label: 'top-right' },
    { angle: 270, glyph: '←', col: 1, row: 2, label: 'left' },
    { angle: 90,  glyph: '→', col: 3, row: 2, label: 'right' },
    { angle: 225, glyph: '↙', col: 1, row: 3, label: 'bottom-left' },
    { angle: 180, glyph: '↓', col: 2, row: 3, label: 'bottom' },
    { angle: 135, glyph: '↘', col: 3, row: 3, label: 'bottom-right' },
  ];

  /** Numeric input value. Kept in sync with chosenAngle/token-default by the
   *  reactive block below; user edits flow back through `applyOrientation`. */
  let angleInput: number = $state(0);

  let chosenCategory = $state<Category | null>(null);
  let chosenFamily = $state<string | null>(null);
  let chosenStep = $state<string | null>(null);
  let chosenNone = $state(false);
  let chosenGradient = $state<string | null>(null);
  /** Per-slot angle override on the chosen linear gradient. Null means
   *  "no override" — the slot writes `var(--gradient-N)` and inherits the
   *  token's natural angle. Non-null means the slot writes a materialized
   *  `linear-gradient(<angle>, <token's stops>)` so the angle is locally
   *  pinned while stop colors keep flowing from the token's `var()` refs. */
  let chosenAngle = $state<number | null>(null);
  let opacity: number = $state(100);
  let selfDefaultHex: string = '';

  let gradientsAllowed = $derived(acceptsGradient(variable));
  let gradientTokens = $derived($editorState.gradients.tokens);

  function captureSelfDefault() {
    const root = document.documentElement;
    const inline = root.style.getPropertyValue(variable);
    if (inline) root.style.removeProperty(variable);
    selfDefaultHex = rgbToHex(getComputedStyle(root).getPropertyValue(variable).trim());
    if (inline) root.style.setProperty(variable, inline);
  }

  function previewBg(category: Category, family: string, step: string): string {
    const varName = getVarName(category, family, step);
    if (varName === variable) return selfDefaultHex || `var(${varName})`;
    return `var(${varName})`;
  }

  function rgbToHex(value: string): string {
    const m = value.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!m) return value;
    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return `#${toHex(parseInt(m[1]))}${toHex(parseInt(m[2]))}${toHex(parseInt(m[3]))}`;
  }

  function getVarName(category: Category, family: string, stepKey: string): string {
    switch (category) {
      case 'palette':
        return `--color-${family}-${stepKey}`;
      case 'surface':
        return stepKey ? `--surface-${family}-${stepKey}` : `--surface-${family}`;
      case 'border':
        return stepKey ? `--border-${family}-${stepKey}` : `--border-${family}`;
      case 'text':
        if (family === 'neutral') return `--text-${stepKey}`;
        if (stepKey === 'primary') return `--text-${family}`;
        return `--text-${family}-${stepKey}`;
    }
  }

  function parseTextVarName(varName: string): { family: string; step: string } | null {
    if (varName === '--text-primary') return { family: 'neutral', step: 'primary' };
    if (varName === '--text-secondary') return { family: 'neutral', step: 'secondary' };
    if (varName === '--text-tertiary') return { family: 'neutral', step: 'tertiary' };
    if (varName === '--text-muted') return { family: 'neutral', step: 'muted' };
    if (varName === '--text-disabled') return { family: 'neutral', step: 'disabled' };
    const m = varName.match(/^--text-([a-z]+)(?:-([a-z]+))?$/);
    if (m) {
      const fam = m[1];
      const hier = m[2] || 'primary';
      if (familiesWithText.includes(fam) && fam !== 'neutral' && textStepKeys.includes(hier)) {
        return { family: fam, step: hier };
      }
    }
    return null;
  }

  function parseRef(value: string): { category: Category; family: string; step: string } | null {
    const varMatch = value.match(/var\((--[a-z0-9-]+)\)/);
    if (!varMatch) return null;
    const varName = varMatch[1];

    const paletteM = varName.match(/^--color-([a-z]+)-(\d{3})$/);
    if (paletteM && familyNames.includes(paletteM[1]) && paletteSteps.includes(paletteM[2])) {
      return { category: 'palette', family: paletteM[1], step: paletteM[2] };
    }

    const surfaceM = varName.match(/^--surface-([a-z]+)(?:-([a-z]+))?$/);
    if (surfaceM && familyNames.includes(surfaceM[1])) {
      const step = surfaceM[2] || '';
      if (surfaceStepKeys.includes(step)) {
        return { category: 'surface', family: surfaceM[1], step };
      }
    }

    const borderM = varName.match(/^--border-([a-z]+)(?:-([a-z]+))?$/);
    if (borderM && familyNames.includes(borderM[1])) {
      const step = borderM[2] || '';
      if (borderStepKeys.includes(step)) {
        return { category: 'border', family: borderM[1], step };
      }
    }

    const textResult = parseTextVarName(varName);
    if (textResult) {
      return { category: 'text', ...textResult };
    }

    return null;
  }

  function parseOpacity(raw: string): { inner: string; opacity: number } | null {
    const m = raw.match(/^color-mix\(in srgb,\s*(var\(--[a-z0-9-]+\))\s+(\d+)%,\s*transparent\)$/);
    if (!m) return null;
    return { inner: m[1], opacity: parseInt(m[2]) };
  }

  function buildValue(varName: string): string | null {
    if (varName === variable && opacity >= 100) return null;
    if (opacity >= 100) return varName;
    return `color-mix(in srgb, var(${varName}) ${opacity}%, transparent)`;
  }

  function applyOpacity() {
    opacity = Math.max(0, Math.min(100, Math.round(opacity)));
    if (chosenCategory === null || chosenFamily === null || chosenStep === null) return;
    const varName = getVarName(chosenCategory, chosenFamily, chosenStep);
    selector?.writeOverride(buildValue(varName));
    onchange?.();
  }

  /** Apply (or clear) a per-slot angle override on the chosen linear gradient.
   *  When the requested angle matches the gradient token's own natural angle
   *  we drop back to the cleaner `var(--gradient-N)` form — that way dialing
   *  back to default and pressing the reset button arrive at the same value. */
  function applyOrientation(nextAngle: number) {
    if (chosenGradient === null) return;
    const token = getGradientToken(chosenGradient);
    if (!token || token.type !== 'linear') return;
    const normalized = ((Math.round(nextAngle) % 360) + 360) % 360;
    chosenAngle = normalized;
    if (normalized === token.angle) {
      selector?.writeOverride(chosenGradient);
    } else {
      selector?.writeOverride(materializeGradient(token, normalized));
    }
    onchange?.();
  }

  function resetOrientation() {
    if (chosenGradient === null) return;
    chosenAngle = null;
    selector?.writeOverride(chosenGradient);
    onchange?.();
  }

  function isGradientToken(name: string): boolean {
    return gradientTokens.some((g) => g.variable === name);
  }

  function getGradientToken(name: string): GradientToken | undefined {
    return gradientTokens.find((g) => g.variable === name);
  }

  /** Normalize whitespace so a slot's stored linear-gradient string compares
   *  equal to the canonical `formatGradientStops` output regardless of how it
   *  was last serialized through the DOM / persistence layer. */
  function normStops(s: string): string {
    return s.replace(/\s+/g, ' ').trim();
  }

  /** Match a materialized linear-gradient back to its source gradient token by
   *  comparing the inlined stop list. We only need to identify linear tokens
   *  here because angle override doesn't apply to radial. */
  function identifyMaterializedGradient(raw: string): { variable: string; angle: number } | null {
    const m = raw.match(/^linear-gradient\(\s*([\d.]+)deg\s*,\s*(.+)\)\s*$/);
    if (!m) return null;
    const angle = parseFloat(m[1]);
    const stops = normStops(m[2]);
    for (const t of gradientTokens) {
      if (t.type !== 'linear') continue;
      if (normStops(formatGradientStops(t)) === stops) {
        return { variable: t.variable, angle };
      }
    }
    return null;
  }

  function materializeGradient(token: GradientToken, angle: number): string {
    return `linear-gradient(${angle}deg, ${formatGradientStops(token)})`;
  }

  function initFromCurrent() {
    const raw = document.documentElement.style.getPropertyValue(variable).trim();

    if (raw === 'transparent') {
      chosenNone = true;
      chosenCategory = null;
      chosenFamily = null;
      chosenStep = null;
      chosenGradient = null;
      chosenAngle = null;
      opacity = 100;
      return;
    }

    chosenNone = false;

    if (gradientsAllowed) {
      const gradMatch = raw.match(/^var\((--[a-z0-9-]+)\)$/);
      if (gradMatch && isGradientToken(gradMatch[1])) {
        chosenGradient = gradMatch[1];
        chosenCategory = null;
        chosenFamily = null;
        chosenStep = null;
        chosenAngle = null;
        opacity = 100;
        return;
      }
      // Materialized form: `linear-gradient(<angle>, <token's stops>)`
      // — an angle override pinned locally while stops still carry var() refs
      // back to palette tokens.
      const materialized = identifyMaterializedGradient(raw);
      if (materialized) {
        chosenGradient = materialized.variable;
        chosenCategory = null;
        chosenFamily = null;
        chosenStep = null;
        chosenAngle = materialized.angle;
        opacity = 100;
        return;
      }
    }
    chosenGradient = null;
    chosenAngle = null;

    const opacityParsed = parseOpacity(raw);
    if (opacityParsed) {
      const parsed = parseRef(opacityParsed.inner);
      if (parsed) {
        chosenCategory = parsed.category;
        chosenFamily = parsed.family;
        chosenStep = parsed.step;
        opacity = opacityParsed.opacity;
        return;
      }
    }

    const parsed = raw ? parseRef(raw) : null;
    if (parsed) {
      chosenCategory = parsed.category;
      chosenFamily = parsed.family;
      chosenStep = parsed.step;
      opacity = 100;
      return;
    }
    for (const alias of resolveAliasChain(variable)) {
      const aliasParsed = parseRef(`var(${alias})`);
      if (aliasParsed) {
        chosenCategory = aliasParsed.category;
        chosenFamily = aliasParsed.family;
        chosenStep = aliasParsed.step;
        opacity = 100;
        return;
      }
    }
    chosenCategory = null;
    chosenFamily = null;
    chosenStep = null;
    opacity = 100;
  }

  function handleReset() {
    opacity = 100;
    chosenNone = false;
    initFromCurrent();
    selectedFamily = null;
    onchange?.();
  }

  function handleClose() {
    selectedFamily = null;
  }

  function selectFamily(name: string) {
    if (familyFilter && name !== familyFilter) return;
    selectedFamily = name;
    if (name === chosenFamily && chosenCategory) {
      selectedTab = chosenCategory;
    }
  }

  function backToFamilies() {
    selectedFamily = null;
  }

  function selectNone(close: () => void) {
    chosenNone = true;
    chosenCategory = null;
    chosenFamily = null;
    chosenStep = null;
    chosenGradient = null;
    chosenAngle = null;
    opacity = 100;
    selector?.writeOverride('transparent');
    selectedFamily = null;
    close();
    onchange?.();
  }

  function selectSwatch(category: Category, step: string, close: () => void) {
    const varName = getVarName(category, selectedFamily!, step);
    chosenNone = false;
    chosenGradient = null;
    chosenAngle = null;
    chosenCategory = category;
    chosenFamily = selectedFamily;
    chosenStep = step;
    selector?.writeOverride(buildValue(varName));
    selectedFamily = null;
    close();
    onchange?.();
  }

  // Picking any gradient is a fresh start: any prior angle override is
  // discarded and the slot adopts the new token's natural orientation by
  // writing `var(--gradient-N)`. The orientation control then displays the
  // token's default angle but with no local override active.
  function selectGradient(gradientVar: string, close: () => void) {
    chosenNone = false;
    chosenCategory = null;
    chosenFamily = null;
    chosenStep = null;
    chosenGradient = gradientVar;
    chosenAngle = null;
    opacity = 100;
    selector?.writeOverride(gradientVar);
    selectedFamily = null;
    close();
    onchange?.();
  }

  // Re-derive trigger state when the bound `variable` changes (e.g. when a
  // VariantGroup tabs view reuses the same selector instance across states).
  // The wrapper UITokenSelector forwards `var-change` only for the currently
  // bound variable, so prop swaps wouldn't otherwise refresh `chosenCategory`
  // / `chosenFamily` / `chosenStep` and the meta label drifts from the swatch.
  let lastSeenVariable: string | null = $state(null);
  run(() => {
    if (variable !== lastSeenVariable) {
      lastSeenVariable = variable;
      initFromCurrent();
      captureSelfDefault();
    }
  });

  let chosenGradientToken = $derived(chosenGradient ? getGradientToken(chosenGradient) : undefined);
  let isLinearGradientChosen = $derived(!!chosenGradientToken && chosenGradientToken.type === 'linear');
  let effectiveAngle = $derived(chosenGradientToken
    ? (chosenAngle ?? chosenGradientToken.angle)
    : 0);
  run(() => {
    angleInput = effectiveAngle;
  });

  let metaLabel = $derived(chosenNone
    ? 'none'
    : chosenGradient
      ? chosenGradient.replace(/^--/, '') + (chosenAngle !== null ? ` (${effectiveAngle}°)` : '')
      : (chosenCategory && chosenFamily && chosenStep !== null
        ? getVarName(chosenCategory, chosenFamily, chosenStep).replace(/^--/, '') + (opacity < 100 ? ` (${opacity}%)` : '')
        : ''));

  let availableTabs = $derived(selectedFamily
    ? allCategories.filter(c => c.id !== 'text' || familiesWithText.includes(selectedFamily!))
    : allCategories);

  run(() => {
    if (selectedFamily && !availableTabs.find(t => t.id === selectedTab)) {
      selectedTab = 'palette';
    }
  });
</script>

<UITokenSelector
  bind:this={selector}
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  dropdownMinWidth="14rem"
  dropdownMaxWidth="calc(100vw - 2rem)"
  hideDefaultHeader={!!selectedFamily}
  onreset={handleReset}
  onclose={handleClose}
  onvarChange={initFromCurrent}
>
  {#snippet triggerPreview()}
    <div class="swatch-wrap">
      <div class="swatch" style="background: var({variable});"></div>
    </div>
  {/snippet}
  {#snippet subheader()}
    <div  class="opacity-control" class:hidden={chosenGradient !== null}>
      <span class="opacity-label">opacity</span>
      <input type="range" min="0" max="100" bind:value={opacity} class="opacity-slider" oninput={applyOpacity} />
      <input type="number" min="0" max="100" bind:value={opacity} class="opacity-input" onchange={applyOpacity} />
      <span class="opacity-unit">%</span>
    </div>
  {/snippet}
  {#snippet triggerMeta()}{metaLabel}{/snippet}

  {#snippet children({ close })}
  
      {#if selectedFamily === null}
        <div class="family-list">
          <button class="family-item" class:active={chosenNone} onclick={() => selectNone(close)}>
            <div class="family-swatches">
              <div class="none-swatch"></div>
            </div>
            <span class="family-label">None</span>
          </button>
          {#each families as fam}
            {@const outOfFamily = familyFilter !== null && fam.name !== familyFilter}
            <button
              class="family-item"
              class:active={!chosenNone && chosenFamily === fam.name}
              class:out-of-family={outOfFamily}
              disabled={outOfFamily}
              onclick={() => selectFamily(fam.name)}
            >
              <div class="family-swatches">
                <div class="mini-swatch" style="background: var(--color-{fam.name}-300);"></div>
                <div class="mini-swatch" style="background: var(--color-{fam.name}-500);"></div>
                <div class="mini-swatch" style="background: var(--color-{fam.name}-700);"></div>
              </div>
              <span class="family-label">{fam.label}</span>
              {#if !outOfFamily}
                <i class="fas fa-chevron-right family-arrow"></i>
              {/if}
            </button>
          {/each}
          {#if gradientsAllowed && gradientTokens.length > 0}
            <div class="family-divider">Gradients</div>
            {#each gradientTokens as g}
              <button class="family-item" class:active={chosenGradient === g.variable} onclick={() => selectGradient(g.variable, close)}>
                <div class="family-swatches">
                  <div class="gradient-swatch" style="background: var({g.variable});"></div>
                </div>
                <span class="family-label">Gradient {g.variable.replace(/^--gradient-/, '')}</span>
              </button>
            {/each}
          {/if}
        </div>
      {:else}
        <button class="dropdown-back" onclick={backToFamilies}>
          <i class="fas fa-chevron-left"></i>
          <span>{families.find(f => f.name === selectedFamily)?.label}</span>
        </button>

        <div class="tab-bar">
          {#each availableTabs as tab}
            <button
              class="tab-btn"
              class:selected={selectedTab === tab.id}
              class:assigned={chosenCategory === tab.id && chosenFamily === selectedFamily}
              onclick={() => selectedTab = tab.id}
            >{tab.label}</button>
          {/each}
        </div>

        {#if selectedTab === 'palette'}
          <div class="step-grid">
            {#each paletteSteps as step}
              <button
                class="step-item"
                class:active={chosenCategory === 'palette' && chosenFamily === selectedFamily && chosenStep === step}
                onclick={() => selectSwatch('palette', step, close)}
              >
                <div class="step-swatch" style="background: var(--color-{selectedFamily}-{step});"></div>
                <span class="step-label">{step}</span>
              </button>
            {/each}
          </div>
        {:else if selectedTab === 'surface'}
          <div class="step-grid">
            {#each surfaceSteps as step}
              <button
                class="step-item"
                class:active={chosenCategory === 'surface' && chosenFamily === selectedFamily && chosenStep === step.key}
                onclick={() => selectSwatch('surface', step.key, close)}
              >
                <div class="step-swatch" style="background: {previewBg('surface', selectedFamily, step.key)};"></div>
                <span class="step-label">{step.label}</span>
              </button>
            {/each}
          </div>
        {:else if selectedTab === 'border'}
          <div class="step-grid">
            {#each borderSteps as step}
              <button
                class="step-item"
                class:active={chosenCategory === 'border' && chosenFamily === selectedFamily && chosenStep === step.key}
                onclick={() => selectSwatch('border', step.key, close)}
              >
                <div class="step-swatch" style="background: {previewBg('border', selectedFamily, step.key)};"></div>
                <span class="step-label">{step.label}</span>
              </button>
            {/each}
          </div>
        {:else if selectedTab === 'text'}
          <div class="step-grid">
            {#each textSteps as step}
              <button
                class="step-item"
                class:active={chosenCategory === 'text' && chosenFamily === selectedFamily && chosenStep === step.key}
                onclick={() => selectSwatch('text', step.key, close)}
              >
                <div class="step-swatch" style="background: {previewBg('text', selectedFamily, step.key)};"></div>
                <span class="step-label">{step.label}</span>
              </button>
            {/each}
          </div>
        {/if}
      {/if}
    
  {/snippet}
</UITokenSelector>

<!--
  Inline orientation row. When a linear gradient is the chosen value the
  palette row "grows" — UITokenSelector occupies row 1 (cols 2-3 of the
  parent token-row's subgrid via its default `grid-column: span 2`); this
  block lands on row 2, also cols 2-3, sitting directly under the swatch
  trigger. Same pattern padding-sides uses to expand into row 2 of the
  parent token-row, just lighter (no link/merge header chrome).
-->
{#if isLinearGradientChosen}
  <div
    class="palette-detail-row"
    in:slide|local={{ duration: t(280), delay: t(60), easing: cubicOut }}
    out:slide|local={{ duration: t(220), easing: cubicIn }}
  >
    <span class="detail-label">orientation</span>
    <div class="orientation-body">
      <div class="dir-grid">
        {#each directionGrid as d}
          <button
            type="button"
            class="dir-btn"
            class:active={d.angle === ((effectiveAngle % 360) + 360) % 360}
            style="grid-column: {d.col}; grid-row: {d.row};"
            onclick={() => applyOrientation(d.angle)}
            title="{d.label} ({d.angle}°)"
          >{d.glyph}</button>
        {/each}
      </div>
      <div class="angle-input-wrap">
        <input
          type="number"
          min="0"
          max="359"
          class="angle-input"
          bind:value={angleInput}
          onchange={() => applyOrientation(angleInput)}
        />
        <span class="angle-unit">°</span>
      </div>
      <button
        type="button"
        class="orientation-reset"
        class:active={chosenAngle !== null}
        onclick={resetOrientation}
        disabled={chosenAngle === null}
        title="Reset to gradient default"
      >
        <i class="fas fa-rotate-left"></i>
      </button>
    </div>
  </div>
{/if}

<style>
  .swatch-wrap {
    align-self: stretch;
    flex: 1;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
    background-image: linear-gradient(45deg, var(--ui-border-low) 25%, transparent 25%),
      linear-gradient(-45deg, var(--ui-border-low) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--ui-border-low) 75%),
      linear-gradient(-45deg, transparent 75%, var(--ui-border-low) 75%);
    background-size: 8px 8px;
    background-position: 0 0, 0 4px, 4px -4px, -4px 0;
    overflow: hidden;
  }

  .swatch {
    width: 100%;
    height: 100%;
  }

  .opacity-control {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-8);
    border-bottom: 1px solid var(--ui-border-low);
  }

  .opacity-control.hidden {
    display: none;
  }

  .opacity-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    flex-shrink: 0;
  }

  .opacity-slider {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--ui-border);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .opacity-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--ui-text-primary);
    cursor: pointer;
  }

  .opacity-input {
    width: 3rem;
    padding: var(--ui-space-2) var(--ui-space-4);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-xs);
    font-family: var(--ui-font-mono);
    text-align: right;
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .opacity-input::-webkit-inner-spin-button,
  .opacity-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .opacity-unit {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
  }

  .dropdown-back {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    width: 100%;
    padding: var(--ui-space-8) var(--ui-space-10);
    background: none;
    border: none;
    border-bottom: 1px solid var(--ui-border-low);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: background var(--ui-transition-fast);
  }

  .dropdown-back:hover {
    background: var(--ui-hover);
  }

  .dropdown-back i {
    font-size: 0.5rem;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--ui-border-low);
  }

  .tab-btn {
    flex: 1;
    padding: var(--ui-space-4) var(--ui-space-4);
    background: none;
    border: 1px solid transparent;
    border-radius: 0;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    text-align: center;
  }

  .tab-btn:hover {
    color: var(--ui-text-secondary);
    background: var(--ui-hover);
  }

  .tab-btn.assigned {
    border-color: var(--ui-border);
  }

  .tab-btn.selected {
    color: var(--ui-text-primary);
    box-shadow: inset 0 -2px 0 var(--ui-text-accent);
    background: var(--ui-hover);
  }

  .family-list {
    display: flex;
    flex-direction: column;
    max-height: 20rem;
    overflow-y: auto;
  }

  .family-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    width: 100%;
    padding: var(--ui-space-6) var(--ui-space-10);
    background: none;
    border: none;
    cursor: pointer;
    transition: background var(--ui-transition-fast);
  }

  .family-item:hover {
    background: var(--ui-hover);
  }

  .family-item.active {
    background: var(--ui-hover-high);
    box-shadow: inset 3px 0 0 var(--ui-text-accent);
  }

  /* Family is filtered out by `familyFilter`. Greyed and unselectable so
     the picker scopes new picks to the variant's family while keeping the
     full palette visible (it isn't gone, it just isn't this gradient's
     business). Pointer cursor is suppressed to match :disabled. */
  .family-item.out-of-family {
    opacity: 0.32;
    cursor: not-allowed;
  }
  .family-item.out-of-family:hover {
    background: none;
  }

  .family-item.active .family-label {
    color: var(--ui-text-accent);
  }

  .family-swatches {
    display: flex;
    gap: 2px;
  }

  .mini-swatch {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 2px;
  }

  .none-swatch {
    width: 2.5rem;
    height: 0.75rem;
    border-radius: 2px;
    border: 1px solid var(--ui-border-low);
    position: relative;
    overflow: hidden;
  }

  .gradient-swatch {
    width: 2.5rem;
    height: 0.75rem;
    border-radius: 2px;
    border: 1px solid var(--ui-border-low);
  }

  .family-divider {
    margin-top: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-8);
    font-size: var(--ui-font-size-xs);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-tertiary);
    text-transform: uppercase;
    border-top: 1px solid var(--ui-border-low);
  }

  .none-swatch::after {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    background: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 3px,
      var(--ui-border-low) 3px,
      var(--ui-border-low) 4px
    );
  }

  .family-label {
    flex: 1;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
    text-align: left;
  }

  .family-arrow {
    font-size: 0.5rem;
    color: var(--ui-text-muted);
  }

  .step-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--ui-space-4);
    padding: var(--ui-space-8);
  }

  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-2);
    padding: var(--ui-space-4);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .step-item:hover {
    background: var(--ui-hover);
    border-color: var(--ui-border);
  }

  .step-item.active {
    border-color: var(--ui-text-accent);
    border-width: 2px;
    background: var(--ui-hover-high);
    padding: 3px;
  }

  .step-item.active .step-label {
    color: var(--ui-text-accent);
    font-weight: var(--ui-font-weight-semibold);
  }

  .step-swatch {
    width: 2rem;
    height: 1.5rem;
    border-radius: var(--ui-radius-sm);
    border: 1px solid var(--ui-border-low);
  }

  .step-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
  }

  /* Inline detail row, sibling of the UITokenSelector inside the parent
     token-row's 3-col subgrid. Lands in cols 2-3 of row 2, directly under
     the swatch trigger — same column anchoring the value/contexts strip
     uses, so the orientation block reads as a continuation of the row. */
  .palette-detail-row {
    grid-column: 2 / -1;
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding-top: var(--ui-space-4);
    min-width: 0;
  }

  .detail-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    flex-shrink: 0;
  }

  .orientation-reset {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-muted);
    font-size: 0.625rem;
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    flex-shrink: 0;
  }

  .orientation-reset.active {
    color: var(--ui-link-broken, var(--ui-text-secondary));
    border-color: var(--ui-border-low);
  }

  .orientation-reset:hover:not(:disabled) {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .orientation-reset:disabled {
    cursor: default;
    opacity: 0.4;
  }

  .orientation-body {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    flex: 1;
    min-width: 0;
  }

  .dir-grid {
    display: grid;
    grid-template-columns: repeat(3, 1.25rem);
    grid-template-rows: repeat(3, 1.25rem);
    gap: 2px;
    flex-shrink: 0;
  }

  .dir-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: 0.875rem;
    line-height: 1;
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .dir-btn:hover {
    background: var(--ui-hover);
    border-color: var(--ui-border);
    color: var(--ui-text-primary);
  }

  .dir-btn.active {
    background: var(--ui-hover-high);
    border-color: var(--ui-text-accent);
    color: var(--ui-text-accent);
  }

  .angle-input-wrap {
    display: flex;
    align-items: center;
    gap: var(--ui-space-2);
  }

  .angle-input {
    width: 3rem;
    padding: var(--ui-space-2) var(--ui-space-4);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-xs);
    font-family: var(--ui-font-mono);
    text-align: right;
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .angle-input::-webkit-inner-spin-button,
  .angle-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .angle-unit {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
  }
</style>
