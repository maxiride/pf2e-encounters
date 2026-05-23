/**
 * Aggregated CSS-var names owned by store domains. Consumers that scrape
 * the DOM (e.g. the save flow still pulling palette ramps emitted by
 * PaletteEditor) use this to drop domain-owned keys from their scraped bag
 * so the store stays the single source of truth.
 */
import { COLUMN_VAR_NAMES } from './columns';
import { OVERLAY_VAR_NAMES } from './overlays';
import { SHADOW_VAR_NAMES } from './shadows';

export const DOMAIN_VAR_NAMES: readonly string[] = [
  ...COLUMN_VAR_NAMES,
  ...OVERLAY_VAR_NAMES,
  ...SHADOW_VAR_NAMES,
];
