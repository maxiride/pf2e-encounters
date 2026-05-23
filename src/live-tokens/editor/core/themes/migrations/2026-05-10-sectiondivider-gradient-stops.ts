import type { Migration } from './index';

/**
 * Component-config migration (2026-05-10, sectiondivider only):
 * the per-variant gradient was 4 fixed-position color stops with a hard-coded
 * 135deg angle. It now exposes angle + 3× (color + position). User-tuned colors
 * from the old stops are preserved (1 → 1-color, 2 → 2-color, 4 → 3-color);
 * stop 3's color is dropped because the new shape only has three slots.
 * Angle defaults to 135deg and positions to 0%/50%/100% — the same effect the
 * old hard-coded `linear-gradient(135deg, ... 0%, ... 30%, ... 60%, ... 100%)`
 * approximated.
 */
const PFX = '--sectiondivider-';
const VARIANTS = ['canvas', 'neutral', 'alternate', 'primary', 'accent', 'special'] as const;
const OLD_STOP_RE = /^--sectiondivider-(canvas|neutral|alternate|primary|accent|special)-gradient-stop-\d+$/;

export const componentMigration_2026_05_10_sectiondividerGradientStops: Migration = {
  id: '2026-05-10-sectiondivider-gradient-stops',
  fromVersion: 4,
  toVersion: 5,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'sectiondivider') return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      if (OLD_STOP_RE.test(key)) continue;
      out[key] = value;
    }
    // Idempotent: only fill in keys that the file doesn't already carry.
    // `default.json` is unstamped (v0) and re-runs every load, so seeding
    // unconditionally would clobber user-tuned values on configs already on
    // the new shape.
    const setIfMissing = (key: string, fallback: string) => {
      if (!(key in out)) out[key] = fallback;
    };
    for (const v of VARIANTS) {
      const old1 = rawVars[`${PFX}${v}-gradient-stop-1`];
      const old2 = rawVars[`${PFX}${v}-gradient-stop-2`];
      const old4 = rawVars[`${PFX}${v}-gradient-stop-4`];
      setIfMissing(`${PFX}${v}-gradient-angle`, '--gradient-angle-diagonal');
      setIfMissing(`${PFX}${v}-gradient-stop-1-color`, old1 ?? `--surface-${v}-highest`);
      setIfMissing(`${PFX}${v}-gradient-stop-1-position`, '--gradient-stop-start');
      setIfMissing(`${PFX}${v}-gradient-stop-2-color`, old2 ?? `--surface-${v}-higher`);
      setIfMissing(`${PFX}${v}-gradient-stop-2-position`, '--gradient-stop-mid');
      setIfMissing(`${PFX}${v}-gradient-stop-3-color`, old4 ?? `--surface-${v}`);
      setIfMissing(`${PFX}${v}-gradient-stop-3-position`, '--gradient-stop-end');
    }
    return out;
  },
};
