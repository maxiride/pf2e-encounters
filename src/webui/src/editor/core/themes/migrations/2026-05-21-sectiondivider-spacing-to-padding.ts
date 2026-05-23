import type { Migration } from './index';

/**
 * Component-config migration (2026-05-21, sectiondivider only):
 * the container `*-spacing` token is renamed back to `*-padding` so it can
 * use the editor's splittable padding selector (per-side control). The new
 * editor also adds per-element padding tokens (title / description / eyebrow),
 * but those have no v9 predecessor — they simply start unset.
 */
export const componentMigration_2026_05_21_sectiondividerSpacingToPadding: Migration = {
  id: '2026-05-21-sectiondivider-spacing-to-padding',
  fromVersion: 9,
  toVersion: 10,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'sectiondivider') return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      const renamed = key.replace(/-spacing$/, '-padding');
      out[renamed] = value;
    }
    return out;
  },
};
