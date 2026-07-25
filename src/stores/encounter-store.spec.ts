import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import {
  adjustedLevel,
  computeCreatureCost,
  isDeltaOutOfBounds,
  useEncounterStore,
} from './encounter-store';
import type { Creature } from './encounter-store';

function creature(overrides: Partial<Creature> = {}): Creature {
  return { name: 'Test Creature', level: 1, count: 1, kind: 'base', url: '', ...overrides };
}

//
// Pure rules functions
//

describe('adjustedLevel', () => {
  it('returns the base level unchanged', () => {
    expect(adjustedLevel(creature({ level: 5 }))).toBe(5);
  });

  it('weak decreases level by 1', () => {
    expect(adjustedLevel(creature({ level: 5, kind: 'weak' }))).toBe(4);
  });

  it('weak decreases a level 1 creature by 2 (GM Core exception)', () => {
    expect(adjustedLevel(creature({ level: 1, kind: 'weak' }))).toBe(-1);
  });

  it('elite increases level by 1', () => {
    expect(adjustedLevel(creature({ level: 5, kind: 'elite' }))).toBe(6);
  });

  it('elite increases a level 0 or -1 creature by 2 (GM Core exception)', () => {
    expect(adjustedLevel(creature({ level: 0, kind: 'elite' }))).toBe(2);
    expect(adjustedLevel(creature({ level: -1, kind: 'elite' }))).toBe(1);
  });
});

describe('computeCreatureCost', () => {
  // GM Core Table 10-2: Creature XP and Role, https://2e.aonprd.com/Rules.aspx?ID=2718
  it.each([
    [-4, 10],
    [-3, 15],
    [-2, 20],
    [-1, 30],
    [0, 40],
    [1, 60],
    [2, 80],
    [3, 120],
    [4, 160],
  ])('delta %i costs %i XP', (delta, xp) => {
    const partyLevel = 10;
    expect(computeCreatureCost(creature({ level: partyLevel + delta }), partyLevel)).toBe(xp);
  });

  it('clamps deltas beyond the rulebook table to the edge values', () => {
    expect(computeCreatureCost(creature({ level: 25 }), 1)).toBe(160); // delta +24
    expect(computeCreatureCost(creature({ level: 1 }), 20)).toBe(10); // delta -19
  });

  it('applies the weak/elite adjustment before the delta lookup', () => {
    // level 3 elite vs party 3 -> adjusted 4, delta +1 -> 60
    expect(computeCreatureCost(creature({ level: 3, kind: 'elite' }), 3)).toBe(60);
    // level 3 weak vs party 3 -> adjusted 2, delta -1 -> 30
    expect(computeCreatureCost(creature({ level: 3, kind: 'weak' }), 3)).toBe(30);
  });
});

describe('isDeltaOutOfBounds', () => {
  it('is false within the rulebook range (±4)', () => {
    expect(isDeltaOutOfBounds(creature({ level: 5 }), 1)).toBe(false); // +4
    expect(isDeltaOutOfBounds(creature({ level: 1 }), 5)).toBe(false); // -4
  });

  it('is true past the rulebook range', () => {
    expect(isDeltaOutOfBounds(creature({ level: 6 }), 1)).toBe(true); // +5
    expect(isDeltaOutOfBounds(creature({ level: 1 }), 6)).toBe(true); // -5
  });

  it('accounts for the weak/elite adjustment', () => {
    // level 5 elite vs party 1 -> adjusted 6, delta +5 -> out of bounds
    expect(isDeltaOutOfBounds(creature({ level: 5, kind: 'elite' }), 1)).toBe(true);
    // level 6 weak vs party 1 -> adjusted 5, delta +4 -> in bounds
    expect(isDeltaOutOfBounds(creature({ level: 6, kind: 'weak' }), 1)).toBe(false);
  });
});

//
// Store
//

