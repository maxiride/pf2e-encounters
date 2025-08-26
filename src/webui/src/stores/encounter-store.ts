import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref, Ref } from 'vue'

// Creature defines the properties of a Creature added to the encounter. We don't need to track all of its attributes, just the minimal ones needed.
interface Creature {
  name: string
  level: number
  count: number
  kind: 'base' | 'weak' | 'elite'
}

// XPBudget represents the upper bounds of each threat level
interface XPBudget {
  trivial: number
  low: number
  moderate: number
  severe: number
  extreme: number
}

export const useEncounterStore = defineStore('encounter', () => {
  // state
  const partySize: Ref<number> = ref(4) // Default to 4 players as per rulebook
  const partyLevel: Ref<number> = ref(1) // Party level
  const encounterCreatures: Ref<Creature[]> = ref([])

  // getters

  // xpBudget is the upper bound of each threat level based on party size
  // ref. https://2e.aonprd.com/Rules.aspx?ID=2717
  const xpBudget = computed<XPBudget>(() => ({
    trivial: 40 + 10 * (partySize.value - 4),
    low: 60 + 20 * (partySize.value - 4),
    moderate: 80 + 20 * (partySize.value - 4),
    severe: 120 + 30 * (partySize.value - 4),
    extreme: 160 + 40 * (partySize.value - 4),
  }))

  const xpCost = computed<number>(() => {
    let cost = 0
    encounterCreatures.value.forEach((c) => {
      const creatureCost = computeCreatureCost(c, partyLevel.value) * c.count
      cost += creatureCost
    })

    return cost
  })

  const xpPool = computed<number>(() => {
    return xpCost.value / xpBudget.value.extreme
  })

  // actions
  function addCreature(name: string, level: number): void {
    encounterCreatures.value.push({
      name,
      level,
      count: 1,
      kind: 'base',
    })
  }

  function incrementCreatureCount(index: number): void {
    const creature = encounterCreatures.value.at(index)
    if (creature) {
      creature.count++
    }
  }

  function decrementCreatureCount(index: number): void {
    const creature = encounterCreatures.value.at(index)
    if (creature && creature.count > 0) {
      creature.count--
    }
  }

  function removeCreature(index: number): void {
    encounterCreatures.value.splice(index, 1)
  }

  function makeCreatureBase(index: number): void {
    const creature = encounterCreatures.value.at(index)
    if (creature) {
      creature.kind = 'base'
    }
  }

  function makeCreatureElite(index: number): void {
    const creature = encounterCreatures.value.at(index)
    if (creature) {
      creature.kind = 'elite'
    }
  }

  function makeCreatureWeak(index: number): void {
    const creature = encounterCreatures.value.at(index)
    if (creature) {
      creature.kind = 'weak'
    }
  }

  function resetEncounter(): void {
    encounterCreatures.value = []
  }

  function setPartyLevel(level: number): void {
    partyLevel.value = Math.max(level, 1) // partyLevel can't be less than 1
  }

  function setPartySize(size: number): void {
    partySize.value = Math.max(size, 1) // partySize can't be less than 1
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
    resetEncounter,
    setPartyLevel,
    setPartySize,
  }
})

// computeCreatureCost compute the creature cost to the budget
// ref. https://2e.aonprd.com/Rules.aspx?ID=3262
export function computeCreatureCost(creature: Creature, partyLevel: number): number {
  switch (creature.kind) {
    case 'base':
      // If the creature has the base attribute its level is counted as its original value.
      return computeDeltaCost(creature.level - partyLevel)
    case 'weak':
      // If the creature has the weak attribute its level is counted as one less than its original value.
      return computeDeltaCost(creature.level - 1 - partyLevel)
    case 'elite':
      // If the creature has the elite attribute its level is counted as one more than its original value.
      return computeDeltaCost(creature.level + 1 - partyLevel)
    default:
      return 0
  }
}

// computeDeltaCost compute creature cost based on level delta
function computeDeltaCost(delta: number): number {
  switch (delta) {
    case -3:
      return 15
    case -2:
      return 20
    case -1:
      return 30
    case 0:
      return 40
    case 1:
      return 60
    case 2:
      return 80
    case 3:
      return 120
  }

  if (delta <= -1) {
    return 10
  } else if (delta >= 4) {
    return 160
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEncounterStore, import.meta.hot))
}
