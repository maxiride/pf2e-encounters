import type { Migration } from './index';

/**
 * Component-config migration (2026-05-22, sectiondivider only):
 * the per-variant *intrinsics* (align, hairline visibility + position, eyebrow
 * visibility + uppercase, description visibility) move from the `config`
 * bucket — where the editor preview consumed them as runtime props — into
 * the `aliases` bucket as cascading CSS variables. Live consumers can then
 * read them off `:root` via `var(...)`, closing the editor-to-consumer sync
 * gap the old config-bucket encoding had.
 *
 * Mapping per variant `v in (lg, md, sm)`:
 *   --sectiondivider-{v}-show-eyebrow          ('1' | '')              →  --sectiondivider-{v}-eyebrow-display          ('block' | 'none')
 *   --sectiondivider-{v}-show-description      ('1' | '')              →  --sectiondivider-{v}-description-display      ('flex'  | 'none')
 *   --sectiondivider-{v}-show-hairline + -hairline  (toggle + pos)     →  --sectiondivider-{v}-hairline                 ('none' | <position>)
 *   --sectiondivider-{v}-eyebrow-uppercase     ('1' | '')              →  --sectiondivider-{v}-eyebrow-text-transform   ('uppercase' | 'none')
 *   --sectiondivider-{v}-align                                         →  unchanged (value space is already CSS-keyword: 'start' | 'center')
 *   --sectiondivider-{v}-color-family                                  →  unchanged (still a config-bucket entry; drives editor's family swap)
 *
 * The hairline merge collapses two old keys (a boolean toggle + a position
 * enum) into one. Rules (matching the legacy `getShowHairline` reader):
 *   - `show-hairline` explicitly ''      → 'none'
 *   - `show-hairline` explicitly '1'     → existing position, or 'above-label' fallback
 *   - both undefined                     → emit nothing (default 'none' applies via CSS)
 *   - `show-hairline` unset but a real position exists → preserve the position
 *
 * The migration touches the unified bag produced by `migrateComponentAliases`
 * (which now pre-merges string-valued config entries). The post-migration
 * `splitAliasesAndConfig` step routes the new keys to `aliases` (since
 * `KNOWN_COMPONENT_CONFIG_KEYS` no longer contains them) while keeping
 * `--sectiondivider-{v}-color-family` in `config`.
 */
export const componentMigration_2026_05_22_sectiondividerIntrinsicsToCss: Migration = {
  id: '2026-05-22-sectiondivider-intrinsics-to-css',
  fromVersion: 10,
  toVersion: 11,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'sectiondivider') return { ...rawVars };
    const VARIANTS = ['lg', 'md', 'sm'] as const;
    const prefix = '--sectiondivider-';
    const dropped = new Set<string>();
    for (const v of VARIANTS) {
      dropped.add(`${prefix}${v}-show-eyebrow`);
      dropped.add(`${prefix}${v}-show-description`);
      dropped.add(`${prefix}${v}-show-hairline`);
      dropped.add(`${prefix}${v}-hairline`);
      dropped.add(`${prefix}${v}-eyebrow-uppercase`);
    }
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      if (dropped.has(key)) continue;
      out[key] = value;
    }
    for (const v of VARIANTS) {
      const showEyebrow = rawVars[`${prefix}${v}-show-eyebrow`];
      if (showEyebrow !== undefined) {
        out[`${prefix}${v}-eyebrow-display`] = showEyebrow === '1' ? 'block' : 'none';
      }
      const showDesc = rawVars[`${prefix}${v}-show-description`];
      if (showDesc !== undefined) {
        out[`${prefix}${v}-description-display`] = showDesc === '1' ? 'flex' : 'none';
      }
      const showHair = rawVars[`${prefix}${v}-show-hairline`];
      const oldHair = rawVars[`${prefix}${v}-hairline`];
      const oldHairIsPos = typeof oldHair === 'string' && oldHair !== '' && oldHair !== 'off';
      let newHair: string | undefined;
      if (showHair === '') newHair = 'none';
      else if (showHair === '1') newHair = oldHairIsPos ? oldHair : 'above-label';
      else if (oldHair !== undefined) newHair = oldHairIsPos ? oldHair : 'none';
      if (newHair !== undefined) {
        out[`${prefix}${v}-hairline`] = newHair;
      }
      const upper = rawVars[`${prefix}${v}-eyebrow-uppercase`];
      if (upper !== undefined) {
        out[`${prefix}${v}-eyebrow-text-transform`] = upper === '1' ? 'uppercase' : 'none';
      }
    }
    return out;
  },
};
