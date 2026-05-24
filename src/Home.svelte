<script lang="ts">
  import './site.css';
  import Button from './live-tokens/system/components/Button.svelte';
  import Input from './live-tokens/system/components/Input.svelte';
  import Table from './live-tokens/system/components/Table.svelte';
  import Tooltip from './live-tokens/system/components/Tooltip.svelte';
  import ProgressBar from './live-tokens/system/components/ProgressBar.svelte';
  import SelectBadge from './live-tokens/system/components/SelectBadge.svelte';
  import CollapsibleSection from './live-tokens/system/components/CollapsibleSection.svelte';
  import Dialog from './live-tokens/system/components/Dialog.svelte';
  import RuneGoblinBadge from './RuneGoblinBadge.svelte';

  type Creature = {
    id: string;
    name: string;
    level: number;
    size: string;
    family: string;
    alignment: string;
    creature_type: string;
    rarity: string;
    traits: string[];
    npc: boolean;
  };

  type Metadata = {
    min_level: number;
    max_level: number;
    sizes: string[];
    families: string[];
    traits: string[];
    creature_types: string[];
    alignments: string[];
    rarities: string[];
  };

  type EncounterEntry = Creature & { variant: 0 | 1 | 2; count: number; cost: number };

  let creatures = $state<Creature[]>([]);
  let metadata = $state<Metadata | null>(null);

  let name = $state('');
  // Stored as strings so the <Input> component can two-way-bind directly; coerce on read.
  let minLevel = $state('');
  let maxLevel = $state('');
  let size = $state<string[]>([]);
  let family = $state<string[]>([]);
  let trait = $state<string[]>([]);
  let creatureType = $state<string[]>([]);
  let rarity = $state<string[]>([]);
  let traitSearch = $state('');
  let familySearch = $state('');

  let sizeExpanded = $state(true);
  let familyExpanded = $state(false);
  let traitExpanded = $state(false);
  let creatureTypeExpanded = $state(false);
  let rarityExpanded = $state(false);

  let partySize = $state('4');
  let partyLevel = $state('1');
  let encounter = $state<EncounterEntry[]>([]);
  let sortBy = $state<'name' | 'level'>('name');
  let sortDesc = $state(false);

  type ColumnKey = 'name' | 'level' | 'size' | 'family' | 'type' | 'traits' | 'rarity';
  let columnVisibility = $state<Record<ColumnKey, boolean>>({
    name: true,
    level: true,
    size: true,
    family: false,
    type: false,
    traits: true,
    rarity: false,
  });
  let showColumnsDialog = $state(false);

  // Per-row tooltip gate: holds the creature id whose traits cell currently overflows + is hovered.
  let openTraitsRow = $state<string | null>(null);

  const SIZE_ABBR: Record<string, string> = {
    Tiny: 'Tiny',
    Small: 'Sm',
    Medium: 'Med',
    Large: 'Lg',
    Huge: 'Huge',
    Gargantuan: 'Gtn',
  };
  function sizeLabel(s: string): string {
    return SIZE_ABBR[s] ?? s;
  }

  function maybeShowTraitsTooltip(target: EventTarget | null, id: string) {
    if (!(target instanceof HTMLElement)) return;
    const span = target.querySelector<HTMLElement>('.traits-ellipsis');
    if (!span || span.scrollWidth <= span.clientWidth) return;
    openTraitsRow = id;
  }
  function hideTraitsTooltip() {
    openTraitsRow = null;
  }

  $effect(() => {
    fetch('/creatures.json')
      .then((r) => r.json())
      .then((d: { creatures: Creature[]; metadata: Metadata }) => {
        creatures = d.creatures;
        metadata = d.metadata;
      });
  });

  function computeDelta(delta: number): number {
    switch (delta) {
      case -3: return 15;
      case -2: return 20;
      case -1: return 30;
      case 0: return 40;
      case 1: return 60;
      case 2: return 80;
      case 3: return 120;
    }
    if (delta <= -1) return 10;
    if (delta >= 4) return 160;
    return 0;
  }

  function computeCost(entry: EncounterEntry, pLevel: number): number {
    const level = Number(entry.level);
    if (entry.variant === 0) return computeDelta(level - Number(pLevel));
    if (entry.variant === 1) {
      const weak = level === 1 ? 2 : 1;
      return computeDelta(level - weak - Number(pLevel));
    }
    const elite = level === -1 || level === 0 ? 2 : 1;
    return computeDelta(level + elite - Number(pLevel));
  }

  function filterOptions(all: string[], selected: string[], query: string): string[] {
    const q = query.trim().toLowerCase();
    const sel = new Set(selected);
    if (!q) return [...selected, ...all.filter((v) => !sel.has(v))];
    return [
      ...selected.filter((v) => v.toLowerCase().includes(q)),
      ...all.filter((v) => !sel.has(v) && v.toLowerCase().includes(q)),
    ];
  }

  const visibleTraits = $derived(metadata ? filterOptions(metadata.traits, trait, traitSearch) : []);
  const visibleFamilies = $derived(metadata ? filterOptions(metadata.families, family, familySearch) : []);

  const filtered = $derived.by(() => {
    if (!metadata) return [];
    const nameLc = name.toLowerCase();
    const minL = minLevel === '' ? -1 : Number(minLevel);
    const maxL = maxLevel === '' ? 25 : Number(maxLevel);
    let rows = creatures.filter((c) => {
      if (nameLc && !c.name.toLowerCase().includes(nameLc)) return false;
      if (c.level < minL || c.level > maxL) return false;
      if (size.length && !size.includes(c.size)) return false;
      if (family.length && !family.includes(c.family)) return false;
      if (trait.length && !trait.some((t) => c.traits.includes(t))) return false;
      if (creatureType.length && !creatureType.includes(c.creature_type)) return false;
      if (rarity.length && !rarity.includes(c.rarity)) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy];
      if (av < bv) return sortDesc ? 1 : -1;
      if (av > bv) return sortDesc ? -1 : 1;
      return 0;
    });
    return rows;
  });

  const xpBudget = $derived.by(() => {
    const extra = Number(partySize) - 4;
    return [40 + 10 * extra, 60 + 15 * extra, 80 + 20 * extra, 120 + 30 * extra, 160 + 40 * extra];
  });

  const enriched = $derived(
    encounter.map((e) => ({ ...e, cost: computeCost(e, Number(partyLevel)) * e.count }))
  );

  const xpCost = $derived(enriched.reduce((sum, e) => sum + e.cost, 0));

  const barValue = $derived(Math.min(100, (xpCost / xpBudget[4]) * 100));

  /* Color stops + labelled ticks for the danger bar. Stage `at` is the
     percentage of the extreme budget where each band begins; the active
     color is the highest `at` ≤ barValue. The first entry is the "below
     trivial" base color and carries no tick. */
  const barStages = $derived([
    { at: 0,    color: '#81d4fa' },
    { at: 25,   color: '#66bb6a', label: `Trivial ${xpBudget[0]}` },
    { at: 37.5, color: '#2e7d32', label: `Low ${xpBudget[1]}` },
    { at: 50,   color: '#fb8c00', label: `Moderate ${xpBudget[2]}` },
    { at: 75,   color: '#e53935', label: `Severe ${xpBudget[3]}` },
    { at: 100,  color: '#8b0000', label: `Extreme ${xpBudget[4]}`, tickline: false },
  ]);

  const activeStageIndex = $derived.by(() => {
    let idx = 0;
    for (let i = 0; i < barStages.length; i++) if (barStages[i].at <= barValue) idx = i;
    return idx;
  });
  const activeStage = $derived(barStages[activeStageIndex]);

  /* WCAG luminance + black-text contrast. We pick text color by *stage
     index* — find the first stage where black drops below AA (4.5:1) and
     use white from that index onward. Per-color picking flips back and
     forth when a light orange follows dark green; index-based picking
     guarantees monotonic switching. */
  function relativeLuminance(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  const blackTextSwitchIndex = $derived.by(() => {
    for (let i = 0; i < barStages.length; i++) {
      const contrast = (relativeLuminance(barStages[i].color) + 0.05) / 0.05;
      if (contrast < 4.5) return i;
    }
    return barStages.length;
  });
  const totalsTextColor = $derived(activeStageIndex >= blackTextSwitchIndex ? '#fff' : '#111');

  function addToEncounter(creature: Creature, idx: number, variant: 0 | 1 | 2 = 0) {
    if (idx >= 0) {
      encounter[idx].count += 1;
      encounter = encounter;
      return;
    }
    encounter = [...encounter, { ...creature, variant, count: 1, cost: 0 }];
  }

  function removeFromEncounter(idx: number) {
    if (encounter[idx].count === 1) {
      encounter = encounter.filter((_, i) => i !== idx);
      return;
    }
    encounter[idx].count -= 1;
    encounter = encounter;
  }

  function setVariant(idx: number, v: 0 | 1 | 2) {
    encounter[idx].variant = v;
    encounter = encounter;
  }

  function setSort(col: 'name' | 'level') {
    if (sortBy === col) sortDesc = !sortDesc;
    else { sortBy = col; sortDesc = false; }
  }

  function openAon(c: Creature) {
    const base = c.npc ? 'NPCs.aspx' : 'Monsters.aspx';
    window.open(`https://2e.aonprd.com/${base}?ID=${c.id}`, '_blank');
  }

  function toggle(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
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
      >
        Based on the original work by maxiride
      </a>
    </section>

    <section class="danger-bar">
      <ProgressBar variant="danger" value={barValue} stages={barStages} showIcon={false} />
    </section>

    <section class="main">
      <div class="creatures-panel">
        <div class="table-controls">
          <div class="search-field">
            <Input type="search" label="Search" bind:value={name} placeholder="Creature name…" />
          </div>
          <div class="narrow">
            <Input type="number" label="Min level" bind:value={minLevel} />
          </div>
          <div class="narrow">
            <Input type="number" label="Max level" bind:value={maxLevel} />
          </div>
        </div>
        <Table>

          <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th class="icon-col">
                  <button
                    class="icon-btn gear"
                    title="Choose columns"
                    aria-label="Choose columns"
                    onclick={() => (showColumnsDialog = true)}
                  >
                    <i class="fa-solid fa-gear" aria-hidden="true"></i>
                  </button>
                </th>
                <th class="icon-col"></th>
                {#if columnVisibility.name}
                  <th class="sortable" onclick={() => setSort('name')}>Name {sortBy === 'name' ? (sortDesc ? '↓' : '↑') : ''}</th>
                {/if}
                {#if columnVisibility.level}
                  <th class="sortable" onclick={() => setSort('level')}>Level {sortBy === 'level' ? (sortDesc ? '↓' : '↑') : ''}</th>
                {/if}
                {#if columnVisibility.size}<th>Size</th>{/if}
                {#if columnVisibility.family}<th>Family</th>{/if}
                {#if columnVisibility.type}<th>Type</th>{/if}
                {#if columnVisibility.traits}<th>Traits</th>{/if}
                {#if columnVisibility.rarity}<th>Rarity</th>{/if}
              </tr>
            </thead>
            <tbody>
              {#each filtered as c (c.id)}
                <tr ondblclick={() => addToEncounter(c, -1)}>
                  <td>
                    <button class="icon-btn add" title="Add to encounter" onclick={() => addToEncounter(c, -1)}>+</button>
                  </td>
                  <td>
                    <button class="icon-btn" title="Open on Archives of Nethys" onclick={() => openAon(c)}>↗</button>
                  </td>
                  {#if columnVisibility.name}<td>{c.name}</td>{/if}
                  {#if columnVisibility.level}<td>{c.level}</td>{/if}
                  {#if columnVisibility.size}<td>{sizeLabel(c.size)}</td>{/if}
                  {#if columnVisibility.family}<td>{c.family}</td>{/if}
                  {#if columnVisibility.type}<td>{c.creature_type}</td>{/if}
                  {#if columnVisibility.traits}
                    <td
                      class="traits"
                      onmouseenter={(e) => maybeShowTraitsTooltip(e.currentTarget, c.id)}
                      onmouseleave={hideTraitsTooltip}
                    >
                      <Tooltip text={c.traits.join(', ')} position="top" wrap manual portal open={openTraitsRow === c.id}>
                        <span class="traits-ellipsis">{c.traits.join(', ')}</span>
                      </Tooltip>
                    </td>
                  {/if}
                  {#if columnVisibility.rarity}<td>{c.rarity}</td>{/if}
                </tr>
              {/each}
            </tbody>
          </table>
          </div>
        </Table>
        <p class="row-count">
          {filtered.length} matching creature{filtered.length === 1 ? '' : 's'}.
          Click <span class="kbd">+</span> or double-click a row to add.
        </p>
      </div>

      <aside class="right-col">
        <div class="encounter-panel">
          <div class="totals" style:background={activeStage.color} style:color={totalsTextColor}>
            <strong>Total encounter cost: {xpCost} XP</strong>
            {#if Number(partySize) > 0 && Number(partySize) !== 4}
              <small>XP award: {Math.floor((xpCost * 4) / Number(partySize))}</small>
            {/if}
          </div>

          <ul class="encounter-list">
            {#each enriched as item, i (i + '-' + item.id)}
              <li class="encounter-item">
                <div class="count-controls">
                  <button class="icon-btn" onclick={() => addToEncounter(item, i)}>+</button>
                  <button class="icon-btn" onclick={() => removeFromEncounter(i)}>−</button>
                </div>
                <div class="info">
                  <div class="title">{item.count} × {item.name}</div>
                  <div class="cost">XP {item.cost}</div>
                </div>
                <div class="variants">
                  <button
                    class="seg"
                    class:active={item.variant === 1}
                    onclick={() => setVariant(i, 1)}
                  >Weak</button>
                  <button
                    class="seg"
                    class:active={item.variant === 0}
                    onclick={() => setVariant(i, 0)}
                  >Base</button>
                  <button
                    class="seg"
                    class:active={item.variant === 2}
                    onclick={() => setVariant(i, 2)}
                  >Elite</button>
                </div>
              </li>
            {/each}
            {#if encounter.length === 0}
              <li class="empty">No creatures yet — double-click rows in the table.</li>
            {/if}
          </ul>

          {#if encounter.length > 0}
            <Button variant="secondary" onclick={() => (encounter = [])}>Clear encounter</Button>
          {/if}
        </div>

        <div class="refine">
          <h2 class="refine-title">Filter Creatures</h2>
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
      </aside>
    </section>
  {/if}

  <Dialog
    bind:show={showColumnsDialog}
    title="Columns"
    width="320px"
    onclose={() => (showColumnsDialog = false)}
  >
    <div class="columns-body">
      {#each [
        { key: 'name', label: 'Name', locked: true },
        { key: 'level', label: 'Level', locked: true },
        { key: 'size', label: 'Size', locked: false },
        { key: 'family', label: 'Family', locked: false },
        { key: 'type', label: 'Type', locked: false },
        { key: 'traits', label: 'Traits', locked: false },
        { key: 'rarity', label: 'Rarity', locked: false },
      ] as col (col.key)}
        <label class="col-toggle" class:locked={col.locked}>
          <input
            type="checkbox"
            checked={columnVisibility[col.key as ColumnKey]}
            disabled={col.locked}
            onchange={(e) => (columnVisibility[col.key as ColumnKey] = (e.currentTarget as HTMLInputElement).checked)}
          />
          <span>{col.label}</span>
        </label>
      {/each}
    </div>
  </Dialog>

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

  .table-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8, 8px);
    align-items: end;
    margin-bottom: var(--space-8, 8px);
  }
  .table-controls .search-field { flex: 1; min-width: 240px; }
  .narrow { min-width: 100px; max-width: 140px; }

  .danger-bar {
    margin: var(--space-16, 16px) 0 var(--space-32, 32px);
    /* Default ProgressBar track is ~8px tall — too short for tick labels.
       Bump the danger variant just for this bar. */
    --progressbar-danger-track-height: 20px;
    /* Borrow the primary variant's translucent track surface — the danger
       default (solid neutral-low) reads heavier than the rest of the page. */
    --progressbar-danger-track-surface: color-mix(in srgb, var(--surface-neutral-lowest) 80%, transparent);
    --progressbar-danger-track-border: var(--border-neutral-faint);
    --progressbar-danger-track-border-width: var(--border-width-1);
  }

  .main {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--space-16, 16px);
    align-items: start;
  }

  .creatures-panel { min-width: 0; }

  .table-scroll {
    max-height: 70vh;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .table-scroll thead th {
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .row-count {
    color: var(--text-tertiary, #999);
    font-size: var(--font-size-xs, 12px);
    margin: var(--space-8, 8px) 0 0;
  }

  .sortable { cursor: pointer; user-select: none; }
  .sortable:hover { color: var(--text-primary); }
  .traits {
    font-size: var(--font-size-xs, 12px);
    color: var(--text-tertiary);
    max-width: 220px;
  }
  /* Tooltip wraps the ellipsis span; let it inherit the cell width so the
     ellipsis still triggers on the span inside. */
  .traits :global(.tooltip-wrapper) {
    display: block;
    max-width: 100%;
  }
  .traits-ellipsis {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .icon-col { width: 1%; white-space: nowrap; }

  /* Top-align cell content so multi-line cells (e.g. traits before truncation
     was applied) don't push single-line cells off-center. */
  tbody td { vertical-align: top; }

  /* Skip layout + paint for off-screen rows — keeps 3000+ rows feeling snappy
     without virtual-scroll bookkeeping. Browser uses contain-intrinsic-size
     as a placeholder height until the row scrolls into view. */
  tbody tr {
    content-visibility: auto;
    contain-intrinsic-size: auto 32px;
    transition: background 0.1s;
  }
  tr:hover td { background: var(--surface-neutral-low, rgba(255,255,255,0.04)); cursor: pointer; }

  .icon-btn {
    background: var(--surface-neutral-high, #333);
    color: var(--text-primary, #eee);
    border: 1px solid var(--border-neutral, #555);
    border-radius: var(--radius-sm, 4px);
    padding: 2px 8px;
    cursor: pointer;
    font-size: var(--font-size-sm, 14px);
    line-height: 1;
  }
  .icon-btn:hover { background: var(--surface-neutral-higher, #444); }
  .icon-btn.add {
    background: var(--surface-success-low, #1b3a1b);
    border-color: var(--border-success, #4a7c4a);
    color: var(--text-success, #a8d8a8);
    font-weight: 600;
  }
  .icon-btn.add:hover {
    background: var(--surface-success-high, #2d5d2d);
    color: var(--text-primary, #fff);
  }

  .kbd {
    display: inline-block;
    padding: 0 6px;
    background: var(--surface-neutral-high, #333);
    border: 1px solid var(--border-neutral, #555);
    border-radius: var(--radius-sm, 3px);
    font-family: var(--font-mono, monospace);
    font-size: 0.85em;
  }

  .right-col {
    display: flex;
    flex-direction: column;
    gap: var(--space-16, 16px);
  }
  .encounter-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-12, 12px);
    background: var(--surface-canvas-low, #1a1a1a);
    border: 1px solid var(--border-canvas-subtle, #333);
    border-radius: var(--radius-md, 6px);
    padding: var(--space-16, 16px);
  }

  .refine {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .refine-title {
    font-family: var(--font-sans);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    text-transform: none;
    letter-spacing: normal;
    margin: 0 0 var(--space-4, 4px);
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
.totals {
    padding: var(--space-12, 12px);
    border-radius: var(--radius-sm, 4px);
    margin-bottom: var(--space-12, 12px);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    transition: background 0.3s ease, color 0.3s ease;
  }
  .totals small { opacity: 0.85; font-size: var(--font-size-xs, 12px); color: inherit; }
  /* site.css applies `strong { color: var(--text-primary) }` globally, which
     would clobber the dynamic inline color on the wrapper. Force inherit so
     the totals text follows the active stage's chosen text color. */
  .totals strong { color: inherit; }

  .encounter-list {
    list-style: none;
    margin: 0 0 var(--space-12, 12px);
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-8, 8px);
  }
  .empty {
    color: var(--text-tertiary, #999);
    text-align: center;
    padding: var(--space-16, 16px);
    font-style: italic;
  }
  .encounter-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-8, 8px);
    align-items: center;
    padding: var(--space-6, 6px) 0;
    border-bottom: 1px solid var(--border-canvas-faint, #2a2a2a);
  }
  .count-controls {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .info .title { font-size: var(--font-size-sm, 14px); color: var(--text-primary); }
  .info .cost { font-size: var(--font-size-xs, 12px); color: var(--text-tertiary); }

  .variants {
    display: inline-flex;
    border-radius: var(--radius-sm, 4px);
    overflow: hidden;
    border: 1px solid var(--border-neutral, #555);
  }
  .seg {
    background: var(--surface-canvas-low, #1a1a1a);
    color: var(--text-tertiary, #999);
    border: none;
    border-right: 1px solid var(--border-neutral, #555);
    padding: 4px 10px;
    cursor: pointer;
    font-size: var(--font-size-xs, 12px);
  }
  .seg:last-child { border-right: none; }
  .seg.active {
    background: var(--surface-brand-high, #d84315);
    color: var(--text-primary, #fff);
  }

  .icon-btn.gear {
    background: transparent;
    border-color: transparent;
    color: var(--text-tertiary, #999);
    padding: 4px 6px;
  }
  .icon-btn.gear:hover {
    background: var(--surface-neutral-high, #333);
    color: var(--text-primary, #eee);
  }

.columns-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-8, 8px);
  }
  .col-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-8, 8px);
    color: var(--text-primary, #eee);
    font-size: var(--font-size-sm, 14px);
    cursor: pointer;
  }
  .col-toggle input { cursor: pointer; }
  .col-toggle.locked { cursor: not-allowed; opacity: 0.6; }
  .col-toggle.locked input { cursor: not-allowed; }
</style>
