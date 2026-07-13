<template>
  <q-dialog v-model="visible">
    <q-card flat style="width: 560px; max-width: 90vw">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">The Encounter Builder just got a big update</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="text-body2">
        <q-list separator>
          <q-item v-for="item in highlights" :key="item.title" class="q-px-none">
            <q-item-section avatar top>
              <q-icon :name="item.icon" color="primary" size="28px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ item.title }}</q-item-label>
              <q-item-label caption class="text-body2">{{ item.body }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <a
          href="https://github.com/maxiride/pf2e-encounters/blob/main/RELEASE_NOTES.md"
          target="_blank"
          rel="noopener"
          class="text-caption"
          >Full release notes</a
        >
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps color="primary" label="Got it" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
const visible = defineModel<boolean>({ required: true });

const highlights = [
  {
    icon: 'auto_awesome',
    title: 'Way more creatures to pick from',
    body: 'The database jumped from about 3,300 to over 4,600 monsters and NPCs — including nearly 1,000 NPCs that were missing entirely before.',
  },
  {
    icon: 'sync',
    title: 'Always up to date, automatically',
    body: "Creature data now refreshes itself every month. New books show up here on their own — nobody has to remember to update anything.",
  },
  {
    icon: 'filter_alt',
    title: 'Find what you need faster',
    body: 'Search and filter by rarity, size, alignment, creature family, and source book — not just name and level.',
  },
  {
    icon: 'warning',
    title: 'A heads-up on unfair fights',
    body: "If a monster is way too strong or too weak for your party, you'll see a warning instead of a misleading difficulty rating.",
  },
  {
    icon: 'design_services',
    title: 'A cleaner, faster interface',
    body: 'The whole encounter builder has been redesigned to be simpler to use, on desktop and mobile alike.',
  },
];
</script>
