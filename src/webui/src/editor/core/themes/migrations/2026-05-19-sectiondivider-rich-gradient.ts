import type { Migration } from './index';

/**
 * Component-config migration (2026-05-19, sectiondivider only):
 * the per-variant gradient was 7 flat tokens (angle + 3× (color + position)).
 * It now lives as a single structured alias at `--sectiondivider-{v}-gradient`,
 * carrying `{type, angle, stops[]}` inline on the component slice.
 *
 * The structured value is synthesized *before* this migration runs — see
 * `synthesizeSectionDividerGradients` in `editorStore.ts`. The synthesizer
 * walks the legacy 7-token shape and emits a `kind: 'gradient'` alias into
 * the load path's object subset, where it survives this stripping pass and
 * lands in the in-memory slice.
 *
 * This migration's only job is to delete the now-redundant flat tokens
 * from the disk-shape string subset so a subsequent save round-trips to
 * the new format.
 */
const FLAT_RE = /^--sectiondivider-(canvas|neutral|alternate|primary|accent|special)-gradient-(angle|stop-[123]-(color|position))$/;

export const componentMigration_2026_05_19_sectiondividerRichGradient: Migration = {
  id: '2026-05-19-sectiondivider-rich-gradient',
  fromVersion: 7,
  toVersion: 8,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'sectiondivider') return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      if (FLAT_RE.test(key)) continue;
      out[key] = value;
    }
    return out;
  },
};
