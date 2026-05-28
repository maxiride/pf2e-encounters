#!/usr/bin/env node
// AoN API fields, semantics, and the remaster flag definition: see
// docs/aon-api-reference.md
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ES_URL = "https://elasticsearch.aonprd.com/aon/_search";
const PAGE_SIZE = 1000;
const ALIGNMENT_VALUES = new Set([
  "CE", "CG", "CN", "LE", "LG", "LN", "N", "NE", "NG", "No Alignment",
]);
const REMASTER_CUTOFF = "2023-11-15";
const FORMAT_VERSION = 1;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "../src/app/data/creatures.json");

async function fetchPage(searchAfter) {
  const body = {
    size: PAGE_SIZE,
    query: { bool: { must: [{ term: { category: "creature" } }] } },
    sort: [{ "id.keyword": "asc" }],
    _source: [
      "id", "name", "level", "alignment", "size", "trait",
      "rarity", "creature_family", "npc",
      "remaster_id", "release_date",
    ],
    ...(searchAfter ? { search_after: searchAfter } : {}),
  };

  const res = await fetch(ES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ES request failed: ${res.status} ${res.statusText}`);
  return res.json();
}

function mapHit(src) {
  const idStr = String(src.id ?? "").replace(/^creature-/, "");
  const traits = (src.trait ?? [])
    .filter((t) => !ALIGNMENT_VALUES.has(t))
    .sort((a, b) => a.localeCompare(b));

  const hasRemasterId = Array.isArray(src.remaster_id) ? src.remaster_id.length > 0 : !!src.remaster_id;
  const remaster = !hasRemasterId && typeof src.release_date === "string" && src.release_date >= REMASTER_CUTOFF;

  return {
    id: idStr,
    name: src.name ?? "",
    creature_type: src.npc ? "NPC" : "Creature",
    level: typeof src.level === "number" ? src.level : -999,
    alignment: src.alignment ?? "No Alignment",
    size: Array.isArray(src.size) ? src.size[0] ?? "" : src.size ?? "",
    rarity: src.rarity ?? "common",
    family: src.creature_family ?? "",
    npc: !!src.npc,
    traits,
    remaster,
  };
}

function buildMetadata(creatures) {
  const families = new Set();
  const alignments = new Set(["Any"]);
  const traits = new Set();
  const rarities = new Set();
  const sizes = new Set();
  let minLevel = Infinity;
  let maxLevel = -Infinity;

  for (const c of creatures) {
    if (c.family) families.add(c.family);
    if (c.alignment) alignments.add(c.alignment);
    if (c.rarity) rarities.add(c.rarity);
    if (c.size) sizes.add(c.size);
    for (const t of c.traits) traits.add(t);
    if (c.level < minLevel) minLevel = c.level;
    if (c.level > maxLevel) maxLevel = c.level;
  }

  const sorted = (s) => [...s].sort((a, b) => a.localeCompare(b));
  return {
    min_level: minLevel === Infinity ? 0 : minLevel,
    max_level: maxLevel === -Infinity ? 0 : maxLevel,
    total: creatures.length,
    families: sorted(families),
    alignments: sorted(alignments),
    creature_types: ["Creature", "NPC"],
    traits: sorted(traits),
    rarities: sorted(rarities),
    sizes: sorted(sizes),
  };
}

/**
 * Pack the verbose creature list into a compact wire format:
 *   - Shared dictionaries (T, F, K, A, S, R) carry every distinct string once.
 *   - Each creature is a positional tuple of indices into those dictionaries.
 *
 * Tuple schema (see src/app/creatures-store.ts for the decoder):
 *   [id, name, level, K, A, S, R, F, npc, remaster, [T...]]
 */
export function compact(creatures, metadata) {
  const dict = (values) => {
    const uniq = [...new Set(values)].sort((a, b) => a.localeCompare(b));
    const idx = new Map(uniq.map((v, i) => [v, i]));
    return { table: uniq, idx };
  };

  const T = dict(creatures.flatMap((c) => c.traits || []));
  const F = dict(creatures.map((c) => c.family || ""));
  const K = dict(creatures.map((c) => c.creature_type || ""));
  const A = dict(creatures.map((c) => c.alignment || ""));
  const S = dict(creatures.map((c) => c.size || ""));
  const R = dict(creatures.map((c) => c.rarity || ""));

  const c = creatures.map((cr) => [
    cr.id,
    cr.name,
    cr.level,
    K.idx.get(cr.creature_type),
    A.idx.get(cr.alignment),
    S.idx.get(cr.size),
    R.idx.get(cr.rarity),
    F.idx.get(cr.family || ""),
    cr.npc ? 1 : 0,
    cr.remaster ? 1 : 0,
    (cr.traits || []).map((t) => T.idx.get(t)),
  ]);

  return {
    v: FORMAT_VERSION,
    T: T.table, F: F.table, K: K.table, A: A.table, S: S.table, R: R.table,
    c,
    m: metadata,
  };
}

export async function emit(creatures) {
  const metadata = buildMetadata(creatures);
  const compactData = compact(creatures, metadata);
  const json = JSON.stringify(compactData);
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, json);
  console.log(`Wrote ${creatures.length} creatures to ${OUTPUT_PATH} (${json.length} bytes)`);
}

async function main() {
  const creatures = [];
  let searchAfter;
  let total;

  while (true) {
    const page = await fetchPage(searchAfter);
    total ??= page.hits.total.value;
    const hits = page.hits.hits;
    if (hits.length === 0) break;
    for (const h of hits) creatures.push(mapHit(h._source));
    process.stdout.write(`\rFetched ${creatures.length} / ${total}`);
    if (hits.length < PAGE_SIZE) break;
    searchAfter = hits[hits.length - 1].sort;
  }
  process.stdout.write("\n");

  creatures.sort((a, b) => Number(a.id) - Number(b.id));
  await emit(creatures);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
