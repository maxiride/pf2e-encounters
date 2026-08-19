<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="bg-primary">
      <q-toolbar>
        <q-avatar size="lg" square>
          <img src="../assets/stabbed-note.png" alt="logo" />
        </q-avatar>
        <q-toolbar-title class="app-title">Pathfinder 2e Encounter Builder</q-toolbar-title>
        <q-space />
        <q-btn
          flat
          no-caps
          dense
          icon="feedback"
          label="Feedback"
          class="q-mr-sm"
          tag="a"
          href="https://pf2e-encounters.fider.io/"
          target="_blank"
          rel="noopener"
        />
        <q-btn flat no-caps dense label="License" class="q-mr-sm" @click="showLicense = true" />
        <MainMenu class="q-mr-xl" @whats-new="showWhatsNew = true" />
        <OctocatCorner />
      </q-toolbar>
    </q-header>

    <q-page-container class="bg-grey-1">
      <router-view />
    </q-page-container>

    <LicenseDialog v-model="showLicense" />
    <WhatsNewDialog v-model="showWhatsNew" />
    <DonationNudge />
  </q-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import OctocatCorner from 'components/OctocatCorner.vue';
import LicenseDialog from 'components/LicenseDialog.vue';
import WhatsNewDialog from 'components/WhatsNewDialog.vue';
import MainMenu from 'components/MainMenu.vue';
import DonationNudge from 'components/DonationNudge.vue';

const showLicense = ref(false);
const showWhatsNew = ref(false);

// Bump the suffix on the next major release to announce it again.
const WHATS_NEW_SEEN_KEY = 'pf2e-encounters:seen-release:v2';

onMounted(() => {
  if (!localStorage.getItem(WHATS_NEW_SEEN_KEY)) {
    localStorage.setItem(WHATS_NEW_SEEN_KEY, '1');
    showWhatsNew.value = true;
  }
});
</script>

<style scoped>
.app-title {
  font-family: becker-regular, sans-serif;
  font-size: x-large;
  color: #e9c58e;
  flex: 0 1 auto;
}
</style>
