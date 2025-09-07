<template>
  <p class="text-h5">Creatures loaded: {{ creatures.length }}</p>

  <ul>
    <li v-for="[key, value] in Object.entries(indexedProperties)" :key="key">
      {{ key }} with {{ value.uniqueValues.length }} unique values
      <ul>
        <li v-for="v in value.uniqueValues" :key="v">
          {{ v }}
        </li>
      </ul>
    </li>
  </ul>

  <p class="text-h5">There are {{ fields ? fields.length : 0 }}
    creature fields:</p>
  <ul>
    <li v-for="(field, index) in fields" :key="index">
      {{ field }}
      <ul v-if="Array.isArray(field)">
        <li v-for="(subField, subKey) in field" :key="subKey">
          {{ subKey }}: {{ subField }}
        </li>
      </ul>
    </li>
  </ul>

</template>

<script setup lang="ts">
import { useCreaturesStore } from 'stores/creatures-store.js'

const creaturesStore = useCreaturesStore()
const indexedProperties = creaturesStore.indexedProperties
const creatures = creaturesStore.creatures
const fields = creaturesStore.enumerateCreatureFields()
</script>

<style scoped></style>
