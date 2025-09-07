<template>
  <q-btn label="v2.0.0" icon-right="expand_more" no-caps outline size="md" class="q-mr-md">
    <q-menu>
      <q-list padding style="min-width: 100px">
        <q-item clickable v-close-popup>
          <q-item-section side>
            <q-icon name="description" />
          </q-item-section>
          <q-item-section>Release notes</q-item-section>
        </q-item>
        <q-item clickable v-close-popup>
          <q-item-section side>
            <q-icon name="bug_report" />
          </q-item-section>
          <q-item-section>Report a bug</q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable v-close-popup>
          <q-item-section side>
            <q-icon>
              <img class=".q-item__section--side" src="../assets/github-mark/github-mark.svg" />
            </q-icon>
          </q-item-section>
          <q-item-section>Repository</q-item-section>
        </q-item>
        <q-separator />
        <q-item clickable v-close-popup>
          <q-item-section side>
            <q-icon name="info" />
          </q-item-section>
          <q-item-section>Help &amp; Feedback</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup></script>

<style scoped></style>
