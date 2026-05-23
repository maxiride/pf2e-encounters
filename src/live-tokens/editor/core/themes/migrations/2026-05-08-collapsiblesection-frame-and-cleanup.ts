import type { Migration } from './index';

/**
 * Component-config migration (2026-05-08, collapsiblesection only):
 * variant chrome was reorganised so each variant only owns the tokens it can
 * actually paint. Three changes:
 *
 * 1. Container's outer chrome moved into a single `frame` group. The old
 *    default-state border / border-width / radius drove header chrome at v3;
 *    they now drive the always-on frame instead. We copy those values across
 *    so users keep their tuned border / radius. Surface is also copied so the
 *    box's background reads identically — the header strip can still be tinted
 *    on hover via the surviving default-surface.
 *
 * 2. Per-state border tokens that no longer paint anything are dropped:
 *    - chromeless border / border-width / radius for every state
 *    - container hover/active border / border-width / radius
 *    - divider radius for every state (divider keeps border / border-width
 *      since they paint the bottom rule per state)
 *
 * 3. The expanded panel only carries padding (chromeless/divider) or
 *    surface + padding (container). Drop the rest.
 */
const PFX = '--collapsiblesection-';

export const componentMigration_2026_05_08_collapsiblesectionFrameAndCleanup: Migration = {
  id: '2026-05-08-collapsiblesection-frame-and-cleanup',
  fromVersion: 3,
  toVersion: 4,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'collapsiblesection') return { ...rawVars };
    const out: Record<string, string> = {};

    // First pass: seed container-frame-* from container-default-* so user
    // values for the (former-header, now-frame) chrome are preserved.
    for (const prop of ['surface', 'border', 'border-width', 'radius'] as const) {
      const src = `${PFX}container-default-${prop}`;
      if (src in rawVars) {
        out[`${PFX}container-frame-${prop}`] = rawVars[src];
      }
    }

    for (const [key, value] of Object.entries(rawVars)) {
      // Drop chromeless per-state border / border-width / radius (no chrome).
      if (/^--collapsiblesection-chromeless-(default|hover|active)-(border|border-width|radius)$/.test(key)) continue;

      // Drop container hover/active border / border-width / radius (frame owns these now).
      if (/^--collapsiblesection-container-(hover|active)-(border|border-width|radius)$/.test(key)) continue;

      // Drop container default-state border / border-width / radius (already
      // copied above into frame-*; the header strip no longer paints them).
      if (/^--collapsiblesection-container-default-(border|border-width|radius)$/.test(key)) continue;

      // Drop divider per-state radius (divider has no rounded corners).
      if (/^--collapsiblesection-divider-(default|hover|active)-radius$/.test(key)) continue;

      // Drop expanded border / border-width / radius for every variant.
      if (/^--collapsiblesection-(chromeless|divider|container)-expanded-(border|border-width|radius)$/.test(key)) continue;

      // Drop expanded surface for chromeless / divider (only container keeps it).
      if (/^--collapsiblesection-(chromeless|divider)-expanded-surface$/.test(key)) continue;

      if (!(key in out)) out[key] = value;
    }
    return out;
  },
};
