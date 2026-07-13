<template>
  <q-card flat bordered>
    <!-- Filter bar -->
    <q-card-section class="q-pb-none">
      <div class="row q-col-gutter-sm items-center">
        <div class="col-12 col-md-4">
          <q-input v-model="search" outlined dense clearable placeholder="Search by name…" debounce="150">
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-auto">
          <q-btn-toggle
            v-model="typeFilter"
            no-caps
            unelevated
            dense
            toggle-color="primary"
            :options="[
              { label: 'All', value: 'all' },
              { label: 'Monsters', value: 'monsters' },
              { label: 'NPCs', value: 'npcs' },
            ]"
            class="type-toggle"
          />
        </div>
        <div class="col-12 col-md-3 q-px-md">
          <q-range
            v-model="levelRange"
            dense
            :min="levelBounds.min"
            :max="levelBounds.max"
            :step="1"
            label
            switch-label-side
            color="primary"
          />
          <div class="text-caption text-grey-7 text-center" style="margin-top: -6px">
            Level {{ levelRange.min }} – {{ levelRange.max }}
          </div>
        </div>
        <div class="col">
          <q-btn
            flat
            dense
            no-caps
            color="grey-8"
            :icon="showAdvanced ? 'expand_less' : 'tune'"
            :label="showAdvanced ? 'Less filters' : 'More filters'"
            @click="showAdvanced = !showAdvanced"
          />
          <q-btn v-if="filtersActive" flat dense no-caps color="negative" icon="filter_alt_off" label="Reset" @click="resetFilters" />
        </div>
        <div class="col-auto text-caption text-grey-7">{{ filteredCreatures.length }} creatures</div>
      </div>

      <q-slide-transition>
        <div v-show="showAdvanced" class="row q-col-gutter-sm q-pt-sm">
          <div class="col-6 col-md-2">
            <q-select
              v-model="rarityFilter"
              :options="metadata.rarities"
              label="Rarity"
              multiple
              outlined
              dense
              options-dense
              clearable
              use-chips
            />
          </div>
          <div class="col-6 col-md-2">
            <q-select
              v-model="sizeFilter"
              :options="metadata.sizes"
              label="Size"
              multiple
              outlined
              dense
              options-dense
              clearable
              use-chips
            />
          </div>
          <div class="col-6 col-md-2">
            <q-select
              v-model="alignmentFilter"
              :options="metadata.alignments"
              label="Alignment"
              multiple
              outlined
              dense
              options-dense
              clearable
              use-chips
            />
          </div>
          <div class="col-6 col-md-2">
            <FilterSelect v-model="familyFilter" :all-options="metadata.families" label="Family" />
          </div>
          <div class="col-6 col-md-2">
            <FilterSelect v-model="traitsFilter" :all-options="metadata.traits" label="Traits" />
          </div>
          <div class="col-6 col-md-2">
            <FilterSelect v-model="sourcesFilter" :all-options="metadata.sources" label="Source" />
          </div>
        </div>
      </q-slide-transition>
    </q-card-section>

    <!-- Table -->
    <q-table
      flat
      dense
      virtual-scroll
      style="height: 65vh"
      :columns="columns"
      :rows="filteredCreatures"
      row-key="url"
      v-model:pagination="pagination"
      hide-bottom
      no-data-label="No creature matches the selected filters."
      @row-dblclick="(_, row) => add(row)"
    >
      <template v-slot:body-cell-name="props">
        <q-td :props="props">
          <a :href="aonUrl(props.row)" target="_blank" rel="noopener" class="creature-link">{{ props.row.name }}</a>
          <span v-if="props.row.family" class="text-grey-6 q-ml-xs">· {{ props.row.family }}</span>
        </q-td>
      </template>
      <template v-slot:body-cell-rarity="props">
        <q-td :props="props">
          <q-badge outline :color="rarityColor(props.row.rarity)" :label="props.row.rarity" />
        </q-td>
      </template>
      <template v-slot:body-cell-type="props">
        <q-td :props="props">
          <q-badge outline :color="props.row.npc ? 'teal' : 'brown'" :label="props.row.npc ? 'NPC' : 'Monster'" />
        </q-td>
      </template>
      <template v-slot:body-cell-add="props">
        <q-td :props="props">
          <q-btn icon="add" size="sm" color="primary" round flat dense @click="add(props.row)">
            <q-tooltip>Add to encounter</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
  </q-card>
</template>

