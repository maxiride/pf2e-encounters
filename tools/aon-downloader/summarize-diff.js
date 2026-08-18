#!/usr/bin/env node
/*
  Summarizes what changed between a previous and a freshly fetched
  creatures.json + metadata.json, as Markdown (used as the monthly
  data-refresh PR body).

  Creatures are matched by `url` (AoN's page path), the only field
  guaranteed unique - `name` has hundreds of duplicates in the corpus
  (reprints, generic NPC names).

  Usage:
    node summarize-diff.js <old-creatures.json> <old-metadata.json> [new-creatures.json] [new-metadata.json]

  new-creatures.json/new-metadata.json default to ./public/creatures.json
  and ./public/metadata.json.
*/

import fs from 'node:fs';

const MAX_LISTED = 30;

const [, , oldCreaturesPath, oldMetadataPath, newCreaturesPath = 'public/creatures.json', newMetadataPath = 'public/metadata.json'] =
  process.argv;

if (!oldCreaturesPath || !oldMetadataPath) {
  console.error('Usage: summarize-diff.js <old-creatures.json> <old-metadata.json> [new-creatures.json] [new-metadata.json]');
  process.exit(1);
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const oldCreatures = readJson(oldCreaturesPath);
const newCreatures = readJson(newCreaturesPath);
const oldMetadata = readJson(oldMetadataPath);
const newMetadata = readJson(newMetadataPath);

const byUrl = (list) => new Map(list.map((c) => [c.url, c]));
const oldByUrl = byUrl(oldCreatures);
const newByUrl = byUrl(newCreatures);

const added = [...newByUrl.keys()].filter((url) => !oldByUrl.has(url)).map((url) => newByUrl.get(url));
const removed = [...oldByUrl.keys()].filter((url) => !newByUrl.has(url)).map((url) => oldByUrl.get(url));

const CREATURE_FIELDS = ['name', 'level', 'hp', 'ac', 'rarity', 'size', 'traits', 'family', 'sources', 'npc', 'alignment', 'edition'];
const changed = [];
for (const [url, oldC] of oldByUrl) {
  const newC = newByUrl.get(url);
  if (!newC) continue;
  const diffFields = CREATURE_FIELDS.filter((f) => JSON.stringify(oldC[f]) !== JSON.stringify(newC[f]));
  if (diffFields.length) changed.push({ name: newC.name, url, fields: diffFields });
}

function listSection(title, items, toLine) {
  if (!items.length) return `- ${title}: 0\n`;
  const lines = items.slice(0, MAX_LISTED).map(toLine);
  const more = items.length > MAX_LISTED ? `\n- …and ${items.length - MAX_LISTED} more` : '';
  return (
    `- ${title}: ${items.length}\n` +
    `<details><summary>${title} (${items.length})</summary>\n\n` +
    lines.map((l) => `  - ${l}`).join('\n') +
    more +
    '\n\n</details>\n'
  );
}

function arrayFieldDiff(label, oldArr, newArr) {
  const oldSet = new Set(oldArr);
  const newSet = new Set(newArr);
  const added = [...newSet].filter((x) => !oldSet.has(x));
  const removed = [...oldSet].filter((x) => !newSet.has(x));
  if (!added.length && !removed.length) return `- ${label}: unchanged (${newArr.length})\n`;
  const parts = [];
  if (added.length) parts.push(`+${added.length} (${added.join(', ')})`);
  if (removed.length) parts.push(`-${removed.length} (${removed.join(', ')})`);
  return `- ${label}: ${parts.join(', ')}\n`;
}

const lines = [];
lines.push('## Creature data changes\n');
lines.push(`- Total: ${newCreatures.length} (was ${oldCreatures.length}, ${newCreatures.length - oldCreatures.length >= 0 ? '+' : ''}${newCreatures.length - oldCreatures.length})\n`);
lines.push(listSection('Added', added, (c) => `${c.name} (level ${c.level})`));
lines.push(listSection('Removed', removed, (c) => `${c.name} (level ${c.level})`));
lines.push(listSection('Changed', changed, (c) => `${c.name}: ${c.fields.join(', ')}`));

lines.push('## Metadata changes\n');
lines.push(arrayFieldDiff('Traits', oldMetadata.traits, newMetadata.traits));
lines.push(arrayFieldDiff('Rarities', oldMetadata.rarities, newMetadata.rarities));
lines.push(arrayFieldDiff('Sizes', oldMetadata.sizes, newMetadata.sizes));
lines.push(arrayFieldDiff('Sources', oldMetadata.sources, newMetadata.sources));
lines.push(arrayFieldDiff('Families', oldMetadata.families, newMetadata.families));
lines.push(arrayFieldDiff('Alignments', oldMetadata.alignments, newMetadata.alignments));
if (oldMetadata.levels.min !== newMetadata.levels.min || oldMetadata.levels.max !== newMetadata.levels.max) {
  lines.push(
    `- Level range: ${oldMetadata.levels.min}..${oldMetadata.levels.max} → ${newMetadata.levels.min}..${newMetadata.levels.max}\n`,
  );
} else {
  lines.push(`- Level range: unchanged (${newMetadata.levels.min}..${newMetadata.levels.max})\n`);
}

process.stdout.write(lines.join(''));
