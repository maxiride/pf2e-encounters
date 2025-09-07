<template>
  <q-table
    title="Creatures"
    :columns="columns"
    :rows="creatures"
    :visible-columns="visibleColumns"
    :pagination="defaultPagination"
    no-data-label="The selected filter does not match any creature."
    dense
    style="height: 100%"
    @row-dblclick="addCreatureToEncounter"
  >
    <template v-slot:top-right>
      <q-select
        v-model="visibleColumns"
        multiple
        outlined
        dense
        options-dense
        display-value="Show\Hide columns"
        emit-value
        map-options
        :options="showHideColumnOptions"
        option-value="name"
        options-cover
        style="min-width: 150px"
      >
        <template v-if="!isVisibleColumnsDefault" v-slot:append>
          <q-icon name="cancel" @click.stop.prevent="visibleColumns = defaultVisibleColumns" class="cursor-pointer">
            <q-tooltip> Reset to default</q-tooltip>
          </q-icon>
        </template>
      </q-select>
    </template>
    <template v-slot:body-cell-name="props">
      <td class="text-left">
        <q-btn
          icon="search"
          size="xs"
          color="grey-5"
          round
          dense
          unelevated
          :href="`https://2e.aonprd.com${props.row.url}&source=pf2e-encounters`"
          target="_blank"
          style="margin-bottom: 3px"
        />
        {{ props.value }}
      </td>
    </template>
    <template v-slot:body-cell-actions>
      <td class="text-left">
        <q-btn icon="add" size="xs" color="green-5" dense unelevated />
      </td>
    </template>
  </q-table>
</template>

<script setup lang="ts">
import { useCreaturesStore, Creature } from 'stores/creatures-store.js';
import { computed, ref } from 'vue';
import { useEncounterStore } from 'stores/encounter-store';
import { QTableColumn } from 'quasar';

const columns: QTableColumn[] = [
  {
    name: 'name',
    label: 'Name',
    align: 'left',
    field: 'name',
    sortable: true,
    required: true,
  },
  {
    name: 'level',
    label: 'Level',
    field: (row) => Number(row.level),
    sortable: true,
    required: true,
  },
  {
    name: 'size',
    label: 'Size',
    field: 'size',
    sortable: true,
    align: 'left',
    required: true,
  },
  {
    name: 'family',
    label: 'Family',
    field: 'creature_family',
    sortable: true,
    align: 'left',
  },
  {
    name: 'alignment',
    label: 'Alignment',
    field: 'alignment',
    sortable: true,
    align: 'left',
  },
  {
    name: 'creature_type',
    label: 'Creature Type',
    field: (row) => (row.url.toLowerCase().includes('npc') ? 'NPC' : 'Monster'),
    sortable: true,
    align: 'left',
    style: 'width:150px',
  },
  {
    name: 'traits',
    label: 'Traits',
    field: 'trait',
    sortable: false,
    align: 'left',
  },
  {
    name: 'rarity',
    label: 'Rarity',
    field: 'rarity',
    sortable: true,
    align: 'left',
  },
  {
    name: 'actions',
    label: '',
    field: '',
    align: 'left',
    required: true,
  },
];

const defaultVisibleColumns: string[] = ['family', 'traits', 'alignment'];
const visibleColumns = ref<string[]>([]);
visibleColumns.value = defaultVisibleColumns;

// Only columns without the required: true attribute are selectable in the show/hide q-select.
const showHideColumnOptions = computed(() => {
  return columns.filter((column) => !column.required);
});

const isVisibleColumnsDefault = computed(() => {
  // Step 1: Check the lengths of both arrays
  if (visibleColumns.value.length !== defaultVisibleColumns.length) {
    // If the lengths are different, the arrays cannot be equal
    return false;
  }

  // Step 2: Check if all elements in arr1 are present in arr2
  const allInArr2 = visibleColumns.value.every((item) => defaultVisibleColumns.includes(item));

  // Step 3: Check if all elements in arr2 are present in arr1
  const allInArr1 = defaultVisibleColumns.every((item) => visibleColumns.value.includes(item));

  // Step 4: Return true only if both conditions are met
  return allInArr2 && allInArr1;
});

const defaultPagination = {
  sortBy: 'name',
  descending: false,
  page: 1,
  rowsPerPage: 20,
};

const creaturesStore = useCreaturesStore();
const creatures = creaturesStore.creatures;

const encounterStore = useEncounterStore();

function addCreatureToEncounter(evt: Event, row: Creature) {
  encounterStore.addCreature(row.name, Number(row.level));
}
</script>

<style lang="scss" scoped>
tr:nth-child(even) {
  background-color: $grey-1 !important;
}
</style>
