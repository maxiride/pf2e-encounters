import type { Migration } from './index';

/**
 * 2026-05-13: rename the `primary` color family to `brand`.
 *
 * The word "primary" was overloaded — both a color-family slot (alongside
 * info/success/danger/etc.) AND the top of the neutral text-emphasis ramp
 * (`--text-primary` / `--text-secondary` / `--text-tertiary`). Tokens like
 * `--text-primary-color` only existed because `--text-primary` was already
 * taken by neutral. Renaming the family to `brand` dissolves the collision:
 *
 *   --color-primary-{step}    → --color-brand-{step}
 *   --surface-primary[-step]  → --surface-brand[-step]
 *   --border-primary[-step]   → --border-brand[-step]
 *   --text-primary-color      → --text-brand
 *   --text-primary-{step}     → --text-brand-{step}   (step in secondary|tertiary|muted|disabled)
 *
 * The neutral text ramp (`--text-primary`, `--text-secondary`, …) is **left
 * untouched** — it's a different namespace that just happens to share the
 * word. The match list below enumerates the brand-family names explicitly so
 * a substring-on-`primary` mistake can't clobber neutral text or unrelated
 * tokens like `--button-primary-*` (component variant, not family).
 */

const PALETTE_STEPS = ['100','200','300','400','500','600','700','800','850','900','950'] as const;
const SURFACE_SUFFIXES = ['lowest','lower','low','high','higher','highest'] as const;
const BORDER_SUFFIXES = ['faint','subtle','medium','strong'] as const;
const TEXT_SUFFIXES = ['secondary','tertiary','muted','disabled'] as const;

const RENAME_MAP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const step of PALETTE_STEPS) m[`--color-primary-${step}`] = `--color-brand-${step}`;
  m['--surface-primary'] = '--surface-brand';
  for (const suf of SURFACE_SUFFIXES) m[`--surface-primary-${suf}`] = `--surface-brand-${suf}`;
  m['--border-primary'] = '--border-brand';
  for (const suf of BORDER_SUFFIXES) m[`--border-primary-${suf}`] = `--border-brand-${suf}`;
  m['--text-primary-color'] = '--text-brand';
  for (const suf of TEXT_SUFFIXES) m[`--text-primary-${suf}`] = `--text-brand-${suf}`;
  return m;
})();

function renameToken(name: string): string {
  return RENAME_MAP[name] ?? name;
}

/** Rewrite keys only — used for theme cssVariables (values are hex). */
function renameKeys(rawVars: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawVars)) {
    out[renameToken(k)] = v;
  }
  return out;
}

/** Rewrite both keys and values — used for component-config aliases. */
function renameKeysAndValues(rawVars: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawVars)) {
    out[renameToken(k)] = renameToken(v);
  }
  return out;
}

export const themeMigration_2026_05_13_primaryToBrand: Migration = {
  id: '2026-05-13-primary-to-brand-theme',
  fromVersion: 1,
  toVersion: 2,
  appliesTo: 'theme',
  apply: renameKeys,
};

export const componentMigration_2026_05_13_primaryToBrand: Migration = {
  id: '2026-05-13-primary-to-brand-component',
  fromVersion: 5,
  toVersion: 6,
  appliesTo: 'component-config',
  apply: renameKeysAndValues,
};

/**
 * Helper for loadFromFile: rename `theme.editorConfigs.Primary` → `Brand`.
 * Lives here (with the rest of the rename) instead of in the migration
 * framework because the framework's contract is `Record<string, string>` —
 * editorConfigs is a structured palette-config map and can't pass through it.
 */
export function renamePrimaryPaletteKey<T>(editorConfigs: Record<string, T>): Record<string, T> {
  if (!('Primary' in editorConfigs) || 'Brand' in editorConfigs) return editorConfigs;
  const { Primary, ...rest } = editorConfigs;
  return { ...rest, Brand: Primary };
}
