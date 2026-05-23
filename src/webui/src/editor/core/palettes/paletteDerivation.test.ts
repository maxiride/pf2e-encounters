import { describe, expect, it } from 'vitest';
import {
  reconcilePalettesFromCssVars,
  DEFAULT_PALETTE_LIGHTNESS,
  DEFAULT_PALETTE_SATURATION,
  DEFAULT_GRAY_LIGHTNESS,
  DEFAULT_GRAY_SATURATION,
  defaultScaleCurves,
} from './paletteDerivation';
import type { PaletteConfig } from '../themes/themeTypes';

// Mirrors `defaultPaletteConfig()` in PaletteEditor.svelte. Keeps each test
// case explicit about which fields a palette starts with so the reconciler's
// behaviour is unambiguous.
function chromatic(baseColor: string, extra: Partial<PaletteConfig> = {}): PaletteConfig {
  return {
    baseColor,
    tintHue: 0,
    tintChroma: 0.04,
    lightnessCurve: DEFAULT_PALETTE_LIGHTNESS(),
    saturationCurve: DEFAULT_PALETTE_SATURATION(),
    grayLightnessCurve: DEFAULT_GRAY_LIGHTNESS(),
    graySaturationCurve: DEFAULT_GRAY_SATURATION(),
    scaleCurves: {
      Surfaces: { lightness: defaultScaleCurves.Surfaces.lightness(), saturation: defaultScaleCurves.Surfaces.saturation() },
      Borders:  { lightness: defaultScaleCurves.Borders.lightness(),  saturation: defaultScaleCurves.Borders.saturation()  },
      Text:     { lightness: defaultScaleCurves.Text.lightness(),     saturation: defaultScaleCurves.Text.saturation()     },
    },
    curveOffset: {},
    overrides: {},
    snappedScales: [],
    anchorToBase: true,
    ...extra,
  };
}

describe('reconcilePalettesFromCssVars', () => {
  it('snaps baseColor when _imported is true and an anchor is present', () => {
    const palettes = { Brand: chromatic('#fb2898', { _imported: true }) };
    const { palettes: next, snapped } = reconcilePalettesFromCssVars(palettes, {
      '--color-brand-500': '#bd6a08',
    });
    expect(next.Brand.baseColor).toBe('#bd6a08');
    expect(next.Brand._imported).toBe(false);
    expect(snapped.has('Brand')).toBe(true);
  });

  it('leaves baseColor untouched when _imported is false even if anchor diverges', () => {
    // This is the default.json case: typed state was authored in the editor;
    // cssVariables is stale legacy data. Snap-on-divergence would have flipped
    // teal accent → olive. See temp/manifest-robustness-plan.md §9.
    const palettes = { Accent: chromatic('#008582') };
    const { palettes: next, snapped } = reconcilePalettesFromCssVars(palettes, {
      '--color-accent-500': '#9d7f00',
    });
    expect(next.Accent.baseColor).toBe('#008582');
    expect(snapped.size).toBe(0);
  });

  it('derives tintHue + tintChroma from the anchor for gray-mode palettes', () => {
    // Gray ramps use tintHue + tintChroma, not baseColor, so the snap pulls
    // OKLCH from the imported hex rather than writing baseColor.
    const before = chromatic('#808080', { _imported: true, tintHue: 240, tintChroma: 0.067 });
    const palettes = { Neutral: before };
    const { palettes: next, snapped } = reconcilePalettesFromCssVars(palettes, {
      '--color-neutral-500': '#7d7570',
    });
    expect(next.Neutral.tintHue).not.toBe(240);
    expect(next.Neutral.tintChroma).not.toBe(0.067);
    expect(next.Neutral._imported).toBe(false);
    expect(snapped.has('Neutral')).toBe(true);
  });

  it('clears _imported even when no anchor is present (flag has nothing to do)', () => {
    const palettes = { Brand: chromatic('#fb2898', { _imported: true }) };
    const { palettes: next } = reconcilePalettesFromCssVars(palettes, {});
    expect(next.Brand.baseColor).toBe('#fb2898');
    expect(next.Brand._imported).toBe(false);
  });

  it('reports every palette-derived key in `consumed` regardless of flag', () => {
    // Even unflagged palettes: the renderer overlays palettesToVars, so any
    // palette-derived value in cssVariables is dead data — strip it.
    const palettes = { Accent: chromatic('#008582') };
    const { consumed } = reconcilePalettesFromCssVars(palettes, {});
    expect(consumed.has('--color-accent-500')).toBe(true);
    expect(consumed.has('--surface-accent')).toBe(true);
    expect(consumed.has('--text-accent')).toBe(true);
  });

  it('is idempotent: second call with the same input is a no-op', () => {
    const palettes = { Brand: chromatic('#fb2898', { _imported: true }) };
    const cssVars = { '--color-brand-500': '#bd6a08' };
    const first = reconcilePalettesFromCssVars(palettes, cssVars);
    // After the first call cleared _imported, the second call has nothing
    // to snap to. Equal output ↔ idempotent.
    const second = reconcilePalettesFromCssVars(first.palettes, cssVars);
    expect(second.palettes.Brand.baseColor).toBe(first.palettes.Brand.baseColor);
    expect(second.palettes.Brand._imported).toBe(false);
    expect(second.snapped.size).toBe(0);
  });
});
