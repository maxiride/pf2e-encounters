<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="bg-primary">
      <q-toolbar>
        <q-avatar size="lg" square>
          <img src="../assets/stabbed-note.png" alt="logo" />
        </q-avatar>
        <q-toolbar-title class="app-title">Pathfinder 2e Encounter Builder</q-toolbar-title>
        <q-space />
        <a href="https://www.buymeacoffee.com/maxiride" target="_blank" rel="noopener" class="q-mr-md donate-link">
          <img
            src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=maxiride&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff"
            alt="Buy me a coffee"
          />
        </a>
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
  </q-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import OctocatCorner from 'components/OctocatCorner.vue';
import LicenseDialog from 'components/LicenseDialog.vue';
import WhatsNewDialog from 'components/WhatsNewDialog.vue';
import MainMenu from 'components/MainMenu.vue';

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

.donate-link img {
  display: block;
  height: 36px;
  width: auto;
}
</style>
