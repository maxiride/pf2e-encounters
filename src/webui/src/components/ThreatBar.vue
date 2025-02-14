<template>
  <q-linear-progress stripe rounded size="20px" :value="xpPool" :color="barColor()">
    <div class="flex-center flex absolute-full">
      <q-badge
        :style="{
          position: 'absolute',
          left: 25 * cssOffset + '%',
          transform: 'translate(-50%)',
        }"
        color="light-green"
        text-color="black"
        :label="'Trivial ' + xpBudget.trivial"
      />
      <q-badge
        :style="{
          position: 'absolute',
          left: 37.5 * cssOffset + '%',
          transform: 'translate(-50%)',
        }"
        color="lime"
        text-color="black"
        :label="'Low ' + xpBudget.low"
      />
      <q-badge
        :style="{
          position: 'absolute',
          left: 50 * cssOffset + '%',
          transform: 'translate(-50%)',
        }"
        color="amber"
        text-color="black"
        :label="'Moderate ' + xpBudget.moderate"
      />
      <q-badge
        :style="{
          position: 'absolute',
          left: 75 * cssOffset + '%',
          transform: 'translate(-50%)',
        }"
        color="orange"
        text-color="black"
        :label="'Severe ' + xpBudget.severe"
      />
      <q-badge
        :style="{
          position: 'absolute',
          left: 100 * cssOffset + '%',
          transform: 'translate(-100%)',
        }"
        color="deep-orange"
        text-color="black"
        :label="'Extreme ' + xpBudget.extreme"
      />
    </div>
  </q-linear-progress>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  xpPool: {
    type: Number,
    required: true,
    default: 1,
  },
  xpBudget: {
    type: Object,
    required: true,
    default: () => {
      return {
        trivial: 0,
        low: 0,
        moderate: 0,
        severe: 0,
        extreme: 0,
      }
    },
  },
  xpCost: {
    type: Number,
    required: true,
    default: 0,
  },
})

const cssOffset = computed(() => {
  return props.xpPool < 1 ? 1 : 1 / props.xpPool
})

function barColor() {
  if (props.xpBudget.trivial < props.xpCost && props.xpCost <= props.xpBudget.low) {
    return 'lime'
  } else if (props.xpBudget.low < props.xpCost && props.xpCost <= props.xpBudget.moderate) {
    return 'amber'
  } else if (props.xpBudget.moderate < props.xpCost && props.xpCost <= props.xpBudget.severe) {
    return 'orange'
  } else if (props.xpBudget.severe < props.xpCost && props.xpCost <= props.xpBudget.extreme) {
    return 'deep-orange'
  } else if (props.xpBudget.extreme < props.xpCost) {
    return 'black'
  }

  return 'light-green'
}
</script>

<style scoped></style>
