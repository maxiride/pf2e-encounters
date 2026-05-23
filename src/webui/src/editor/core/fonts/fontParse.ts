import type { FontFamily, FontSource, FontSourceKind } from '../themes/themeTypes';

export interface ParsedFamily {
  name: string;
  weights?: number[];
  italics?: boolean;
}

export interface ParsedSource {
  kind: FontSourceKind;
  families: ParsedFamily[];
}

/**
 * Parse a Google Fonts CSS2 URL (`?family=Inter:wght@400;700&family=Roboto`)
 * into the families and weights it declares. Pure; no network.
 */
export function parseGoogleFontsUrl(url: string): ParsedFamily[] | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (!u.hostname.includes('fonts.googleapis.com')) return null;
  const familyParams = u.searchParams.getAll('family');
  if (familyParams.length === 0) return null;

  return familyParams.map((raw) => {
    const [rawName, spec] = raw.split(':');
    const name = decodeURIComponent(rawName).replace(/\+/g, ' ');
    const parsed: ParsedFamily = { name };

    if (spec) {
      const axisMatch = spec.match(/(?:ital,)?wght@([^&]+)/);
      const italics = spec.startsWith('ital,');
      if (italics) parsed.italics = true;
      if (axisMatch) {
        const tokens = axisMatch[1].split(';');
        const weights = new Set<number>();
        for (const tok of tokens) {
          const parts = tok.split(',');
          const wghtStr = parts.length === 2 ? parts[1] : parts[0];
          if (wghtStr.includes('..')) {
            const [lo, hi] = wghtStr.split('..').map((n) => parseInt(n, 10));
            if (!isNaN(lo) && !isNaN(hi)) {
              for (let w = lo; w <= hi; w += 100) weights.add(w);
            }
          } else {
            const w = parseInt(wghtStr, 10);
            if (!isNaN(w)) weights.add(w);
          }
        }
        if (weights.size > 0) parsed.weights = [...weights].sort((a, b) => a - b);
      }
    }
    return parsed;
  });
}

/**
 * Regex-extract family name + weight from arbitrary CSS text containing
 * @font-face rules. Used for pasted raw @font-face blocks and for
 * fetch-and-parse of opaque URLs (Typekit, generic).
 */
export function parseFontFaceText(css: string): ParsedFamily[] {
  const rules = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)];
  const byName = new Map<string, { weights: Set<number>; italics: boolean }>();
  for (const [, body] of rules) {
    const nameMatch = body.match(/font-family\s*:\s*([^;]+);/i);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
    const weightMatch = body.match(/font-weight\s*:\s*([^;]+);/i);
    const styleMatch = body.match(/font-style\s*:\s*([^;]+);/i);

    const entry = byName.get(name) ?? { weights: new Set<number>(), italics: false };
    if (weightMatch) {
      const val = weightMatch[1].trim();
      const rangeParts = val.split(/\s+/).map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
      if (rangeParts.length === 2) {
        const [lo, hi] = rangeParts;
        for (let w = lo; w <= hi; w += 100) entry.weights.add(w);
      } else if (rangeParts.length === 1) {
        entry.weights.add(rangeParts[0]);
      }
    }
    if (styleMatch && /italic|oblique/i.test(styleMatch[1])) entry.italics = true;
    byName.set(name, entry);
  }
  return [...byName.entries()].map(([name, e]) => ({
    name,
    ...(e.weights.size > 0 ? { weights: [...e.weights].sort((a, b) => a - b) } : {}),
    ...(e.italics ? { italics: true } : {}),
  }));
}

/**
 * Fetch a CSS URL and extract its @font-face families. Used for Typekit kits
 * and generic CSS URLs whose families aren't encoded in the URL itself.
 * Returns null if the fetch fails (CORS or network).
 */
export async function fetchAndParseCss(url: string): Promise<ParsedFamily[] | null> {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const text = await res.text();
    const families = parseFontFaceText(text);
    return families.length > 0 ? families : null;
  } catch {
    return null;
  }
}

export function guessKindFromUrl(url: string): FontSourceKind | null {
  try {
    const host = new URL(url).hostname;
    if (host.includes('fonts.googleapis.com')) return 'google';
    if (host.includes('use.typekit.net') || host.includes('typekit.com')) return 'typekit';
    return 'css-url';
  } catch {
    return null;
  }
}

export function familiesToFontFamilies(sourceId: string, parsed: ParsedFamily[]): FontFamily[] {
  return parsed.map((p) => ({
    id: `${sourceId}:${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    name: p.name,
    cssName: `"${p.name}"`,
    ...(p.weights ? { weights: p.weights } : {}),
    ...(p.italics ? { italics: p.italics } : {}),
  }));
}

/**
 * Given a URL, return a best-effort parsed set of families. For Google URLs,
 * families are derivable from the querystring directly. For other URLs we
 * attempt to fetch-and-parse the CSS. `null` means "unknown — ask the user
 * to name the families manually."
 */
export async function discoverFamiliesFromUrl(url: string): Promise<ParsedFamily[] | null> {
  const kind = guessKindFromUrl(url);
  if (!kind) return null;
  if (kind === 'google') {
    const direct = parseGoogleFontsUrl(url);
    if (direct && direct.length > 0) return direct;
  }
  return fetchAndParseCss(url);
}

export function buildSourceFromUrl(url: string, pickedFamilies: ParsedFamily[]): FontSource {
  const kind = guessKindFromUrl(url) ?? 'css-url';
  const id = `src_${kind}_${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    kind,
    url,
    label: kind === 'google' ? 'Google Fonts' : kind === 'typekit' ? 'Adobe Typekit' : 'CSS URL',
    families: familiesToFontFamilies(id, pickedFamilies),
  };
}

export function buildSourceFromFontFaceText(css: string, pickedFamilies: ParsedFamily[]): FontSource {
  const id = `src_fontface_${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    kind: 'font-face',
    cssText: css,
    label: 'Local @font-face',
    families: familiesToFontFamilies(id, pickedFamilies),
  };
}
