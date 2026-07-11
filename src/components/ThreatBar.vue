<template>
  <div class="threat-bar">
    <!-- Track with fill -->
    <div class="track">
      <div class="fill" :class="`bg-${fillColor}`" :style="{ width: fillPercent + '%' }" />
      <!-- Threshold markers -->
      <div v-for="mark in marks" :key="mark.label" class="mark" :style="{ left: mark.percent + '%' }">
        <div class="tick" />
      </div>
    </div>
    <!-- Labels under the track -->
    <div class="labels">
      <div
        v-for="mark in marks"
        :key="mark.label"
        class="label text-caption"
        :class="xpCost > mark.value ? 'text-weight-bold' : 'text-grey-7'"
        :style="{ left: mark.percent + '%' }"
      >
        {{ mark.label }}<span class="gt-xs"> {{ mark.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useEncounterStore } from 'stores/encounter-store';
import { THREAT_COLORS } from 'components/threat-colors';

const encounterStore = useEncounterStore();
const { xpBudget, xpCost, threat } = storeToRefs(encounterStore);

// Scale the bar so the extreme budget sits at 90%; overshoot compresses the scale instead of overflowing.
const scale = computed(() => Math.max(xpBudget.value.extreme / 0.9, xpCost.value));

const fillPercent = computed(() => Math.min(100, (xpCost.value / scale.value) * 100));

const fillColor = computed(() => THREAT_COLORS[threat.value] ?? 'grey-6');

const marks = computed(() => {
  const b = xpBudget.value;
  return [
    { label: 'Trivial', value: b.trivial },
    { label: 'Low', value: b.low },
    { label: 'Moderate', value: b.moderate },
    { label: 'Severe', value: b.severe },
    { label: 'Extreme', value: b.extreme },
  ].map((m) => ({ ...m, percent: (m.value / scale.value) * 100 }));
});
</script>

<style lang="scss" scoped>
.threat-bar {
  width: 100%;
}

.track {
  position: relative;
  height: 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 6px;
  transition:
    width 0.3s ease,
    background-color 0.3s ease;
}

.mark {
  position: absolute;
  top: 0;
  height: 100%;
}

.tick {
  width: 2px;
  height: 100%;
  background: rgba(0, 0, 0, 0.35);
}

.labels {
  position: relative;
  height: 18px;
  margin-top: 2px;
}

.label {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}
</style>
