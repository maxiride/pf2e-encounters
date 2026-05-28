<script lang="ts">
  import './site.css';
  import Input from '@motion-proto/live-tokens/components/Input.svelte';
  import RuneGoblinBadge from './RuneGoblinBadge.svelte';
  import EncounterBudget from './EncounterBudget.svelte';
  import CreatureTable from './CreatureTable.svelte';
  import EncounterList from './EncounterList.svelte';
  import CreatureFilters from './CreatureFilters.svelte';
  import {
    activeStageIndex,
    blackTextSwitchIndex,
    computeCost,
    makeBarStages,
    makeXpBudget,
    type Creature,
    type EncounterEntry,
    type Metadata,
  } from './encounter';

  let creatures = $state<Creature[]>([]);
  let metadata = $state<Metadata | null>(null);

  // Stored as strings so the <Input> component can two-way-bind directly; coerce on read.
  let partySize = $state('4');
  let partyLevel = $state('1');

  let encounter = $state<EncounterEntry[]>([]);

  // Filters shared between CreatureFilters (UI) and CreatureTable (filtered derivation).
  let size = $state<string[]>([]);
  let family = $state<string[]>([]);
  let trait = $state<string[]>([]);
  let creatureType = $state<string[]>([]);
  let rarity = $state<string[]>([]);
  let remasterOnly = $state(false);

  $effect(() => {
    fetch('/creatures.json')
      .then((r) => r.json())
      .then((d: { creatures: Creature[]; metadata: Metadata }) => {
        creatures = d.creatures;
        metadata = d.metadata;
      });
  });

  const enriched = $derived(
    encounter.map((e) => ({ ...e, cost: computeCost(e, Number(partyLevel)) * e.count })),
  );
  const xpCost = $derived(enriched.reduce((sum, e) => sum + e.cost, 0));
  const xpBudget = $derived(makeXpBudget(Number(partySize)));
  const barStages = $derived(makeBarStages(xpBudget));
  const barValue = $derived(Math.min(100, (xpCost / xpBudget[4]) * 100));
  const stageIndex = $derived(activeStageIndex(barStages, barValue));
  const activeStage = $derived(barStages[stageIndex]);
  const totalsTextColor = $derived(stageIndex >= blackTextSwitchIndex(barStages) ? '#fff' : '#111');

  function addCreature(c: Creature) {
    encounter = [...encounter, { ...c, variant: 0, count: 1, cost: 0 }];
  }
</script>

<div class="page">
  <header>
    <h1>Pathfinder 2e Encounter Builder</h1>
    <RuneGoblinBadge />
  </header>

  {#if !metadata}
    <p class="loading">Loading creatures…</p>
  {:else}
    <section class="top-controls">
      <div class="control-group party">
        <div class="narrow">
          <Input type="number" label="Party size" bind:value={partySize} />
        </div>
        <div class="narrow">
          <Input type="number" label="Party level" bind:value={partyLevel} />
        </div>
      </div>
      <a
        class="attribution"
        href="https://github.com/maxiride/pf2e-encounters"
        target="_blank"
        rel="noopener noreferrer"
        tabindex="-1"
      >
        Based on the original work by maxiride
      </a>
    </section>

    <EncounterBudget value={barValue} stages={barStages} />

    <section class="main">
      <CreatureTable
        {creatures}
        sizeFilter={size}
        familyFilter={family}
        traitFilter={trait}
        creatureTypeFilter={creatureType}
        rarityFilter={rarity}
        {remasterOnly}
        onAdd={addCreature}
      />

      <aside class="right-col">
        <EncounterList
          bind:encounter
          {enriched}
          {xpCost}
          {partySize}
          stageColor={activeStage.color}
          {totalsTextColor}
        />

        <CreatureFilters
          {metadata}
          bind:size
          bind:family
          bind:trait
          bind:creatureType
          bind:rarity
          bind:remasterOnly
        />
      </aside>
    </section>
  {/if}
</div>

<style>
  .page {
    width: 1440px;
    max-width: none;
    margin: 0 auto;
    padding: var(--space-24, 24px) var(--space-24, 24px);
    color: var(--text-primary, #eee);
  }
  :global(body) {
    overflow-x: auto;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-24, 24px);
    margin: 0 0 var(--space-16, 16px);
  }
  header h1 {
    font-family: var(--font-display, serif);
    color: var(--text-primary);
    margin: 0;
  }

  .loading {
    color: var(--text-secondary);
    padding: var(--space-32, 32px);
    text-align: center;
  }

  .top-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: var(--space-24, 24px);
    margin-bottom: var(--space-16, 16px);
    padding: var(--space-12, 12px) var(--space-16, 16px);
    background: linear-gradient(
      to bottom,
      var(--surface-canvas-lower, #18201f),
      var(--surface-canvas-low, #2e3634)
    );
    border: 1px solid var(--border-canvas, #333);
    border-radius: var(--radius-md, 6px);
  }
  .attribution {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    /* Match the Input box height so the text vertically centers on the inputs */
    min-height: calc(var(--font-size-sm, 14px) * var(--line-height-sm, 1.4) + var(--space-8, 8px) * 2.5);
    color: var(--text-secondary, #bbb);
    font-size: var(--font-size-sm, 12px);
    text-decoration: underline dotted;
    text-underline-offset: 0.2em;
    line-height: 1;
  }
  .attribution:hover { color: var(--text-primary, #eee); }
  .control-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8, 8px);
    align-items: end;
  }
  .narrow { min-width: 100px; max-width: 140px; }

  .main {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--space-16, 16px);
    align-items: start;
  }

  .right-col {
    display: flex;
    flex-direction: column;
    gap: var(--space-16, 16px);
  }
</style>
