<template>
  <q-page class="q-pa-md q-gutter-md">
    <ThreatBar class="col-12" :xp-cost="xpCost" :xp-budget="xpBudget" :xp-pool="xpPool" />

    <div class="row col-12">
      <CreaturesTable class="col-9" />

      <EncounterList class="col" />
    </div>

  </q-page>
</template>

<script setup>
import CreaturesTable from 'components/CreaturesTable.vue'
import ThreatBar from 'components/ThreatBar.vue'
import { useEncounterStore } from 'stores/encounter-store.ts'
import EncounterList from 'components/EncounterList.vue'

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
