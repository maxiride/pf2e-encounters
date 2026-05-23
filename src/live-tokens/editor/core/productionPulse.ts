import { writable } from 'svelte/store';
import type { ProductionInfo } from './themes/themeService';
import type { ManifestMeta } from './themes/themeTypes';

/**
 * Monotonic counter that ticks every time a production pointer flips —
 * theme production or a component's production. UI surfaces that need to
 * react to a sibling Adopt subscribe to this so they refresh without
 * per-pair wiring.
 *
 * Bumpers: `ThemeFileManager.handleApplyToProduction`,
 * `ComponentFileManager.handleUpdateProduction`. Anyone setting
 * `_production.json` should bump.
 */
export const productionRevision = writable(0);

export function bumpProductionRevision(): void {
  productionRevision.update((n) => n + 1);
}

/**
 * Cached production-state stores. The Theme and Manifest file managers live in
 * the sidebar footer, swapping in/out of the DOM as the user toggles between
 * the tokens and components views. Keeping the last-known production state in
 * module-level Svelte stores means a remount renders the correct Adopt-button
 * state on the first frame instead of flashing through "not in sync" while a
 * fresh fetch resolves.
 */
export const themeProductionInfo = writable<ProductionInfo | null>(null);

/**
 * Last-known active manifest meta. Bumped by ManifestFileManager whenever the
 * active manifest changes (load, save, save-as) and whenever a theme or
 * component Adopt completes (the server patches the active manifest as a
 * side-effect, so consumers re-read it on `productionRevision` ticks).
 */
export const activeManifest = writable<ManifestMeta | null>(null);
