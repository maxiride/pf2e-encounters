<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="text-white" style="background: #581911">
      <q-toolbar>
        <q-toolbar-title
          style="
            font-family: becker-regular, sans-serif;
            font-size: x-large;
            color: #e9c58e;
          "
        >
          <q-avatar data-v-step="0" size="lg" square>
            <img src="~assets/stabbed-note.png" alt="logo" />
          </q-avatar>
          Pathfinder 2e Encounter builder
        </q-toolbar-title>
        <q-space />
        <div style="transform: translate(-55px)">
          <q-btn unelevated label="Tour" @click="startTour" />
          <q-btn unelevated label="License info" @click="showLicense = true" />
        </div>
        <octocat />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <license :visible.sync="showLicense" @hide-license="showLicense = false" />
  </q-layout>
</template>

<script>
import octocat from "components/octocat";
import license from "components/licenseDialog";

export default {
  components: {
    license,
    octocat,
  },
  data() {
    return {
      showLicense: false,
    };
  },
  methods: {
    startTour() {
      this.$root.$emit("start-tour");
    },
  },
};
</script>

<style></style>
