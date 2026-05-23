/**
 * Locks the per-component sibling-group topology in place during the migration
 * away from `getGroupKey`'s last-dash fallback.
 *
 * Workflow:
 *   1. Snapshot current behavior: `UPDATE_SNAPSHOT=1 pnpm test groupKeySnapshot`
 *      writes `temp/groupkey-snapshot.json` (groupKey → variables, per component).
 *   2. Migrate: add explicit `groupKey` to every token that previously relied on
 *      the legacy fallback; delete the fallback branch in `getGroupKey`.
 *   3. Re-run this test (no env var) — must produce the same JSON.
 *
 * Once the migration is complete and verified, delete this file.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { componentRegistryEntries } from './registry';

const SNAPSHOT_PATH = path.resolve(__dirname, '../../../temp/groupkey-snapshot.json');

/** Mirrors the *post-migration* getGroupKey logic — schema only, no fallback. */
function effectiveGroupKey(_component: string, _variable: string, explicit: string | undefined): string | null {
  return explicit ?? null;
}

function computeSnapshot(): Record<string, Record<string, string[]>> {
  const out: Record<string, Record<string, string[]>> = {};
  for (const entry of componentRegistryEntries) {
    const groups: Record<string, string[]> = {};
    for (const t of entry.schema as Array<{ variable: string; groupKey?: string }>) {
      const gk = effectiveGroupKey(entry.id, t.variable, t.groupKey);
      if (!gk) continue;
      (groups[gk] ||= []).push(t.variable);
    }
    for (const k of Object.keys(groups)) groups[k].sort();
    out[entry.id] = Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)));
  }
  return out;
}

describe('groupKey topology snapshot', () => {
  it('matches the committed snapshot', () => {
    const computed = computeSnapshot();
    if (process.env.UPDATE_SNAPSHOT === '1') {
      fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
      fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(computed, null, 2) + '\n');
      return;
    }
    const expected = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
    expect(computed).toEqual(expected);
  });
});