describe('encounter store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.umami = { track: vi.fn() };
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    delete window.umami;
  });

  describe('xpBudget (GM Core pg. 76, Encounter Budget + Character Adjustment)', () => {
    it.each([
      // partySize, trivial, low, moderate, severe, extreme
      [3, 30, 40, 60, 90, 120],
      [4, 40, 60, 80, 120, 160],
      [5, 50, 80, 100, 150, 200],
      [6, 60, 100, 120, 180, 240],
    ])('party of %i -> budgets %i/%i/%i/%i/%i', (size, trivial, low, moderate, severe, extreme) => {
      const store = useEncounterStore();
      store.setPartySize(size);
      expect(store.xpBudget).toEqual({ trivial, low, moderate, severe, extreme });
    });
  });

  describe('threat', () => {
    it('is None for an empty encounter', () => {
      const store = useEncounterStore();
      expect(store.threat).toBe('None');
    });

    it.each([
      // one creature at the given delta vs party level 10, party of 4
      [10 - 4, 'Trivial'], // 10 XP
      [10, 'Trivial'], // 40 XP, boundary
      [10 + 1, 'Low'], // 60 XP, boundary
      [10 + 2, 'Moderate'], // 80 XP, boundary
      [10 + 3, 'Severe'], // 120 XP, boundary
      [10 + 4, 'Extreme'], // 160 XP, boundary
    ])('single creature of level %i vs party level 10 -> %s', (level, expected) => {
      const store = useEncounterStore();
      store.setPartyLevel(10);
      store.addCreature('X', level);
      expect(store.threat).toBe(expected);
    });

    it('is Beyond Extreme past the extreme budget', () => {
      const store = useEncounterStore();
      store.setPartyLevel(10);
      store.addCreature('X', 14); // 160
      store.addCreature('Y', 6); // +10 -> 170 > 160
      expect(store.threat).toBe('Beyond Extreme');
    });
  });

  describe('xpCost', () => {
    it('multiplies each creature cost by its count and sums', () => {
      const store = useEncounterStore();
      store.setPartyLevel(3);
      store.addCreature('Goblin', 3); // delta 0 -> 40
      store.incrementCreatureCount(0); // count 2 -> 80
      store.addCreature('Ogre', 4); // delta +1 -> 60
      expect(store.xpCost).toBe(140);
    });

    it('reacts to party level changes (regression, issue #17)', () => {
      const store = useEncounterStore();
      store.setPartyLevel(1);
      store.addCreature('Goblin', 1); // delta 0 -> 40
      expect(store.xpCost).toBe(40);
      store.setPartyLevel(5); // delta -4 -> 10
      expect(store.xpCost).toBe(10);
    });
  });

  describe('actions', () => {
    it('adding the same base creature again bumps its count instead of duplicating', () => {
      const store = useEncounterStore();
      store.addCreature('Goblin', 1);
      store.addCreature('Goblin', 1);
      expect(store.encounterCreatures).toHaveLength(1);
      expect(store.encounterCreatures[0]?.count).toBe(2);
    });

    it('never decrements a creature count below 1', () => {
      const store = useEncounterStore();
      store.addCreature('Goblin', 1);
      store.decrementCreatureCount(0);
      expect(store.encounterCreatures[0]?.count).toBe(1);
    });

    it('clamps party level and size to a minimum of 1', () => {
      const store = useEncounterStore();
      store.setPartyLevel(-3);
      store.setPartySize(0);
      expect(store.partyLevel).toBe(1);
      expect(store.partySize).toBe(1);
    });

    it('$reset clears the encounter', () => {
      const store = useEncounterStore();
      store.addCreature('Goblin', 1);
      store.$reset();
      expect(store.encounterCreatures).toHaveLength(0);
    });
  });

  describe('analytics events', () => {
    it('tracks encounter-add-creature with name, level and npc flag', () => {
      const store = useEncounterStore();
      store.addCreature('Bandit', 2, '/NPCs.aspx?ID=1', true);
      expect(window.umami?.track).toHaveBeenCalledWith('encounter-add-creature', {
        name: 'Bandit',
        level: 2,
        npc: true,
      });
    });

    it('tracks encounter-change-kind only on real changes', () => {
      const store = useEncounterStore();
      store.addCreature('Goblin', 1);
      const track = window.umami?.track;

      store.makeCreatureElite(0);
      store.makeCreatureElite(0); // no-op, same kind
      store.makeCreatureBase(0);

      const kindCalls = vi.mocked(track!).mock.calls.filter(([name]) => name === 'encounter-change-kind');
      expect(kindCalls).toEqual([
        ['encounter-change-kind', { name: 'Goblin', kind: 'elite' }],
        ['encounter-change-kind', { name: 'Goblin', kind: 'base' }],
      ]);
    });

    it('sends a debounced encounter-snapshot after 8s of inactivity', async () => {
      vi.useFakeTimers();
      const store = useEncounterStore();
      store.addCreature('Goblin', 1);
      await nextTick(); // let the watcher schedule the timer

      const track = vi.mocked(window.umami!.track);
      track.mockClear();

      vi.advanceTimersByTime(7999);
      expect(track).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(track).toHaveBeenCalledWith('encounter-snapshot', {
        party_level: 1,
        party_size: 4,
        unique_creatures: 1,
        creature_count: 1,
        xp_cost: 40,
        threat: 'Trivial',
      });
    });

    it('does not snapshot an empty encounter', async () => {
      vi.useFakeTimers();
      const store = useEncounterStore();
      store.setPartySize(5); // mutation schedules the timer, but encounter is empty
      await nextTick();

      const track = vi.mocked(window.umami!.track);
      track.mockClear();

      vi.advanceTimersByTime(9000);
      const snapshotCalls = track.mock.calls.filter(([name]) => name === 'encounter-snapshot');
      expect(snapshotCalls).toHaveLength(0);
    });
  });
});
