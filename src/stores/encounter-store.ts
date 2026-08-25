import { defineStore, acceptHMRUpdate } from 'pinia';
import type { Ref } from 'vue';
import { computed, ref, watch } from 'vue';
import { trackEvent } from 'src/utils/analytics';

const SNAPSHOT_IDLE_MS = 8000;

// Creature defines the properties of a Creature added to the encounter. We don't need to track all of its attributes, just the minimal ones needed.
export type Creature = {
  name: string;
  level: number;
  count: number;
  kind: 'base' | 'weak' | 'elite';
  url: string;
};

// XPBudget represents the upper bounds of each threat level budget
interface XPBudget {
  trivial: number;
  low: number;
  moderate: number;
  severe: number;
  extreme: number;
}

export const useEncounterStore = defineStore('encounter', () => {
  // state
  const partySize: Ref<number> = ref(4); // Default to 4 players as per rulebook
  const partyLevel: Ref<number> = ref(1); // Party level
  const encounterCreatures: Ref<Creature[]> = ref([]);

  //
  // getters
  //

  // xpBudget is the upper bound of each threat level based on party size
  // ref. https://2e.aonprd.com/Rules.aspx?ID=2717
  const xpBudget = computed<XPBudget>(() => ({
    trivial: 40 + 10 * (partySize.value - 4),
    low: 60 + 20 * (partySize.value - 4),
    moderate: 80 + 20 * (partySize.value - 4),
    severe: 120 + 30 * (partySize.value - 4),
    extreme: 160 + 40 * (partySize.value - 4),
  }));

  // xpCost represents the total cost of the encounter
  const xpCost = computed<number>(() => {
    let cost = 0;
    encounterCreatures.value.forEach((c) => {
      const creatureCost = computeCreatureCost(c, partyLevel.value) * c.count;
      cost += creatureCost;
    });

    return cost;
  });

  // xpPool represents a percentage of how much xp points are left in the pool based off the extreme budget
  const xpPool = computed<number>(() => {
    return xpCost.value / xpBudget.value.extreme;
  });

  // hasDegenerateBudget is true when the rulebook's own budget formula produces
  // a non-increasing threat ladder for the current party size — e.g. at a party
  // of 1, "Low" (0 XP) computes below "Trivial" (10 XP), so "Low" can never be
  // reached. Confirmed against the rulebook (issue #81): this is a rules-as-written
  // gap in small-party math, not a bug in this tool's arithmetic, so we only warn
  // rather than reinterpret the table.
  const hasDegenerateBudget = computed<boolean>(() => {
    const { trivial, low, moderate, severe, extreme } = xpBudget.value;
    return low <= trivial || moderate <= low || severe <= moderate || extreme <= severe;
  });

  // threat is the label of the smallest budget the current cost fits in
  const threat = computed<string>(() => {
    if (xpCost.value === 0) return 'None';
    if (xpCost.value <= xpBudget.value.trivial) return 'Trivial';
    if (xpCost.value <= xpBudget.value.low) return 'Low';
    if (xpCost.value <= xpBudget.value.moderate) return 'Moderate';
    if (xpCost.value <= xpBudget.value.severe) return 'Severe';
    if (xpCost.value <= xpBudget.value.extreme) return 'Extreme';
    return 'Beyond Extreme';
  });

  //
  // actions
  //

  // addCreature adds a creature to the encounter as a new base entry. It never merges into an
  // existing row (issue #94): merging by name would silently fold a fresh addition into whatever
  // kind that row already happened to be, or make splitting a weak/elite copy off a stack
  // dependent on the order the creature was added in. Stacking count is the count stepper's job.
  function addCreature(name: string, level: number, url = '', npc = false): void {
    trackEvent('encounter-add-creature', { name, level, npc });

    encounterCreatures.value.push({
      name,
      level,
      count: 1,
      kind: 'base',
      url,
    });
  }

  // incrementCreatureCount increments the count of a specific creature in the ecounter by 1
  function incrementCreatureCount(index: number): void {
    const creature = encounterCreatures.value.at(index);
    if (creature) {
      creature.count++;
    }
  }

  // decrementCreatureCount decrements the count of a specific creature in the encounter by 1 (never below 1)
  function decrementCreatureCount(index: number): void {
    const creature = encounterCreatures.value.at(index);
    if (creature && creature.count > 1) {
      creature.count--;
    }
  }

  // removeCreature removes a creature from the encounter
  function removeCreature(index: number): void {
    encounterCreatures.value.splice(index, 1);
  }

  // setCreatureKind changes a creature entry's weak/base/elite variant, tracking real changes
  // only. It re-kinds the whole entry (and whatever count it holds) in place - entries are never
  // merged by name, so this never affects any other entry of the same creature.
  function setCreatureKind(index: number, kind: Creature['kind']): void {
    const creature = encounterCreatures.value.at(index);
    if (!creature || creature.kind === kind) return;
    creature.kind = kind;
    trackEvent('encounter-change-kind', { name: creature.name, kind });
  }

  // makeCreatureBase makes a creature variant base
  function makeCreatureBase(index: number): void {
    setCreatureKind(index, 'base');
  }

  // makeCreatureElite makes a creature variant elite
  function makeCreatureElite(index: number): void {
    setCreatureKind(index, 'elite');
  }

  // makeCreatureWeak makes a creature variant weak
  function makeCreatureWeak(index: number): void {
    setCreatureKind(index, 'weak');
  }

  // setPartyLevel sets the party level
  function setPartyLevel(level: number): void {
    partyLevel.value = Math.max(level, 1); // partyLevel can't be less than 1
  }

  // setPartySize sets the party size (number of players)
  function setPartySize(size: number): void {
    partySize.value = Math.max(size, 1); // partySize can't be less than 1
  }

  // resetEncounter resets the encounter to its initial state, clearing all creatures
  function $reset() {
    encounterCreatures.value = [];
  }

  //
  // analytics — no explicit "encounter finished" signal exists (creatures get
  // added/removed continuously), so we snapshot the encounter shape once the
  // user goes idle, plus an immediate flush if they hide/close the tab first.
  //
  let snapshotTimer: ReturnType<typeof setTimeout> | undefined;

  function sendSnapshot(): void {
    clearTimeout(snapshotTimer);
    if (encounterCreatures.value.length === 0) return;
    trackEvent('encounter-snapshot', {
      party_level: partyLevel.value,
      party_size: partySize.value,
      unique_creatures: encounterCreatures.value.length,
      creature_count: encounterCreatures.value.reduce((sum, c) => sum + c.count, 0),
      xp_cost: xpCost.value,
      threat: threat.value,
    });
  }

  watch(
    [encounterCreatures, partyLevel, partySize],
    () => {
      clearTimeout(snapshotTimer);
      snapshotTimer = setTimeout(sendSnapshot, SNAPSHOT_IDLE_MS);
    },
    { deep: true },
  );

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sendSnapshot();
  });
  window.addEventListener('pagehide', sendSnapshot);

  // Return state, getters, and actions
  return {
    partySize,
    partyLevel,
    encounterCreatures,
    xpBudget,
    xpCost,
    xpPool,
    threat,
    hasDegenerateBudget,
    addCreature,
    incrementCreatureCount,
    decrementCreatureCount,
    removeCreature,
    makeCreatureBase,
    makeCreatureElite,
    makeCreatureWeak,
    setPartyLevel,
    setPartySize,
    $reset,
  };
});

