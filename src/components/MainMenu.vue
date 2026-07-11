<template>
  <q-btn label="v2" icon-right="expand_more" no-caps flat dense>
    <q-menu>
      <q-list padding style="min-width: 200px">
        <q-item clickable v-close-popup tag="a" :href="`${REPO}/blob/main/CHANGELOG.md`" target="_blank" rel="noopener">
          <q-item-section side>
            <q-icon name="description" />
          </q-item-section>
          <q-item-section>Release notes</q-item-section>
        </q-item>
        <q-item clickable v-close-popup tag="a" :href="`${REPO}/issues/new`" target="_blank" rel="noopener">
          <q-item-section side>
            <q-icon name="bug_report" />
          </q-item-section>
          <q-item-section>Report a bug</q-item-section>
        </q-item>
        <q-item clickable v-close-popup tag="a" :href="`${REPO}/discussions`" target="_blank" rel="noopener">
          <q-item-section side>
            <q-icon name="forum" />
          </q-item-section>
          <q-item-section>Help &amp; feedback</q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable v-close-popup tag="a" :href="REPO" target="_blank" rel="noopener">
          <q-item-section side>
            <q-icon name="code" />
          </q-item-section>
          <q-item-section>Repository</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
const REPO = 'https://github.com/maxiride/pf2e-encounters';
</script>
