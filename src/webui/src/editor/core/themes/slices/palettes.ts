/**
 * Palettes slice — each PaletteEditor instance is keyed by `label`
 * (e.g. "Neutral", "Primary"). The store owns the full `PaletteConfig` for
 * each label; CSS-var emission is still done by `paletteDerivation`
 * (palette derivation involves OKLCH + bezier curves) at render time.
 */
import type { PaletteConfig } from '../themeTypes';
import { store, mutate, persist } from '../../store/editorCore';

export function setPaletteConfig(label: string, config: PaletteConfig): void {
  mutate(`update palette ${label}`, (s) => {
    s.palettes[label] = config;
  });
}

/**
 * Server-boot path: populate all palettes at once without a history entry.
 * Mirrors `seedFontsFromTheme`.
 */
export function seedPalettesFromTheme(palettes: Record<string, PaletteConfig>): void {
  store.update((s) => {
    s.palettes = structuredClone(palettes);
    return s;
  });
  persist();
}