//
// Utility functions
//

// adjustedLevel is the creature's effective level after the weak/elite adjustment
// ref. https://2e.aonprd.com/Rules.aspx?ID=3262
export function adjustedLevel(creature: Creature): number {
  switch (creature.kind) {
    case 'weak':
      // Decrease the creature's level by 1; if the creature is level 1, instead decrease its level by 2.
      return creature.level - (creature.level === 1 ? 2 : 1);
    case 'elite':
      // Increase the creature's level by 1; if the creature is level –1 or 0, instead increase its level by 2.
      return creature.level + (creature.level === -1 || creature.level === 0 ? 2 : 1);
    default:
      return creature.level;
  }
}

// computeCreatureCost compute how much xp the creature cost to the budget
export function computeCreatureCost(creature: Creature, partyLevel: number): number {
  return computeDeltaCost(adjustedLevel(creature) - partyLevel);
}

// isDeltaOutOfBounds is true when a creature's effective level is more than MAX_DELTA
// levels from the party. GM Core's Creature XP table only defines costs in that range
// ("In all but the most unusual circumstances, you'll select creatures ... that range
// from 4 levels lower ... to 4 levels higher") — beyond it, the displayed cost is
// clamped to the table's edge value and doesn't reflect how mismatched the fight
// actually is (ref. issue #62: a level 1 party vs. a level 25 Tarrasque still read as
// merely "Extreme"). We surface this as a UI warning rather than inventing an
// unofficial extrapolated cost formula.
export function isDeltaOutOfBounds(creature: Creature, partyLevel: number): boolean {
  const delta = adjustedLevel(creature) - partyLevel;
  return delta < -MAX_DELTA || delta > MAX_DELTA;
}

/**
 * Compute creature cost based on level delta from party level
 * ref. https://2e.aonprd.com/Rules.aspx?ID=2718
 *
 * @param {number} delta - The delta value for which the cost is calculated.
 * @return {number} The computed cost based on the given delta. Returns predefined values for deltas within a specific range and fallback values for deltas outside the range.
 */

type Delta = -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4;

const MAX_DELTA = 4;

const ruleBookCosts: Record<Delta, number> = {
  [-4]: 10,
  [-3]: 15,
  [-2]: 20,
  [-1]: 30,
  0: 40,
  1: 60,
  2: 80,
  3: 120,
  4: 160,
};

function computeDeltaCost(delta: number): number {
  if (delta <= -MAX_DELTA) return ruleBookCosts[-4];
  if (delta >= MAX_DELTA) return ruleBookCosts[4];

  return ruleBookCosts[delta as Delta];
}

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEncounterStore, import.meta.hot));
}
