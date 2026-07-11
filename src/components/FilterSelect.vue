<template>
  <q-select
    :model-value="model"
    :options="options"
    :label="label"
    multiple
    outlined
    dense
    options-dense
    clearable
    use-chips
    use-input
    input-debounce="100"
    @filter="filterOptions"
    @update:model-value="model = $event ?? []"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ allOptions: string[]; label: string }>();
const model = defineModel<string[]>({ required: true });

const options = ref<string[]>(props.allOptions);
watch(
  () => props.allOptions,
  (all) => (options.value = all),
);

function filterOptions(val: string, update: (fn: () => void) => void) {
  update(() => {
    const needle = val.toLowerCase();
    options.value = needle ? props.allOptions.filter((o) => o.toLowerCase().includes(needle)) : props.allOptions;
  });
}
</script>
