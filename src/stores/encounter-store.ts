import { defineStore, acceptHMRUpdate } from 'pinia';
import type { Ref } from 'vue';
import { computed, ref } from 'vue';

// Creature defines the properties of a Creature added to the encounter. We don't need to track all of its attributes, just the minimal ones needed.
export type Creature = {
  name: string;
  level: number;
  count: number;
  kind: 'base' | 'weak' | 'elite';
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

  //
  // actions
  //

  // addCreature adds a creature to the encounter
  function addCreature(name: string, level: number): void {
    // TODO track with analytics creatures and level added
    encounterCreatures.value.push({
      name,
      level,
      count: 1,
      kind: 'base',
    });
  }

  // incrementCreatureCount increments the count of a specific creature in the ecounter by 1
  function incrementCreatureCount(index: number): void {
    const creature = encounterCreatures.value.at(index);
    if (creature) {
      creature.count++;
    }
  }

  // decrementCreatureCount decrements the count of a specific creature in the ecounter by 1
  function decrementCreatureCount(index: number): void {
    const creature = encounterCreatures.value.at(index);
    if (creature && creature.count > 0) {
      creature.count--;
    }
  }

  // removeCreature removes a creature from the encounter
  function removeCreature(index: number): void {
    encounterCreatures.value.splice(index, 1);
  }

  // makeCreatureBase makes a creature variant base
  function makeCreatureBase(index: number): void {
    const creature = encounterCreatures.value.at(index);
    if (creature) {
      creature.kind = 'base';
    }
  }

  // makeCreatureElite makes a creature variant elite
  function makeCreatureElite(index: number): void {
    const creature = encounterCreatures.value.at(index);
    if (creature) {
      creature.kind = 'elite';
    }
  }

  // makeCreatureWeak makes a creature variant weak
  function makeCreatureWeak(index: number): void {
    const creature = encounterCreatures.value.at(index);
    if (creature) {
      creature.kind = 'weak';
    }
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

  // Return state, getters, and actions
  return {
    partySize,
    partyLevel,
    encounterCreatures,
    xpBudget,
    xpCost,
    xpPool,
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

// computeCreatureCost compute how much xp the creature cost to the budget
// ref. https://2e.aonprd.com/Rules.aspx?ID=3262
export function computeCreatureCost(creature: Creature, partyLevel: number): number {
  switch (creature.kind) {
    case 'base':
      // If the creature has the base attribute its level is counted as its original value.
      return computeDeltaCost(creature.level - partyLevel);
    case 'weak':
      // Decrease the creature's level by 1; if the creature is level 1, instead decrease its level by 2.
      return computeDeltaCost(creature.level - (creature.level === 1 ? 2 : 1) - partyLevel);
    case 'elite':
      // Increase the creature’s level by 1; if the creature is level –1 or 0, instead increase its level by 2.
      return computeDeltaCost(creature.level + (creature.level === -1 || creature.level === 0 ? 2 : 1) - partyLevel);
    default:
      return 0;
  }
}

/**
 * Compute creature cost based on level delta from party level
 * ref. https://2e.aonprd.com/Rules.aspx?ID=2718
 *
 * @param {number} delta - The delta value for which the cost is calculated.
 * @return {number} The computed cost based on the given delta. Returns predefined values for deltas within a specific range and fallback values for deltas outside the range.
 */

type Delta = -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4;

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
  if (delta <= -4) return ruleBookCosts[-4];
  if (delta >= 4) return ruleBookCosts[4];

  return ruleBookCosts[delta as Delta];
}

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEncounterStore, import.meta.hot));
}
