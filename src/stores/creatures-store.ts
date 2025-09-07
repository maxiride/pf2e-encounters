import { defineStore, acceptHMRUpdate } from 'pinia';

export type Creature = {
  name: string;
  creature_family: string;
  rarity: string;
  size: string;
  trait: string;
  level: string; // note: string in JSON
  hp: string;
  ac: string;
  source: string;
  url: string;
  alignment: string;
};

interface Metadata {
  total: number;
  traits: string[];
  rarities: string[];
  sizes: string[];
  sources_normalized: string[];
}

export const useCreaturesStore = defineStore('creatures', {
  state: () => ({
    isLoading: false,
    error: null as Error | null,
    // creatures hold the creature data
    creatures: [] as Creature[],
    // metadata holds the creature metadata like sizes, traits etc
    metadata: {} as Metadata,
  }),

  getters: {
    getCreatures: (state) => state.creatures,
    getCreature: (state) => (index: number) => state.creatures.at(index),
    getCreatureCount: (state) => state.creatures.length,
    getTraits: (state) => state.metadata.traits,
    getRarities: (state) => state.metadata.rarities,
    getSizes: (state) => state.metadata.sizes,
    getSources: (state) => state.metadata.sources_normalized,
  },

  actions: {
    async fetchCreatures() {
      this.isLoading = true;

      try {
        const response = await fetch('/v2/creatures.json');

        // Validate response
        if (!response.ok) {
          throw new Error(`Failed to fetch creatures: HTTP ${response.status}`);
        }

        // Parse JSON response and set creatures state
        this.creatures = await response.json();

        console.log('Creatures loaded:', this.creatures.length);

        const metadataResp = await fetch('/v2/metadata.json');
        if (!metadataResp.ok) {
          throw new Error(`Failed to fetch metadata: HTTP ${metadataResp.status}`);
        }

        this.metadata = await metadataResp.json();

        console.log('Metadata loaded');
      } catch (err) {
        if (err instanceof Error) {
          this.error = err;
        } else {
          this.error = new Error(String(err));
        }
        console.error('Error fetching creatures:', err);
      } finally {
        this.isLoading = false;
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCreaturesStore, import.meta.hot));
}
