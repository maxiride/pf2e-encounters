import type { Creature, Metadata } from './encounter';
// Vite emits this JSON as a content-hashed asset; the browser caches it
// immutably, so the file is only re-downloaded when its contents change.
import creaturesUrl from './data/creatures.json?url';

type CompactCreature = [
  string,   // id
  string,   // name
  number,   // level
  number,   // creature_type index
  number,   // alignment index
  number,   // size index
  number,   // rarity index
  number,   // family index
  0 | 1,    // npc
  0 | 1,    // remaster
  number[], // trait indices
];

type CompactFile = {
  v: number;
  T: string[]; F: string[]; K: string[]; A: string[]; S: string[]; R: string[];
  c: CompactCreature[];
  m: Metadata;
};

export async function loadCreatures(): Promise<{ creatures: Creature[]; metadata: Metadata }> {
  const res = await fetch(creaturesUrl);
  if (!res.ok) throw new Error(`Failed to load creatures: ${res.status}`);
  const file: CompactFile = await res.json();
  return { creatures: expand(file), metadata: file.m };
}

function expand({ T, F, K, A, S, R, c }: CompactFile): Creature[] {
  return c.map(([id, name, level, ki, ai, si, ri, fi, npc, remaster, ti]) => {
    const out: Creature = {
      id,
      name,
      level,
      creature_type: K[ki],
      alignment: A[ai],
      size: S[si],
      rarity: R[ri],
      family: F[fi],
      npc: !!npc,
      traits: ti.map((i) => T[i]),
    };
    if (remaster) out.remaster = true;
    return out;
  });
}
