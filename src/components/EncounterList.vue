<template>
  <q-card style="height: 84vh">
    <p>Encounter cost</p>
    <p>Party Experience/Player experience</p>
    <q-virtual-scroll :items="list" v-slot="{ item, index }" style="height: 73vh">
      <q-item :key="index">
        <q-item-section>
          Name: {{ item.name }}
          <q-item-label>Item with caption</q-item-label>
          <q-item-label caption>Caption</q-item-label>
        </q-item-section>
      </q-item>
    </q-virtual-scroll>
  </q-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Creature, useEncounterStore } from 'stores/encounter-store';

const list = ref<Creature[]>([]);

const encounterStore = useEncounterStore();

onMounted(() => {
  list.value = encounterStore.encounterCreatures;
});
</script>

<style scoped>
:where(*) {
  display: block; /* Filter only block elements */
  outline: 1px solid #ff0000;
}
</style>
