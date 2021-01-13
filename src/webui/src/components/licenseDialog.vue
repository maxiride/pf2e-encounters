<template>
  <!-- Dialog box with license text -->
  <q-dialog :value="isVisible" @hide="$emit('hide-license')">
    <q-card style="width: 80vw; max-width: 80vw">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">License information</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-markdown :src="license" task-lists-label />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import license from "../../public/LICENSE.md";

export default {
  name: "licenseDialog",
  props: ["visible"],
  data() {
    return {
      license: license,
    };
  },
  computed: {
    isVisible() {
      return this.visible;
    },
  },
};
</script>

<style scoped></style>
