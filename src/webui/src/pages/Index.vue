<template>
  <q-page class="q-pa-md">

    <div class="row justify-start q-gutter-sm">
      <q-input filled dense style="width: 150px;" v-model="name" label="Name"/>
      <q-input filled dense style="width: 100px;" v-model.number="minLevel" type="number" :min="min" :max="max"
               label="Min level"/>
      <q-input filled dense style="width: 100px;" v-model.number="maxLevel" type="number" :min="min" :max="max"
               label="Max level"/>


      <q-select
        filled
        dense
        options-dense
        label="Size"
        v-model="size"
        multiple
        input-debounce="0"
        :options="sizes"
        :style="selectsStyle"
        hide-selected
        clearable
      >
      </q-select>
      <q-select
        filled
        dense
        options-dense
        label="Family"
        v-model="family"
        use-chips
        multiple
        input-debounce="0"
        :options="families"
        :style="selectsStyle"
        hide-selected
        clearable
      />
      <q-select
        filled
        dense
        options-dense
        label="Trait"
        v-model="trait"
        use-chips
        multiple
        input-debounce="0"
        :options="traits"
        :style="selectsStyle"
        hide-selected
        clearable
      />
      <q-select
        filled
        dense
        options-dense
        label="Creature type"
        v-model="creature_type"
        use-chips
        multiple
        input-debounce="0"
        :options="creature_types"
        :style="selectsStyle"
        hide-selected
        clearable
      />
      <q-select
        filled
        dense
        options-dense
        label="Aligment"
        v-model="alignment"
        use-chips
        multiple
        input-debounce="0"
        :options="alignments"
        :style="selectsStyle"
        hide-selected
        clearable
      />
      <q-select
        filled
        dense
        options-dense
        label="Rarity"
        v-model="rarity"
        use-chips
        multiple
        input-debounce="0"
        :options="rarities"
        :style="selectsStyle"
        hide-selected
        clearable
      />

      <q-input filled dense style="width: 150px;" type="number" min="1" label="Party size" v-model="partySize"/>
      <q-input filled dense style="width: 150px;" type="number" min="1" label="Party level" v-model="partyLevel"/>
    </div>

    <div class="column" style="padding-top: 10px; padding-bottom: 10px">
      <q-linear-progress stripe rounded size="20px" :value="xpPool" :color="barColor">
        <div class="flex-center flex absolute-full">
          <q-badge style="position: absolute; left: 25%; transform: translate(-50%)" color="light-green"
                   text-color="black" :label="'Trivial ' + xpBudget[0]"/>
          <q-badge style="position: absolute; left: 37.5%; transform: translate(-50%)" color="lime" text-color="black"
                   :label="'Low ' + xpBudget[1]"/>
          <q-badge style="position: absolute; left: 50%; transform: translate(-50%)" color="amber" text-color="black"
                   :label="'Moderate ' + xpBudget[2]"/>
          <q-badge style="position: absolute; left: 75%; transform: translate(-50%)" color="orange" text-color="black"
                   :label="'Severe ' + xpBudget[3]"/>
          <q-badge style="position: absolute; left: 100%; transform: translate(-100%)" color="deep-orange"
                   text-color="black" :label="'Extreme ' + xpBudget[4]"/>
        </div>
      </q-linear-progress>

    </div>

    <div class="row">
      <creaturesTable class="col-8" :data="filteredResults" @add-row="addToEncounter($event)"/>

      <div class="col">
        <div class="column">
          <q-banner dense class="text-white bg-primary">
            Total Encounter cost: {{ xpCost }}
          </q-banner>
          <q-virtual-scroll
            class="col-12"
            style="max-height: 78vh;"
            :items="this.encounter"
            separator
          >
            <template v-slot="{ item, index }">

              <q-item :key="index" dense>
                <q-item-section side>
                  <q-btn unelevated :ripple="false" size="xs" class="q-px-xs" icon="add"
                         @click="addToEncounter(item, index)"/>
                  <q-btn unelevated :ripple="false" size="xs" class="q-px-xs" icon="remove"
                         @click="removeFromEncounter(item, index)"/>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-body1">{{ item.count }} {{ item.name }}</q-item-label>
                  <q-item-label class="text-body1">XP {{ item.cost }}</q-item-label>
                </q-item-section>


                <q-item-section side>

                  <q-btn-group unelevated flat>
                    <q-btn flat label="Weak" size="15px" :color="item.variant === 1 ? 'orange' : 'grey-4'" padding="xs"
                           @click="makeWeak(item, index)"/>
                    <q-btn flat label="Base" size="15px" :color="item.variant === 0 ? 'primary' : 'grey-4'" padding="xs"
                           @click="makeBase(item, index)"/>
                    <q-btn flat label="Elite" size="15px" :color="item.variant === 2 ? 'deep-orange' : 'grey-4'"
                           padding="xs"
                           @click="makeElite(item, index)"/>
                  </q-btn-group>

                </q-item-section>
              </q-item>
            </template>
          </q-virtual-scroll>
        </div>
      </div>
    </div>

  </q-page>
</template>

<script>
import creaturesTable from "components/creaturesTable";


