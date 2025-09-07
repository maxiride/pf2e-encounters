<template>
  <q-card style="height: 84vh">
    <p>Encounter cost</p>
    <p>Party Experience/Plaer experience</p>
    <q-virtual-scroll
      :items="list"
      v-slot="{ item, index }"
      style="height: 73vh"
    >
      <q-item :key="index">
        <q-item-section>
          Name: {{ item.name}}
          <q-item-label>Item with caption</q-item-label>
          <q-item-label caption>Caption</q-item-label>
        </q-item-section>
      </q-item>
    </q-virtual-scroll>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const list = ref([])

for (let i = 1; i <= 20; i++) {
  list.value.push({ name: `Item ${i}`, id: i })
}
</script>

<style scoped>
:where(*) {
  display: block; /* Filter only block elements */
  outline: 1px solid #ff0000;
}
</style>
