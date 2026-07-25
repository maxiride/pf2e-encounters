<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <ThreatBar />
      </div>
      <div class="col-12 col-md-8 col-lg-9">
        <CreaturesTable />
      </div>
      <div class="col-12 col-md-4 col-lg-3">
        <EncounterList class="encounter-panel" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useQuasar } from 'quasar';
import CreaturesTable from 'components/CreaturesTable.vue';
import ThreatBar from 'components/ThreatBar.vue';
import EncounterList from 'components/EncounterList.vue';
import { useCreaturesStore } from 'stores/creatures-store';

const creaturesStore = useCreaturesStore();
const $q = useQuasar();

watch(
  () => creaturesStore.isLoading,
  (isLoading) => {
    if (isLoading) {
      $q.loading.show({ delay: 400, message: 'Loading creatures…' });
    } else {
      $q.loading.hide();
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.encounter-panel {
  position: sticky;
  top: 66px;
  max-height: calc(100vh - 82px);
}
</style>
