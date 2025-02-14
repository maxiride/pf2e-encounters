import { defineStore, acceptHMRUpdate } from 'pinia'

export const useCreaturesStore = defineStore('creatures', {
  state: () => ({
    isLoading: false,
    indexedProperties: {
      creature_families: {
        field: 'creature_family',
        uniqueValues: [],
      },
      sources: {
        field: 'source',
        uniqueValues: [],
      },
      rarities: {
        field: 'rarity',
        uniqueValues: [],
      },
      sizes: {
        field: 'size',
        uniqueValues: [],
      },
      traits: {
        field: 'trait',
        uniqueValues: [],
      },
      senses: {
        field: 'sense',
        uniqueValues: [],
      },
    },
    properties: [],
    creatures: [],
  }),

  getters: {
    getCreatures: (state) => state.creatures,
    getIndexedProperties: (state) => state.indexedProperties,
    getCreature: (state) => (index) => state.creatures.at(index),
  },

  actions: {
    async fetchCreatures() {
      this.isLoading = true
      this.error = null

      try {
        const response = await fetch('/table-data_stripped.json', {
          cache: 'no-store',
        })

        // Validate response
        if (!response.ok) {
          throw new Error(`Failed to fetch: HTTP ${response.status}`)
        }

        // Parse JSON response and set creatures state
        this.creatures = await response.json()

        console.log('Creatures loaded')
        await this.computeUniqueValues()
      } catch (err) {
        // Handle errors (e.g., failed fetch, invalid JSON)
        this.error = err.message
        console.error('Error fetching creatures:', err)
      } finally {
        this.isLoading = false
      }
    },

    computeUniqueValues: async function () {
      // Correctly bind `this` by using a regular function
      try {
        this.creatures.forEach((c) => {
          Object.entries(this.indexedProperties).forEach(([key, value]) => {
            if (!this.indexedProperties[key].uniqueValues.includes(c[value.field])) {
              this.indexedProperties[key].uniqueValues.push(c[value.field])
            }
          })
        })
      } catch (error) {
        console.error('Error computing creatures values:', error)
      }
    },

    enumerateCreatureFields: function () {
      const allKeys = new Set()

      this.creatures.forEach((creature) => {
        Object.keys(creature).forEach((key) => allKeys.add(key))
      })

      let a = Array.from(allKeys) // Returns a sorted array of unique keys

      // All the keys are plain but some are logically grouped like resistance and weaknessess that are in the form of
      // resistance.evil
      // resistance.fire
      // weakness.lawful
      // weakness.mental

      a.forEach((key) => {
        const [rootKey, subKey] = key.split('.');
        if (subKey) {
          allKeys.add(rootKey);
          allKeys[rootKey] = (allKeys[rootKey] || []).concat(subKey);
        }
      });

      return allKeys
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCreaturesStore, import.meta.hot))
}
