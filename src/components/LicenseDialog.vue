<template>
  <!-- Dialog box with license text -->
  <q-dialog :value="visible" @hide="visible = false">
    <q-card style="width: 80vw; max-width: 80vw">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">License information</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
<!--        <q-markdown :src="license" task-lists-label />-->
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// import license from '../../public/LICENSE_AON.md'

const visible = defineModel()

</script>

<style scoped></style>
