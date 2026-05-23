import type { Migration } from './index';

/**
 * Component-config migration (2026-04-24): unabbreviate component prefixes
 * and apply the per-component suffix rewrites that landed alongside the
 * prefix rename.
 *
 * Prefix layer: `--segment-*` → `--segmentedcontrol-*`, etc. — undoes the
 * abbreviated namespaces that were used briefly before we standardised on
 * full component names.
 *
 * Suffix layer: progressbar's `-track-bg` → `-track-surface`, and
 * inlineeditactions' `-bg-hover` / `-bg` → `-hover-surface` / `-surface`.
 *
 * Whole-key rename: detailnav's only abbreviated token (`--detail-nav-bg`
 * → `--detailnav-surface`) is handled inline.
 */
const COMPONENT_PREFIX_RENAMES: Record<string, string> = {
  '--segment-': '--segmentedcontrol-',
  '--collapsible-': '--collapsiblesection-',
  '--progress-': '--progressbar-',
  '--section-divider-': '--sectiondivider-',
  '--radio-': '--radiobutton-',
  '--inline-edit-': '--inlineeditactions-',
};

const COMPONENT_SUFFIX_RENAMES: Record<string, Array<[string, string]>> = {
  progressbar: [['-track-bg', '-track-surface']],
  inlineeditactions: [
    ['-bg-hover', '-hover-surface'],
    ['-bg', '-surface'],
  ],
};

export const componentMigration_2026_04_24_prefixAndSuffixRenames: Migration = {
  id: '2026-04-24-component-prefix-and-suffix-renames',
  fromVersion: 0,
  toVersion: 1,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    const component = meta.component ?? '';
    const out: Record<string, string> = {};
    const suffixRules = COMPONENT_SUFFIX_RENAMES[component] ?? [];
    for (const [oldKey, value] of Object.entries(rawVars)) {
      let key = oldKey;
      // One-off whole-key rename (detailnav's only abbreviated token).
      if (key === '--detail-nav-bg') key = '--detailnav-surface';
      for (const [oldPrefix, newPrefix] of Object.entries(COMPONENT_PREFIX_RENAMES)) {
        if (key.startsWith(oldPrefix)) {
          key = newPrefix + key.slice(oldPrefix.length);
          break;
        }
      }
      for (const [oldSuffix, newSuffix] of suffixRules) {
        if (key.endsWith(oldSuffix)) {
          key = key.slice(0, -oldSuffix.length) + newSuffix;
          break;
        }
      }
      if (!(key in out)) out[key] = value;
    }
    return out;
  },
};