<script setup lang="ts">
import { computed, markRaw, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import type { QTableColumn } from 'quasar';
import { useCreaturesStore } from 'stores/creatures-store';
import type { Creature } from 'stores/creatures-store';
import { useEncounterStore } from 'stores/encounter-store';
import FilterSelect from 'components/FilterSelect.vue';

const creaturesStore = useCreaturesStore();
const { creatures, metadata } = storeToRefs(creaturesStore);
const encounterStore = useEncounterStore();

// --- filter state ---
const search = ref('');
const typeFilter = ref<'all' | 'monsters' | 'npcs'>('all');
const levelBounds = computed(() => metadata.value.levels);
const levelRange = ref({ min: levelBounds.value.min, max: levelBounds.value.max });
const showAdvanced = ref(false);
const rarityFilter = ref<string[] | null>(null);
const sizeFilter = ref<string[] | null>(null);
const alignmentFilter = ref<string[] | null>(null);
const familyFilter = ref<string[]>([]);
const traitsFilter = ref<string[]>([]);
const sourcesFilter = ref<string[]>([]);

// widen the range once real metadata arrives
watch(levelBounds, (b) => {
  levelRange.value = { min: b.min, max: b.max };
});

const filtersActive = computed(
  () =>
    search.value !== '' ||
    typeFilter.value !== 'all' ||
    levelRange.value.min !== levelBounds.value.min ||
    levelRange.value.max !== levelBounds.value.max ||
    (rarityFilter.value?.length ?? 0) > 0 ||
    (sizeFilter.value?.length ?? 0) > 0 ||
    (alignmentFilter.value?.length ?? 0) > 0 ||
    familyFilter.value.length > 0 ||
    traitsFilter.value.length > 0 ||
    sourcesFilter.value.length > 0,
);

function resetFilters() {
  search.value = '';
  typeFilter.value = 'all';
  levelRange.value = { min: levelBounds.value.min, max: levelBounds.value.max };
  rarityFilter.value = null;
  sizeFilter.value = null;
  alignmentFilter.value = null;
  familyFilter.value = [];
  traitsFilter.value = [];
  sourcesFilter.value = [];
}

const filteredCreatures = computed(() => {
  const q = (search.value ?? '').toLowerCase();
  const result = creatures.value.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (typeFilter.value === 'monsters' && c.npc) return false;
    if (typeFilter.value === 'npcs' && !c.npc) return false;
    if (c.level < levelRange.value.min || c.level > levelRange.value.max) return false;
    if (rarityFilter.value?.length && !rarityFilter.value.includes(c.rarity)) return false;
    if (sizeFilter.value?.length && !c.size.some((s) => sizeFilter.value!.includes(s))) return false;
    if (alignmentFilter.value?.length && !alignmentFilter.value.includes(c.alignment)) return false;
    if (familyFilter.value.length && !familyFilter.value.includes(c.family)) return false;
    if (traitsFilter.value.length && !traitsFilter.value.every((t) => c.traits.includes(t))) return false;
    if (sourcesFilter.value.length && !c.sources.some((s) => sourcesFilter.value.includes(s))) return false;
    return true;
  });
  // Quasar's virtual-scroll size calc breaks under a deeply-reactive items array
  // (see https://quasar.dev/vue-components/virtual-scroll — "do not wrap the
  // array ... with ref()/computed()/reactive()"). markRaw keeps the *array
  // itself* out of Vue's reactivity proxy while this computed still re-runs
  // and re-renders normally whenever a filter changes.
  return markRaw(result);
});

// --- table ---
// stable ref (not an inline literal) so virtual-scroll's internal state isn't
// reset by every unrelated re-render
const pagination = ref({ sortBy: 'name', descending: false, rowsPerPage: 0 });

const columns: QTableColumn[] = [
  { name: 'name', label: 'Name', align: 'left', field: 'name', sortable: true },
  { name: 'level', label: 'Level', align: 'center', field: 'level', sortable: true },
  { name: 'hp', label: 'HP', align: 'center', field: 'hp', sortable: true },
  { name: 'ac', label: 'AC', align: 'center', field: 'ac', sortable: true },
  { name: 'size', label: 'Size', align: 'left', field: (row: Creature) => row.size.join(' / '), sortable: true },
  { name: 'rarity', label: 'Rarity', align: 'left', field: 'rarity', sortable: true },
  { name: 'type', label: 'Type', align: 'left', field: 'npc', sortable: true },
  { name: 'add', label: '', field: () => '', align: 'right' },
];

function aonUrl(row: Creature) {
  return `https://2e.aonprd.com${row.url}`;
}

function rarityColor(rarity: string) {
  switch (rarity) {
    case 'Uncommon':
      return 'orange-8';
    case 'Rare':
      return 'blue-8';
    case 'Unique':
      return 'purple-7';
    default:
      return 'grey-7';
  }
}

function add(row: Creature) {
  encounterStore.addCreature(row.name, row.level, row.url, row.npc);
}
</script>

<style lang="scss" scoped>
.creature-link {
  color: $primary;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.type-toggle {
  border: 1px solid $separator-color;
  border-radius: 4px;
}
</style>
