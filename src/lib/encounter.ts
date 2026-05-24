export type Creature = {
  id: string;
  name: string;
  level: number;
  size: string;
  family: string;
  alignment: string;
  creature_type: string;
  rarity: string;
  traits: string[];
  npc: boolean;
};

export type Metadata = {
  min_level: number;
  max_level: number;
  sizes: string[];
  families: string[];
  traits: string[];
  creature_types: string[];
  alignments: string[];
  rarities: string[];
};

export type EncounterEntry = Creature & {
  variant: 0 | 1 | 2;
  count: number;
  cost: number;
};

export type ColumnKey = 'name' | 'level' | 'size' | 'family' | 'type' | 'traits' | 'rarity';

export type BarStage = {
  at: number;
  color: string;
  label?: string;
  tickline?: boolean;
};

export const SIZE_ABBR: Record<string, string> = {
  Tiny: 'Tiny',
  Small: 'Sm',
  Medium: 'Med',
  Large: 'Lg',
  Huge: 'Huge',
  Gargantuan: 'Gtn',
};

export function sizeLabel(s: string): string {
  return SIZE_ABBR[s] ?? s;
}

export function computeDelta(delta: number): number {
  switch (delta) {
    case -3: return 15;
    case -2: return 20;
    case -1: return 30;
    case 0: return 40;
    case 1: return 60;
    case 2: return 80;
    case 3: return 120;
  }
  if (delta <= -1) return 10;
  if (delta >= 4) return 160;
  return 0;
}

export function computeCost(entry: EncounterEntry, partyLevel: number): number {
  const level = entry.level;
  if (entry.variant === 0) return computeDelta(level - partyLevel);
  if (entry.variant === 1) {
    const weak = level === 1 ? 2 : 1;
    return computeDelta(level - weak - partyLevel);
  }
  const elite = level === -1 || level === 0 ? 2 : 1;
  return computeDelta(level + elite - partyLevel);
}

export function filterOptions(all: string[], selected: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  const sel = new Set(selected);
  if (!q) return [...selected, ...all.filter((v) => !sel.has(v))];
  return [
    ...selected.filter((v) => v.toLowerCase().includes(q)),
    ...all.filter((v) => !sel.has(v) && v.toLowerCase().includes(q)),
  ];
}

export function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function makeXpBudget(partySize: number): number[] {
  const extra = partySize - 4;
  return [40 + 10 * extra, 60 + 15 * extra, 80 + 20 * extra, 120 + 30 * extra, 160 + 40 * extra];
}

export function makeBarStages(xpBudget: number[]): BarStage[] {
  return [
    { at: 0,    color: '#81d4fa' },
    { at: 25,   color: '#66bb6a', label: `Trivial ${xpBudget[0]}` },
    { at: 37.5, color: '#2e7d32', label: `Low ${xpBudget[1]}` },
    { at: 50,   color: '#b05600', label: `Moderate ${xpBudget[2]}` },
    { at: 75,   color: '#e53935', label: `Severe ${xpBudget[3]}` },
    { at: 100,  color: '#8b0000', label: `Extreme ${xpBudget[4]}`, tickline: false },
  ];
}

export function activeStageIndex(stages: BarStage[], value: number): number {
  let idx = 0;
  for (let i = 0; i < stages.length; i++) if (stages[i].at <= value) idx = i;
  return idx;
}

/* WCAG luminance + black-text contrast. Picks text color by *stage index* —
   find the first stage where black drops below AA (4.5:1) and use white from
   that index onward. Per-color picking flips back and forth when a light orange
   follows dark green; index-based picking guarantees monotonic switching. */
export function blackTextSwitchIndex(stages: BarStage[]): number {
  for (let i = 0; i < stages.length; i++) {
    const contrast = (relativeLuminance(stages[i].color) + 0.05) / 0.05;
    if (contrast < 4.5) return i;
  }
  return stages.length;
}
