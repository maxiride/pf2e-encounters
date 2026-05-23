import type { Migration } from './index';

/**
 * Component-config migration (2026-05-20, sectiondivider only):
 * the variant axis was reshaped from six color families →
 * three size presets (lg/md/sm). Each new variant owns its full token set
 * (typography, geometry, AND colors / background) so the editor can author
 * full visual presets per-variant without a separate color axis.
 *
 * Migration strategy: take **canvas** as the canonical family from the v8
 * file and seed all three new variants from its values. Customisations on
 * other v8 families (neutral, accent, primary, etc.) are dropped — the user
 * customises each new variant from the shared canvas baseline.
 *
 * Two inline suffix renames also land here:
 *   `*-title-border-width` → `*-title-outline-width`
 *   `*-title-stroke-color` → `*-title-outline-color`
 *   `*-padding`            → `*-spacing`
 *
 * The structured background payload moves through a companion rename in
 * `migrateComponentAliases` (editorStore.ts), since the runner only sees
 * string keys.
 */
const FAMILIES = ['canvas', 'neutral', 'alternate', 'primary', 'accent', 'special'] as const;
type Family = typeof FAMILIES[number];
const VARIANTS = ['lg', 'md', 'sm'] as const;

const SUFFIX_RENAMES: Array<[RegExp, string]> = [
  [/-title-border-width$/, '-title-outline-width'],
  [/-title-stroke-color$/, '-title-outline-color'],
  [/-padding$/, '-spacing'],
];

function renameKeySuffix(key: string): string {
  for (const [re, repl] of SUFFIX_RENAMES) {
    if (re.test(key)) return key.replace(re, repl);
  }
  return key;
}

function splitFamilyKey(key: string): { family: Family; suffix: string } | null {
  const m = key.match(/^--sectiondivider-(canvas|neutral|alternate|primary|accent|special)-(.+)$/);
  if (!m) return null;
  return { family: m[1] as Family, suffix: m[2] };
}

export const componentMigration_2026_05_20_sectiondividerSlimVariants: Migration = {
  id: '2026-05-20-sectiondivider-slim-variants',
  fromVersion: 8,
  toVersion: 9,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'sectiondivider') return { ...rawVars };
    const out: Record<string, string> = {};

    // Collect canvas's suffix → value mapping first; everything else gets
    // pruned. (Canvas wins; other families' customisations are discarded
    // because the new variants are size/preset-shaped, not color-shaped.)
    const canvasValues: Record<string, string> = {};

    for (const [rawKey, value] of Object.entries(rawVars)) {
      const key = renameKeySuffix(rawKey);
      const parts = splitFamilyKey(key);
      if (!parts) {
        // Non-family-prefixed key — pass through verbatim.
        out[key] = value;
        continue;
      }
      if (parts.family !== 'canvas') continue; // Drop non-canvas tokens
      canvasValues[parts.suffix] = value;
    }

    // Seed all three size variants from canvas's values.
    for (const suffix of Object.keys(canvasValues)) {
      for (const v of VARIANTS) {
        out[`--sectiondivider-${v}-${suffix}`] = canvasValues[suffix];
      }
    }

    return out;
  },
};
