<script lang="ts">
  import Button from '@motion-proto/live-tokens/components/Button.svelte';
  import Input from '@motion-proto/live-tokens/components/Input.svelte';
  import CollapsibleSection from '@motion-proto/live-tokens/components/CollapsibleSection.svelte';
  import SelectBadge from './components/SelectBadge.svelte';
  import { filterOptions, type Metadata } from './lib/encounter';

  interface Props {
    metadata: Metadata;
    size: string[];
    family: string[];
    trait: string[];
    creatureType: string[];
    rarity: string[];
  }

  let {
    metadata,
    size = $bindable(),
    family = $bindable(),
    trait = $bindable(),
    creatureType = $bindable(),
    rarity = $bindable(),
  }: Props = $props();

  let sizeExpanded = $state(true);
  let familyExpanded = $state(false);
  let traitExpanded = $state(false);
  let creatureTypeExpanded = $state(false);
  let rarityExpanded = $state(false);

  let traitSearch = $state('');
  let familySearch = $state('');

  const visibleTraits = $derived(filterOptions(metadata.traits, trait, traitSearch));
  const visibleFamilies = $derived(filterOptions(metadata.families, family, familySearch));

  function toggle(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }
</script>

<div class="refine">
  <h2 class="section-title">Filter Creatures</h2>
  <CollapsibleSection
    variant="container"
    label="Size"
    expanded={sizeExpanded}
    ontoggle={() => (sizeExpanded = !sizeExpanded)}
  >
    {#snippet summary()}
      {#if size.length}
        <div class="reset-wrap">
          <Button variant="outline" size="small" onclick={(e) => { e.stopPropagation(); size = []; }}>Reset</Button>
        </div>
      {/if}
    {/snippet}
    <div class="badges">
      {#each metadata.sizes as opt}
        <SelectBadge selected={size.includes(opt)} label={opt} onclick={() => (size = toggle(size, opt))} />
      {/each}
    </div>
  </CollapsibleSection>

  <CollapsibleSection
    variant="container"
    label="Family"
    expanded={familyExpanded}
    ontoggle={() => (familyExpanded = !familyExpanded)}
  >
    {#snippet summary()}
      {#if family.length}
        <div class="reset-wrap">
          <Button variant="outline" size="small" onclick={(e) => { e.stopPropagation(); family = []; }}>Reset</Button>
        </div>
      {/if}
    {/snippet}
    <Input
      type="search"
      placeholder="Filter families…"
      bind:value={familySearch}
    />
    <div class="badges scroll">
      {#each visibleFamilies as opt (opt)}
        <SelectBadge selected={family.includes(opt)} label={opt} onclick={() => (family = toggle(family, opt))} />
      {/each}
    </div>
  </CollapsibleSection>

  <CollapsibleSection
    variant="container"
    label="Trait"
    expanded={traitExpanded}
    ontoggle={() => (traitExpanded = !traitExpanded)}
  >
    {#snippet summary()}
      {#if trait.length}
        <div class="reset-wrap">
          <Button variant="outline" size="small" onclick={(e) => { e.stopPropagation(); trait = []; }}>Reset</Button>
        </div>
      {/if}
    {/snippet}
    <Input
      type="search"
      placeholder="Filter traits…"
      bind:value={traitSearch}
    />
    <div class="badges scroll">
      {#each visibleTraits as opt (opt)}
        <SelectBadge selected={trait.includes(opt)} label={opt} onclick={() => (trait = toggle(trait, opt))} />
      {/each}
    </div>
  </CollapsibleSection>

  <CollapsibleSection
    variant="container"
    label="Creature type"
    expanded={creatureTypeExpanded}
    ontoggle={() => (creatureTypeExpanded = !creatureTypeExpanded)}
  >
    {#snippet summary()}
      {#if creatureType.length}
        <div class="reset-wrap">
          <Button variant="outline" size="small" onclick={(e) => { e.stopPropagation(); creatureType = []; }}>Reset</Button>
        </div>
      {/if}
    {/snippet}
    <div class="badges">
      {#each metadata.creature_types as opt}
        <SelectBadge selected={creatureType.includes(opt)} label={opt} onclick={() => (creatureType = toggle(creatureType, opt))} />
      {/each}
    </div>
  </CollapsibleSection>

  <CollapsibleSection
    variant="container"
    label="Rarity"
    expanded={rarityExpanded}
    ontoggle={() => (rarityExpanded = !rarityExpanded)}
  >
    {#snippet summary()}
      {#if rarity.length}
        <div class="reset-wrap">
          <Button variant="outline" size="small" onclick={(e) => { e.stopPropagation(); rarity = []; }}>Reset</Button>
        </div>
      {/if}
    {/snippet}
    <div class="badges">
      {#each metadata.rarities as opt}
        <SelectBadge selected={rarity.includes(opt)} label={opt} onclick={() => (rarity = toggle(rarity, opt))} />
      {/each}
    </div>
  </CollapsibleSection>
</div>

<style>
  .refine {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .section-title {
    font-family: var(--font-sans);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    text-transform: none;
    letter-spacing: normal;
    margin: 0 0 var(--space-8, 8px);
    color: var(--text-primary);
  }
  .reset-wrap { margin-left: auto; }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6, 6px);
  }
  .badges.scroll {
    max-height: 220px;
    overflow-y: auto;
    padding: var(--space-4, 4px) 2px;
  }
</style>
