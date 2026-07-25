import { defineStore, acceptHMRUpdate } from 'pinia';

// Creature mirrors the schema produced by tools/aon-downloader/fetch-creatures.js
export type Creature = {
  name: string;
  level: number;
  hp: number;
  ac: number;
  rarity: string;
  size: string[];
  traits: string[];
  family: string;
  sources: string[];
  url: string;
  npc: boolean;
  alignment: string;
  // null for creatures that were never revisited by the 2023 Remaster and only have one edition
  edition: 'legacy' | 'remastered' | null;
};

export interface Metadata {
  total: number;
  updated: string;
  traits: string[];
  rarities: string[];
  sizes: string[];
  sources: string[];
  families: string[];
  alignments: string[];
  levels: { min: number; max: number };
}

const emptyMetadata: Metadata = {
  total: 0,
  updated: '',
  traits: [],
  rarities: [],
  sizes: [],
  sources: [],
  families: [],
  alignments: [],
  levels: { min: -1, max: 25 },
};

export const useCreaturesStore = defineStore('creatures', {
  state: () => ({
    isLoading: false,
    error: null as Error | null,
    creatures: [] as Creature[],
    metadata: emptyMetadata,
  }),

  actions: {
    async fetchCreatures() {
      this.isLoading = true;

      try {
        const response = await fetch('creatures.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch creatures: HTTP ${response.status}`);
        }
        this.creatures = await response.json();

        const metadataResp = await fetch('metadata.json');
        if (!metadataResp.ok) {
          throw new Error(`Failed to fetch metadata: HTTP ${metadataResp.status}`);
        }
        this.metadata = await metadataResp.json();
      } catch (err) {
        this.error = err instanceof Error ? err : new Error(String(err));
      } finally {
        this.isLoading = false;
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCreaturesStore, import.meta.hot));
}
