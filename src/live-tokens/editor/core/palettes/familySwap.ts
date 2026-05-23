/**
 * Family-aware token rewrites.
 *
 * Color tokens encode their palette family as a hyphen segment in the slug
 * (e.g. `--border-canvas-strong` → `canvas`, `--surface-accent-low` →
 * `accent`). Text tokens are special-cased: `--text-primary` carries no
 * family, `--text-{family}` and `--text-{family}-{step}` do, and `--text-{step}`
 * resolves to the neutral text scale.
 *
 * These helpers let editor flows (variant family swap, per-stop monochrome
 * snap) rewrite a token slug without re-implementing the parser each time.
 */

export const KNOWN_FAMILIES = [
  'neutral', 'alternate', 'canvas', 'brand',
  'accent', 'special', 'success', 'warning', 'info', 'danger',
] as const;

export type FamilyName = (typeof KNOWN_FAMILIES)[number];

export const TEXT_STEPS = ['primary', 'secondary', 'tertiary', 'muted', 'disabled'] as const;

export type TextStep = (typeof TEXT_STEPS)[number];

/** Parse a text-scale token name into family + step. Returns null for any
 *  non-`--text-*` slug or one whose parts don't resolve to a known step. */
export function parseTextToken(colorRef: string): { family: FamilyName; step: TextStep } | null {
  if (!colorRef.startsWith('--text-')) return null;
  const rest = colorRef.slice('--text-'.length);
  const parts = rest.split('-');
  if (parts.length === 1) {
    const p = parts[0];
    if ((TEXT_STEPS as readonly string[]).includes(p)) return { family: 'neutral', step: p as TextStep };
    if ((KNOWN_FAMILIES as readonly string[]).includes(p)) return { family: p as FamilyName, step: 'primary' };
    return null;
  }
  if (parts.length === 2) {
    const [fam, step] = parts;
    if (
      (KNOWN_FAMILIES as readonly string[]).includes(fam)
      && (TEXT_STEPS as readonly string[]).includes(step)
    ) {
      return { family: fam as FamilyName, step: step as TextStep };
    }
  }
  return null;
}

/** Inverse of parseTextToken — assemble a `--text-*` slug from family + step.
 *  `neutral` family flattens to `--text-{step}`; `primary` step on a named
 *  family flattens to `--text-{family}` (matches authoring conventions). */
export function buildTextToken(family: FamilyName | string, step: TextStep | string): string {
  if (family === 'neutral') return `--text-${step}`;
  return step === 'primary' ? `--text-${family}` : `--text-${family}-${step}`;
}

/** Pull the family marker out of a token slug, or null if none of the
 *  hyphen-delimited parts is a known family. */
export function detectFamily(colorRef: string): FamilyName | null {
  if (!colorRef.startsWith('--')) return null;
  const parts = colorRef.slice(2).split('-');
  for (const p of parts) {
    if ((KNOWN_FAMILIES as readonly string[]).includes(p)) return p as FamilyName;
  }
  return null;
}

/** Rewrite the family marker in a slug from `oldFamily` to `newFamily`.
 *  Returns the input unchanged when the slug doesn't reference `oldFamily`
 *  (so unrelated tokens, literals, and out-of-family stops fall through). */
export function swapTokenFamily(name: string, oldFamily: string, newFamily: string): string {
  if (!name.startsWith('--')) return name;
  const text = parseTextToken(name);
  if (text) {
    if (text.family !== oldFamily) return name;
    return buildTextToken(newFamily, text.step);
  }
  const parts = name.slice(2).split('-');
  const idx = parts.indexOf(oldFamily);
  if (idx < 0) return name;
  parts[idx] = newFamily;
  return '--' + parts.join('-');
}

/** Coerce a slug to the given target family. Unlike swapTokenFamily this
 *  doesn't need to know the source family — it autodetects, then rewrites.
 *  Returns the input unchanged if no family is present (e.g. literal colors,
 *  `transparent`, or a `--text-primary` neutral). */
export function snapTokenToFamily(name: string, targetFamily: string): string {
  if (!name.startsWith('--')) return name;
  const text = parseTextToken(name);
  if (text) {
    if (text.family === targetFamily) return name;
    return buildTextToken(targetFamily, text.step);
  }
  const fromFamily = detectFamily(name);
  if (!fromFamily || fromFamily === targetFamily) return name;
  return swapTokenFamily(name, fromFamily, targetFamily);
}
