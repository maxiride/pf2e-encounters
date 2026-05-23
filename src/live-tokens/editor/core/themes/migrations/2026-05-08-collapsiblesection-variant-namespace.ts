import type { Migration } from './index';

/**
 * Component-config migration (2026-05-08, collapsiblesection only): the
 * component grew Cloudscape-style variants (chromeless / divider / container).
 * Existing tokens were unscoped — `--collapsiblesection-{state}-*` and
 * `--collapsiblesection-expanded-*`. They map onto the new `container` variant
 * since that preserves the previous chromed appearance; chromeless and divider
 * fall through to the component's CSS defaults.
 */
const PREFIX = '--collapsiblesection-';
const STATE_NAMES = new Set(['default', 'hover', 'active', 'expanded']);

export const componentMigration_2026_05_08_collapsiblesectionVariantNamespace: Migration = {
  id: '2026-05-08-collapsiblesection-variant-namespace',
  fromVersion: 2,
  toVersion: 3,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'collapsiblesection') return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [oldKey, value] of Object.entries(rawVars)) {
      let key = oldKey;
      if (key.startsWith(PREFIX)) {
        const tail = key.slice(PREFIX.length);
        const firstSegment = tail.split('-', 1)[0];
        if (STATE_NAMES.has(firstSegment)) {
          key = `${PREFIX}container-${tail}`;
        }
      }
      if (!(key in out)) out[key] = value;
    }
    return out;
  },
};
