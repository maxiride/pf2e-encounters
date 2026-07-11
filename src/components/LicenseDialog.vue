<template>
  <q-dialog v-model="visible">
    <q-card flat style="width: 640px; max-width: 90vw">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">License information</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="text-body2">
        <p>
          This encounter building tool uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's
          <a href="https://paizo.com/licenses/communityuse" target="_blank" rel="noopener">Community Use Policy</a>. We are
          expressly prohibited from charging you to use or access this content. This tool is not published, endorsed, or
          specifically approved by Paizo nor Archives of Nethys. For more information about Paizo Inc. and Paizo
          products, visit <a href="https://paizo.com" target="_blank" rel="noopener">paizo.com</a>.
        </p>
        <p>
          Creature data is sourced from the
          <a href="https://2e.aonprd.com" target="_blank" rel="noopener">Archives of Nethys</a>, the official Pathfinder 2e
          reference. Full license text, including the Open Game License and per-book copyright notices, is available in
          <a
            href="https://github.com/maxiride/pf2e-encounters/blob/main/LICENSE_AON.md"
            target="_blank"
            rel="noopener"
            >LICENSE_AON.md</a
          >.
        </p>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
const visible = defineModel<boolean>({ required: true });
</script>
