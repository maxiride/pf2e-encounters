import { defineStore, acceptHMRUpdate } from 'pinia'

export const useCreaturesStore = defineStore('creatures', {
  state: () => ({
    isLoading: false,
    // creatures hold the creature data
    creatures: [],
    // metadata holds the creature metadata like sizes, traits etc
    metadata: [],
  }),

  getters: {
    getCreatures: (state) => state.creatures,
    getCreature: (state) => (index) => state.creatures.at(index),
    getCreatureCount: (state) => state.creatures.length,
    getTraits: (state) => state.metadata.traits,
    getRarities: (state) => state.metadata.rarities,
    getSizes: (state) => state.metadata.sizes,
    getSources: (state) => state.metadata.sources_normalized,
  },

  actions: {
    async fetchCreatures() {
      this.isLoading = true
      this.error = null

      try {
        const response = await fetch('/creatures.json')

        // Validate response
        if (!response.ok) {
          throw new Error(`Failed to fetch creatures: HTTP ${response.status}`)
        }

        // Parse JSON response and set creatures state
        this.creatures = await response.json()

        console.log('Creatures loaded:', this.creatures.length)

        const metadataResp = await fetch('/metadata.json')
        if (!metadataResp.ok) {
          throw new Error(`Failed to fetch metadata: HTTP ${metadataResp.status}`)
        }

        this.metadata = await metadataResp.json()

        console.log('Metadata loaded')
      } catch (err) {
        // Handle errors (e.g., failed fetch, invalid JSON)
        this.error = err.message
        console.error('Error fetching creatures:', err)
      } finally {
        this.isLoading = false
      }
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCreaturesStore, import.meta.hot))
}
