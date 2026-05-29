<script lang="ts">
  import './site.css';
  import Input from '@motion-proto/live-tokens/components/Input.svelte';
  import RuneGoblinBadge from './RuneGoblinBadge.svelte';
  import EncounterBudget from './EncounterBudget.svelte';
  import CreatureTable from './CreatureTable.svelte';
  import EncounterList from './EncounterList.svelte';
  import CreatureFilters from './CreatureFilters.svelte';
  import AiDisclosure from './AiDisclosure.svelte';
  import LicenseView from './LicenseView.svelte';

  let showLicense = $state(false);

  const aiDisclosureItems = [
    'The code for this app was written by Claude Opus 4.7',
  ];
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
  import { loadCreatures } from './creatures-store';

  let creatures = $state<Creature[]>([]);
  let metadata = $state<Metadata | null>(null);

  // Stored as strings so the <Input> component can two-way-bind directly; coerce on read.
  let partySize = $state(loadParty('pf2e:partySize', '4'));
  let partyLevel = $state(loadParty('pf2e:partyLevel', '1'));

  let encounter = $state<EncounterEntry[]>([]);

  // Filters shared between CreatureFilters (UI) and CreatureTable (filtered derivation).
  let size = $state<string[]>([]);
  let family = $state<string[]>([]);
  let trait = $state<string[]>([]);
  let creatureType = $state<string[]>([]);
  let rarity = $state<string[]>([]);
  let remasterOnly = $state(false);

  $effect(() => {
    loadCreatures().then((d) => {
      creatures = d.creatures;
      metadata = d.metadata;
    });
  });

  $effect(() => saveParty('pf2e:partySize', partySize));
  $effect(() => saveParty('pf2e:partyLevel', partyLevel));

  function loadParty(key: string, fallback: string): string {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }
  function saveParty(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* localStorage may be unavailable */ }
  }

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
    {#if !showLicense}
      <section class="top-controls">
        <div class="control-group party">
          <div class="narrow">
            <Input type="number" label="Party size" bind:value={partySize} />
          </div>
          <div class="narrow">
            <Input type="number" label="Party level" bind:value={partyLevel} />
          </div>
        </div>
        <div class="attribution-block">
          <button class="license-link" type="button" onclick={(e) => { e.stopPropagation(); showLicense = true; }}>
            License information
          </button>
          <a
            class="attribution"
            href="https://2e.aonprd.com"
            target="_blank"
            rel="noopener noreferrer"
            tabindex="-1"
          >
            Sourced from Archives of Nethys
          </a>
        </div>
      </section>
    {/if}

    {#if showLicense}
      <LicenseView onClose={() => (showLicense = false)} />
    {:else}
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

      <section class="ai-disclosure-section">
        <div class="ai-disclosure-inner">
          <h2>AI Disclosure</h2>
          <AiDisclosure items={aiDisclosureItems} />
        </div>
      </section>
    {/if}
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
  .attribution-block {
    margin-left: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-8, 8px);
    /* Match the Input box height so the block vertically centers on the inputs */
    min-height: calc(var(--font-size-sm, 14px) * var(--line-height-sm, 1.4) + var(--space-8, 8px) * 2.5);
    justify-content: center;
  }
  .attribution {
    display: inline-flex;
    align-items: center;
    color: var(--text-secondary, #bbb);
    font-size: var(--font-size-sm, 12px);
    text-decoration: underline dotted;
    text-underline-offset: 0.2em;
    line-height: 1;
  }
  .attribution:hover { color: var(--text-primary, #eee); }
  .license-link {
    background: transparent;
    border: 0;
    padding: 0;
    color: var(--text-secondary, #bbb);
    font-size: var(--font-size-sm, 12px);
    text-decoration: underline dotted;
    text-underline-offset: 0.2em;
    line-height: 1;
    cursor: pointer;
  }
  .license-link:hover { color: var(--text-primary, #eee); }
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

  /* Same 2fr/1fr split as .main so the disclosure aligns to the table column
     (the "column 8" of an 8/4 split). */
  .ai-disclosure-section {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--space-16, 16px);
    margin-top: var(--space-32, 32px);
  }
  .ai-disclosure-inner {
    grid-column: 1;
  }
  .ai-disclosure-inner h2 {
    font-family: var(--font-display, serif);
    color: var(--text-primary);
    margin: 0;
  }

  .right-col {
    display: flex;
    flex-direction: column;
    gap: var(--space-16, 16px);
  }
</style>
