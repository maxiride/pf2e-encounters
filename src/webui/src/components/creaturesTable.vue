<template>
  <div class="">
    <q-table
      style="height: 78vh"
      virtual-scroll
      title="Creatures"
      :data="data"
      :columns="columns"
      row-key="name"
      :pagination="{rowsPerPage: 0}"
      :rows-per-page-options="[0]"
      :visible-columns="visibleColumns"
      no-data-label="The current filters didn't yield any result"
      @row-dblclick="(evt, row, index) => $emit('add-row', row)"
      dense
      selection="single"
    >
      <template v-slot:top>
        <span class="q-table__title">Creatures</span>
        <q-space/>
        <q-select
          v-model="visibleColumns"
          multiple
          outlined
          dense
          options-dense
          display-value="Show\Hide columns"
          emit-value
          map-options
          :options="columns"
          option-value="name"
          options-cover
          style="min-width: 150px"
        />
      </template>

      <template v-slot:body-selection="scope">
        <q-btn icon="search" size="xs" color="grey-5" round dense unelevated @click="redirectToAON(scope.row)"/>
      </template>

      <template v-slot:body-cell-traits="props">
        <q-td :props="props">
          {{props.value.join(", ")}}
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script>
export default {
  name: "creaturesTable",
  props: ['data'],

  data() {
    return {
      visibleColumns: ['name', 'level', 'size', 'family', 'traits', 'alignment'],
      columns: [
        {
          name: 'name',
          label: 'Name',
          align: 'left',
          field: 'name',
          sortable: true,
          required: true,

        },
        {
          name: 'level',
          label: 'Level',
          field: 'level',
          sortable: true,
          required: true,
        },
        {
          name: 'size',
          label: 'Size',
          field: 'size',
          sortable: true,
          align: 'left',
        },
        {
          name: 'family',
          label: 'Family',
          field: 'family',
          sortable: true,
          align: 'left',
        },
        {
          name: 'alignment',
          label: 'Alignment',
          field: 'alignment',
          sortable: true,
          align: 'left',
        },
        {
          name: 'creature_type',
          label: 'Creature Type',
          field: 'creature_type',
          sortable: true,
          align: 'left',
          style: 'width:150px'
        },
        {
          name: 'traits',
          label: 'Traits',
          field: 'traits',
          sortable: false,
          align: 'left',
        },
        {
          name: 'rarity',
          label: 'Rarity',
          field: 'rarity',
          sortable: true,
          align: 'left',
        },


      ],
      defaultPagination: {
        sortBy: 'name',
        descending: false,
        page: 1,
        rowsPerPage: 10
      }
    }
  },

  methods: {
    redirectToAON(row) {
      window.open("https://2e.aonprd.com/Monsters.aspx?ID=" + row.id, "_blank");
    }
  }
}
</script>

<style lang="scss">
tr:nth-child(even) {
  background-color: $grey-1 !important;
}
</style>
