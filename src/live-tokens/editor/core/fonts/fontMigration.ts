import type { FontFamily, FontSource, FontStack, Theme } from '../themes/themeTypes';
import frauncesRomanLatin from '../../../system/styles/fonts/Fraunces/Fraunces-roman-latin.woff2?url';
import frauncesItalicLatin from '../../../system/styles/fonts/Fraunces/Fraunces-italic-latin.woff2?url';
import manropeLatin from '../../../system/styles/fonts/Manrope/Manrope-latin.woff2?url';

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function familyId(sourceId: string, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${sourceId}:${slug}`;
}

function fam(sourceId: string, name: string, cssName?: string, weights?: number[]): FontFamily {
  return {
    id: familyId(sourceId, name),
    name,
    cssName: cssName ?? `"${name}"`,
    ...(weights ? { weights } : {}),
  };
}

/**
 * Build the default fontSources that match the hand-written src/styles/fonts.css.
 * Used when a theme has no fontSources yet.
 */
export function defaultFontSources(): FontSource[] {
  const typekitId = 'src_typekit_jes8oow';
  const frauncesId = 'src_fraunces_local';
  const manropeId = 'src_manrope_local';

  return [
    {
      id: typekitId,
      kind: 'typekit',
      url: 'https://use.typekit.net/jes8oow.css',
      label: 'Adobe Typekit',
      families: [
        fam(typekitId, 'fira-code', '"fira-code"'),
      ],
    },
    {
      id: frauncesId,
      kind: 'font-face',
      cssText: `@font-face {\n  font-family: "Fraunces";\n  src: url('${frauncesRomanLatin}') format('woff2');\n  font-weight: 100 900;\n  font-style: normal;\n  font-display: swap;\n}\n@font-face {\n  font-family: "Fraunces";\n  src: url('${frauncesItalicLatin}') format('woff2');\n  font-weight: 100 900;\n  font-style: italic;\n  font-display: swap;\n}`,
      label: 'Local',
      families: [
        fam(frauncesId, 'Fraunces', '"Fraunces"', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
      ],
    },
    {
      id: manropeId,
      kind: 'font-face',
      cssText: `@font-face {\n  font-family: "Manrope";\n  src: url('${manropeLatin}') format('woff2');\n  font-weight: 200 800;\n  font-style: normal;\n  font-display: swap;\n}`,
      label: 'Local',
      families: [
        fam(manropeId, 'Manrope', '"Manrope"', [200, 300, 400, 500, 600, 700, 800]),
      ],
    },
  ];
}

/**
 * Build the default fontStacks matching the previous hard-coded display in
 * VariablesTab.svelte plus tokens.css. Each stack references families from
 * defaultFontSources() by id.
 */
export function defaultFontStacks(sources: FontSource[]): FontStack[] {
  const byName = new Map<string, string>();
  for (const src of sources) {
    for (const f of src.families) byName.set(f.name.toLowerCase(), f.id);
  }
  const p = (name: string): { kind: 'project'; familyId: string } | null => {
    const id = byName.get(name.toLowerCase());
    return id ? { kind: 'project', familyId: id } : null;
  };
  const pick = (...names: string[]) => names.map(p).filter((x): x is { kind: 'project'; familyId: string } => !!x);

  return [
    {
      variable: '--font-display',
      slots: [
        ...pick('Fraunces'),
        { kind: 'generic', value: 'serif' },
      ],
    },
    {
      variable: '--font-sans',
      slots: [
        ...pick('Manrope'),
        { kind: 'system', preset: 'system-ui-sans' },
        { kind: 'generic', value: 'sans-serif' },
      ],
    },
    {
      variable: '--font-serif',
      slots: [
        ...pick('Fraunces'),
        { kind: 'generic', value: 'serif' },
      ],
    },
    {
      variable: '--font-mono',
      slots: [
        ...pick('fira-code'),
        { kind: 'system', preset: 'system-ui-mono' },
        { kind: 'generic', value: 'monospace' },
      ],
    },
  ];
}

/**
 * Ensure the loaded Theme has fontSources and fontStacks. Mutates in place
 * only when missing; safe to call on already-migrated themes. Also strips any
 * stale --font-* entries from cssVariables since those are now derived.
 */
export function migrateThemeFonts(theme: Theme): { migrated: boolean } {
  let migrated = false;
  if (!theme.fontSources || theme.fontSources.length === 0) {
    theme.fontSources = defaultFontSources();
    migrated = true;
  }
  if (!theme.fontStacks || theme.fontStacks.length === 0) {
    theme.fontStacks = defaultFontStacks(theme.fontSources);
    migrated = true;
  }
  if (theme.cssVariables) {
    for (const key of ['--font-display', '--font-sans', '--font-serif', '--font-mono']) {
      if (key in theme.cssVariables) {
        delete theme.cssVariables[key];
        migrated = true;
      }
    }
  }
  return { migrated };
}

export { makeId };
