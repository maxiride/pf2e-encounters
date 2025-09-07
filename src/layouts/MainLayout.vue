<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="text-white" style="background: #581911">
      <q-toolbar>
        <q-toolbar-title style="font-family: becker-regular, sans-serif; font-size: x-large; color: #e9c58e">
          <q-avatar data-v-step="0" size="lg" square>
            <img src="../assets/stabbed-note.png" alt="logo" />
          </q-avatar>
          Pathfinder 2e Encounter builder
        </q-toolbar-title>
        <q-space />
        <div style="transform: translate(-55px)">
          <q-btn unelevated label="donate" />
          <q-btn unelevated label="submit a request" />
          <q-btn unelevated label="License info" />
          <MainMenu />
        </div>
        <OctocatCorner />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <LicenseDialog :visible="showLicense" />
  </q-layout>
</template>

<script setup lang="ts">
import OctocatCorner from 'components/OctocatCorner.vue';
import LicenseDialog from 'components/LicenseDialog.vue';
import MainMenu from 'components/MainMenu.vue';

const showLicense = false;
</script>
