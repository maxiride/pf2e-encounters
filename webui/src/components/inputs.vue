<template>
  <div class="q-pa-md">
    <q-select
      filled
      label="Select multiple values"
      v-model="model"
      use-input
      use-chips
      multiple
      input-debounce="0"
      :options="options"
      style="width: 250px"
    />

    {{ values }}
  </div>
</template>

<script>
const data = require('../../public/creatures.json');

const options = ['a', 'b']

export default {
  name: "inputs",

  computed: {
    values() {
      return data.length
    }
  }

}
</script>

<style scoped>

</style>
