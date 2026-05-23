import type { Migration } from './index';

/**
 * Theme migration (2026-04-24): rename legacy CSS-var keys to their
 * current names, drop a few orphaned tokens, and convert the entire
 * `-bg`/`-bg-*` family to the `-canvas` namespace.
 *
 * Old themes saved before the rename keep loading; the migrated bag flows
 * through the normal domain routing.
 */
const LEGACY_KEY_RENAMES: Record<string, string | null> = {
  '--empty': '--page-bg',
  '--empty-attachment': '--page-bg-attachment',
  // Orphan exports dropped from tokens.css; no new home — silently discard.
  '--border-neutral': null,
  // Shadow cleanup: these five tokens were removed (low/zero consumers,
  // aesthetic drift). Dialog migrated onto --shadow-2xl; focus rings moved
  // to their own --ring-focus-* namespace, which themes don't carry by
  // default — tokens.css provides the canonical values.
  '--shadow-app': null,
  '--shadow-card': null,
  '--shadow-overlay': null,
  '--shadow-focus': null,
  '--shadow-glow-green': null,
};

// bg → canvas: rename every key in the --color-bg-*, --surface-bg(-*)?,
// --border-bg(-*)?, --text-bg(-*)? families to their canvas equivalents.
// Pattern match (rather than static entries in LEGACY_KEY_RENAMES) because
// the families carry ~28 keys between them and listing each is noise.
const BG_TO_CANVAS_PREFIXES = ['--color-bg-', '--surface-bg', '--border-bg', '--text-bg'] as const;

function migrateBgToCanvas(rawVars: Record<string, string>): void {
  for (const oldKey of Object.keys(rawVars)) {
    for (const prefix of BG_TO_CANVAS_PREFIXES) {
      if (!oldKey.startsWith(prefix)) continue;
      // Only the -bg boundary should swap; don't accidentally rename
      // --text-bgthing or similar.
      const suffix = oldKey.slice(prefix.length);
      if (suffix && !suffix.startsWith('-')) continue;
      const newKey = prefix.replace('-bg', '-canvas') + suffix;
      if (newKey === oldKey) continue;
      const value = rawVars[oldKey];
      delete rawVars[oldKey];
      if (!(newKey in rawVars)) rawVars[newKey] = value;
      break;
    }
  }
}

function migrateLegacyKeys(rawVars: Record<string, string>): void {
  for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_RENAMES)) {
    if (!(oldKey in rawVars)) continue;
    const value = rawVars[oldKey];
    delete rawVars[oldKey];
    if (newKey && !(newKey in rawVars)) rawVars[newKey] = value;
  }
  migrateBgToCanvas(rawVars);
}

export const themeMigration_2026_04_24_legacyKeysAndBgToCanvas: Migration = {
  id: '2026-04-24-legacy-keys-and-bg-to-canvas',
  fromVersion: 0,
  toVersion: 1,
  appliesTo: 'theme',
  apply(rawVars) {
    const out = { ...rawVars };
    migrateLegacyKeys(out);
    return out;
  },
};
