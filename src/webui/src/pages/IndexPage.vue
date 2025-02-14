<template>
  <q-page class="q-pa-md q-gutter-md">
    <ThreatBar
      :xp-cost="xpCost"
      :xp-budget="xpBudget"
      :xp-pool="xpPool"
    />

    <CreaturesTable />
  </q-page>
</template>

<script setup>
import CreaturesTable from 'components/CreaturesTable.vue'
import ThreatBar from 'components/ThreatBar.vue'
import { useEncounterStore } from 'stores/encounter-store.ts'

const encounterStore = useEncounterStore()
let xpCost = encounterStore.xpCost
let xpBudget = encounterStore.xpBudget
let xpPool = encounterStore.xpPool
</script>

<style scoped>
/* Hide number input arrows */
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type='number'] {
  -moz-appearance: textfield;
}
</style>
