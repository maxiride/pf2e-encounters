<template>
  <q-layout view="hHh lpR fFf">

    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>
          <q-avatar>
            <!--           Do we need one at all?-->
          </q-avatar>
          Pathfinder 2 Encounter builder
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view/>
    </q-page-container>

  </q-layout>
</template>

<script>
export default {
  data() {
    return {}
  }
}
</script>
