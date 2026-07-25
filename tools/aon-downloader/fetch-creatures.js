#!/usr/bin/env node
/*
  AoN Creatures Downloader (Elasticsearch)

  Queries the public Archives of Nethys Elasticsearch endpoint (the same
  backend the website uses) and writes:
    - public/creatures.json  : all creatures + NPCs, app-ready schema
    - public/metadata.json   : filter values (traits, rarities, sizes, sources, families, alignments, level range)

  One HTTP request total — far lighter on AoN than loading the website.

  Usage:
    node fetch-creatures.js [--force]

  Without --force the download is skipped when the output file is fresher
  than MAX_AGE_DAYS, so casual dev runs never hit AoN servers.
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ES_URL = 'https://elasticsearch.aonprd.com/aon/_search';
const OUT_CREATURES = path.resolve(__dirname, '../../public/creatures.json');
const OUT_METADATA = path.resolve(__dirname, '../../public/metadata.json');
const MAX_AGE_DAYS = 7;
const USER_AGENT = 'pf2e-encounters data updater (https://github.com/maxiride/pf2e-encounters)';

const force = process.argv.includes('--force');

function isFresh(file) {
  try {
    const ageMs = Date.now() - fs.statSync(file).mtimeMs;
    return ageMs < MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

async function fetchAll() {
  const body = {
    size: 10000,
    query: {
      bool: {
        filter: [{ term: { category: 'creature' } }],
        must_not: [{ term: { exclude_from_search: true } }],
      },
    },
    _source: [
      'name',
      'level',
      'hp',
      'ac',
      'rarity',
      'size',
      'trait_raw',
      'creature_family',
      'source',
      'url',
      'npc',
      'alignment',
      'legacy_id',
      'remaster_id',
    ],
    sort: [{ 'name.keyword': 'asc' }],
  };

  const resp = await fetch(ES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`AoN Elasticsearch returned HTTP ${resp.status}`);

  const json = await resp.json();
  if (json.error) throw new Error(`AoN Elasticsearch error: ${JSON.stringify(json.error.root_cause)}`);

  const total = json.hits.total.value;
  const hits = json.hits.hits;
  // ponytail: single request while the corpus fits in one page (4.7k of 10k today);
  // implement search_after pagination when AoN grows past 10k creature docs.
  if (total > hits.length) {
    throw new Error(`Result truncated (${hits.length}/${total}): implement search_after pagination.`);
  }
  return hits.map((h) => h._source);
}

function toCreature(s) {
  return {
    name: s.name,
    level: s.level ?? 0,
    hp: s.hp ?? 0,
    ac: s.ac ?? 0,
    rarity: capitalize(s.rarity),
    size: s.size ?? [],
    traits: s.trait_raw ?? [],
    family: s.creature_family ?? '',
    sources: s.source ?? [],
    url: s.url ?? '',
    npc: Boolean(s.npc),
    // absent on most post-Remaster (2023) statblocks — alignment was dropped from the game
    alignment: s.alignment ?? '',
    // AoN links revisited statblocks both ways: a `remaster_id` on the old
    // statblock points forward, a `legacy_id` on the new one points back. A
    // creature with neither field was never revisited and has only one edition.
    edition: s.remaster_id ? 'legacy' : s.legacy_id ? 'remastered' : null,
  };
}

function buildMetadata(creatures) {
  const traits = new Set();
  const rarities = new Set();
  const sizes = new Set();
  const sources = new Set();
  const families = new Set();
  const alignments = new Set();
  let minLevel = Infinity;
  let maxLevel = -Infinity;

  for (const c of creatures) {
    c.traits.forEach((t) => traits.add(t));
    c.size.forEach((sz) => sizes.add(sz));
    c.sources.forEach((src) => sources.add(src));
    if (c.rarity) rarities.add(c.rarity);
    if (c.family) families.add(c.family);
    if (c.alignment) alignments.add(c.alignment);
    if (c.level < minLevel) minLevel = c.level;
    if (c.level > maxLevel) maxLevel = c.level;
  }

  const sorted = (set) => [...set].sort((a, b) => a.localeCompare(b));
  return {
    total: creatures.length,
    updated: new Date().toISOString(),
    traits: sorted(traits),
    rarities: sorted(rarities),
    sizes: sorted(sizes),
    sources: sorted(sources),
    families: sorted(families),
    alignments: sorted(alignments),
    levels: { min: minLevel, max: maxLevel },
  };
}

async function main() {
  if (!force && isFresh(OUT_CREATURES)) {
    console.log(`creatures.json is fresher than ${MAX_AGE_DAYS} days — skipping download (use --force to override).`);
    return;
  }

  console.log('Fetching creatures from AoN Elasticsearch...');
  const raw = await fetchAll();
  const creatures = raw.map(toCreature);
  const metadata = buildMetadata(creatures);

  fs.mkdirSync(path.dirname(OUT_CREATURES), { recursive: true });
  fs.writeFileSync(OUT_CREATURES, JSON.stringify(creatures), 'utf8');
  fs.writeFileSync(OUT_METADATA, JSON.stringify(metadata), 'utf8');

  const npcCount = creatures.filter((c) => c.npc).length;
  console.log(`Wrote ${creatures.length} creatures (${npcCount} NPCs) to ${OUT_CREATURES}`);
  console.log(`Wrote metadata to ${OUT_METADATA}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