export default {
  name: 'PageIndex',
  components: {
    creaturesTable
  },

  data() {
    return {
      name: '',
      min: null,
      minLevel: '',
      max: null,
      maxLevel: '',
      sizes: [],
      size: [],
      traits: [],
      trait: [],
      rarities: [],
      rarity: [],
      families: [],
      family: [],
      alignments: [],
      alignment: [],
      creature_types: [],
      creature_type: [],
      creaturesDump: null,

      encounter: [],

      partySize: 4,
      partyLevel: 1,

      selectsStyle: "width: 180px"

    }
  },

  computed: {
    filteredResults() {
      let rawData = this.creaturesDump.creatures
      let nameFilter = rawData.filter(el => el.name.toLowerCase().includes(this.name.toLowerCase()))
      let levelFilter = nameFilter.filter(el => el.level <= (this.maxLevel === "" ? 25 : this.maxLevel) && el.level >= (this.minLevel === "" ? -1 : this.minLevel))
      let sizeFilter = levelFilter.filter(el => {
          if (this.size != null && this.size.length !== 0) {
            return this.size.includes(el.size)
          }
          return el
        }
      )
      let familyFilter = sizeFilter.filter(el => {
        if (this.family != null && this.family.length !== 0) {
          return this.family.includes(el.family)
        }
        return el
      })
      let traitFilter = familyFilter.filter(el => {
        if (this.trait != null && this.trait.length !== 0) {
          return this.trait.some(v => el.traits.includes(v))
        }
        return el

      })

      let creatureTypeFilter = traitFilter.filter(el => {
        if (this.creature_type != null && this.creature_type.length !== 0) {
          return this.creature_type.includes(el.creature_type)
        }
        return el

      })
      let alignmentFilter = creatureTypeFilter.filter(el => {
        if (this.alignment != null && this.alignment.length !== 0) {
          return this.alignment.includes(el.alignment)
        }
        return el

      })
      let rarityFilter = alignmentFilter.filter(el => {
        if (this.rarity != null && this.rarity.length !== 0) {
          return this.rarity.includes(el.rarity)
        }
        return el
      })

      return rarityFilter
    },

    // How much XP does the encounter cost
    xpCost() {
      let cost = 0
      this.encounter.forEach(el => {
        el.cost = computeCost(el, this.partyLevel) * el.count
        cost += el.cost
      })
      return cost
    },
    xpBudget() {
      let trivial = 40 + 10 * Number(this.partySize - 4)
      let low = 60 + 15 * Number(this.partySize - 4)
      let moderate = 80 + 20 * Number(this.partySize - 4)
      let severe = 120 + 30 * Number(this.partySize - 4)
      let extreme = 160 + 40 * Number(this.partySize - 4)

      return [trivial, low, moderate, severe, extreme]
    },

    xpPool() {
      return Number(this.xpCost) / this.xpBudget[4]
    },

    barColor() {
      if (this.xpBudget[0] < this.xpCost && this.xpCost <= this.xpBudget[1]) {
        return "lime"
      } else if (this.xpBudget[1] < this.xpCost  && this.xpCost <= this.xpBudget[2]) {
        return "amber"
      } else if (this.xpBudget[2] < this.xpCost  && this.xpCost <= this.xpBudget[3]) {
        return "orange"
      } else if (this.xpBudget[3] < this.xpCost) {
        return "deep-orange"
      }
      return "light-green"
    }
  }
  ,

  methods: {
    addToEncounter(creature, index) {
      if (index >= 0) {
        creature.count += 1
        this.encounter.splice(index, 1, creature)
        return
      }
      let newCreature = {...creature}
      newCreature.variant = 0
      newCreature.count = 1
      this.encounter.push(newCreature)
    },
    removeFromEncounter(creature, index) {
      if (creature.count === 1) {
        this.encounter.splice(index, 1)
        return
      }
      creature.count -= 1
      this.encounter.splice(index, 1, creature)
    },
    makeBase(creature, index) {
      creature.variant = 0
      this.encounter.splice(index, 1, creature)
    },
    makeWeak(creature, index) {
      creature.variant = 1
      this.encounter.splice(index, 1, creature)
    },
    makeElite(creature, index) {
      creature.variant = 2
      this.encounter.splice(index, 1, creature)
    },
  }
  ,

  created() {
    let data = require('../../public/creatures.json')
    this.creaturesDump = data
    this.min = data.metadata.min_level
    this.max = data.metadata.max_level
    this.families = data.metadata.families
    this.alignments = data.metadata.alignments
    this.creature_types = data.metadata.creature_types
    this.traits = data.metadata.traits
    this.rarities = data.metadata.rarities
    this.sizes = data.metadata.sizes

  }
}

export function computeCost(creature, partyLevel) {
  if (creature.variant === 0) {
    return computeDelta(Number(creature.level) - Number(partyLevel))
  }

  if (creature.variant === 1) {
    return computeDelta(Number(creature.level) - 1 - Number(partyLevel))
  }

  if (creature.variant === 2) {
    return computeDelta(Number(creature.level) + 1 - Number(partyLevel))
  }
}

export function computeDelta(delta) {
  //console.debug("Delta: ", delta)
  switch (delta) {
    case -3:
      return 15
    case -2:
      return 20
    case -1:
      return 30
    case 0:
      return 40
    case 1:
      return 60
    case 2:
      return 80
    case 3:
      return 120
  }

  if (delta <= -1) {
    return 10
  } else if (delta >= 4) {
    return 160
  }
}
</script>

<style>
/* Hide number input arrows */
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}
</style>
