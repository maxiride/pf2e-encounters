#!/usr/bin/env node
/*
  Validates public/creatures.json + public/metadata.json.

  Guards against a bad AoN fetch reaching git/production undetected:
  fetch-creatures.js only checks HTTP/ES errors and result truncation, not
  the shape of what it wrote. This checks required fields per creature and,
  given --previous-count, that the count hasn't dropped more than 5% — the
  AoN creature corpus only grows, at a slow monthly book cadence, so any
  bigger drop means a bad fetch, not a real data change.

  Usage:
    node validate-creatures.js [--previous-count=N]
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREATURES_PATH = path.resolve(__dirname, '../../public/creatures.json');
const METADATA_PATH = path.resolve(__dirname, '../../public/metadata.json');
const MAX_COUNT_DROP_RATIO = 0.05;
const VALID_EDITIONS = new Set([null, 'legacy', 'remastered']);

const previousCountArg = process.argv.find((a) => a.startsWith('--previous-count='));
const previousCount = previousCountArg ? Number(previousCountArg.slice('--previous-count='.length)) : null;

function fail(message) {
  console.error(`validate-creatures: ${message}`);
  process.exit(1);
}

function readJson(filePath, label) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return fail(`cannot read ${label} at ${filePath}: ${e.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fail(`${label} is not valid JSON: ${e.message}`);
  }
}

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;
const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');

function validateCreature(c, index) {
  const where = `creatures[${index}] (${c && c.name ? c.name : 'unnamed'})`;
  if (!isNonEmptyString(c.name)) fail(`${where}: name must be a non-empty string`);
  if (!isFiniteNumber(c.level)) fail(`${where}: level must be a finite number`);
  if (!isFiniteNumber(c.hp) || c.hp < 0) fail(`${where}: hp must be a non-negative number`);
  if (!isFiniteNumber(c.ac) || c.ac <= 0) fail(`${where}: ac must be a positive number`);
  if (typeof c.rarity !== 'string') fail(`${where}: rarity must be a string`);
  if (!isStringArray(c.size)) fail(`${where}: size must be an array of strings`);
  if (!isStringArray(c.traits)) fail(`${where}: traits must be an array of strings`);
  if (typeof c.family !== 'string') fail(`${where}: family must be a string`);
  if (!isStringArray(c.sources)) fail(`${where}: sources must be an array of strings`);
  if (typeof c.url !== 'string') fail(`${where}: url must be a string`);
  if (typeof c.npc !== 'boolean') fail(`${where}: npc must be a boolean`);
  if (typeof c.alignment !== 'string') fail(`${where}: alignment must be a string`);
  if (!VALID_EDITIONS.has(c.edition)) fail(`${where}: edition must be null, "legacy", or "remastered"`);
}

function main() {
  const creatures = readJson(CREATURES_PATH, 'creatures.json');
  const metadata = readJson(METADATA_PATH, 'metadata.json');

  if (!Array.isArray(creatures) || creatures.length === 0) {
    fail(`creatures.json must be a non-empty array (got ${Array.isArray(creatures) ? creatures.length : typeof creatures})`);
  }

  creatures.forEach(validateCreature);

  if (metadata.total !== creatures.length) {
    fail(`metadata.json total (${metadata.total}) does not match creatures.json length (${creatures.length})`);
  }

  if (previousCount !== null) {
    if (!Number.isFinite(previousCount) || previousCount <= 0) {
      fail(`--previous-count value is invalid: ${previousCountArg}`);
    }
    const minAllowed = Math.ceil(previousCount * (1 - MAX_COUNT_DROP_RATIO));
    if (creatures.length < minAllowed) {
      fail(
        `creature count dropped from ${previousCount} to ${creatures.length} ` +
          `(more than ${MAX_COUNT_DROP_RATIO * 100}% decrease, minimum allowed ${minAllowed}) — likely a bad fetch, not a real data change`,
      );
    }
  }

  console.log(`validate-creatures: OK — ${creatures.length} creatures` + (previousCount !== null ? ` (previous: ${previousCount})` : ''));
}

main();
