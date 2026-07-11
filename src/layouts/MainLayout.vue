<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="bg-primary">
      <q-toolbar>
        <q-avatar size="lg" square>
          <img src="../assets/stabbed-note.png" alt="logo" />
        </q-avatar>
        <q-toolbar-title class="app-title">Pathfinder 2e Encounter Builder</q-toolbar-title>
        <q-space />
        <q-btn flat no-caps dense label="License" class="q-mr-sm" @click="showLicense = true" />
        <MainMenu class="q-mr-xl" />
        <OctocatCorner />
      </q-toolbar>
    </q-header>

    <q-page-container class="bg-grey-1">
      <router-view />
    </q-page-container>

    <LicenseDialog v-model="showLicense" />
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import OctocatCorner from 'components/OctocatCorner.vue';
import LicenseDialog from 'components/LicenseDialog.vue';
import MainMenu from 'components/MainMenu.vue';

const showLicense = ref(false);
</script>

<style scoped>
.app-title {
  font-family: becker-regular, sans-serif;
  font-size: x-large;
  color: #e9c58e;
  flex: 0 1 auto;
}
</style>
