#!/usr/bin/env node
/**
 * One-off regenerator for src/data/google-fonts.json.
 *
 * Not run in CI. Run manually when you want to refresh the bundled list:
 *   npx tsx scripts/fetch-google-fonts.ts [API_KEY]
 *
 * If an API key is provided (or GOOGLE_FONTS_API_KEY is set), fetches from
 *   https://www.googleapis.com/webfonts/v1/webfonts?key=...&sort=popularity
 * which returns the full catalog with per-family variants.
 *
 * Without a key, the script exits with a note — there is no key-less public
 * endpoint that returns the family list with variants. The curated snapshot
 * shipped in the repo covers the common cases without needing a key.
 */

import fs from 'node:fs';
import path from 'node:path';

interface ApiItem {
  family: string;
  category: string;
  variants: string[];
}

interface ApiResponse { items: ApiItem[] }

const OUT = path.resolve(process.cwd(), 'src/data/google-fonts.json');

function variantToWeight(v: string): number | null {
  if (v === 'regular') return 400;
  if (v === 'italic') return 400;
  const match = v.match(/^(\d{3})/);
  return match ? parseInt(match[1], 10) : null;
}

async function main() {
  const apiKey = process.argv[2] ?? process.env.GOOGLE_FONTS_API_KEY;
  if (!apiKey) {
    console.error('No API key provided. Pass one as arg or set GOOGLE_FONTS_API_KEY.');
    console.error('Keep the curated list in src/data/google-fonts.json or expand it manually.');
    process.exit(1);
  }
  const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Fetch failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const data = (await res.json()) as ApiResponse;
  const fonts = data.items.map((item) => {
    const weights = new Set<number>();
    for (const v of item.variants) {
      const w = variantToWeight(v);
      if (w !== null) weights.add(w);
    }
    return {
      family: item.family,
      category: item.category,
      variants: [...weights].sort((a, b) => a - b),
    };
  });
  const out = {
    updatedAt: new Date().toISOString().slice(0, 10),
    note: 'Full catalog generated via scripts/fetch-google-fonts.ts',
    fonts,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`Wrote ${fonts.length} families to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
