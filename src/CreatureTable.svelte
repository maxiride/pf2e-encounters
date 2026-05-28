<script lang="ts">
  import Input from '@motion-proto/live-tokens/components/Input.svelte';
  import Table from '@motion-proto/live-tokens/components/Table.svelte';
  import Dialog from '@motion-proto/live-tokens/components/Dialog.svelte';
  import AddButton from './AddButton.svelte';
  import OpenInNewButton from './OpenInNewButton.svelte';
  import { sizeLabel, type Creature, type ColumnKey } from './lib/encounter';

  interface Props {
    creatures: Creature[];
    sizeFilter: string[];
    familyFilter: string[];
    traitFilter: string[];
    creatureTypeFilter: string[];
    rarityFilter: string[];
    remasterOnly: boolean;
    onAdd: (creature: Creature) => void;
  }

  let {
    creatures,
    sizeFilter,
    familyFilter,
    traitFilter,
    creatureTypeFilter,
    rarityFilter,
    remasterOnly,
    onAdd,
  }: Props = $props();

  // Stored as strings so the <Input> component can two-way-bind directly; coerce on read.
  let name = $state('');
  let minLevel = $state('');
  let maxLevel = $state('');

  let sortBy = $state<'name' | 'level'>('name');
  let sortDesc = $state(false);

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

  // Shared traits tooltip: a single panel-level overlay rather than one Tooltip per
  // row. Avoids 3000+ component mounts (the per-row pattern made hover lag visibly).
  // We cache the hovered cell's rect + text so the overlay can position itself.
  let traitsTip = $state<{ left: number; top: number; text: string } | null>(null);

  function maybeShowTraitsTooltip(target: EventTarget | null, text: string) {
    if (!(target instanceof HTMLElement)) return;
    const span = target.querySelector<HTMLElement>('.traits-ellipsis');
    if (!span || span.scrollWidth <= span.clientWidth) return;
    const rect = target.getBoundingClientRect();
    traitsTip = { left: rect.left + rect.width / 2, top: rect.top, text };
  }
  function hideTraitsTooltip() {
    traitsTip = null;
  }

  function setSort(col: 'name' | 'level') {
    if (sortBy === col) sortDesc = !sortDesc;
    else { sortBy = col; sortDesc = false; }
  }

  function openAon(c: Creature) {
    const base = c.npc ? 'NPCs.aspx' : 'Monsters.aspx';
    window.open(`https://2e.aonprd.com/${base}?ID=${c.id}`, '_blank');
  }

  const filtered = $derived.by(() => {
    const nameLc = name.toLowerCase();
    const minL = minLevel === '' ? -1 : Number(minLevel);
    const maxL = maxLevel === '' ? 25 : Number(maxLevel);
    let rows = creatures.filter((c) => {
      if (nameLc && !c.name.toLowerCase().includes(nameLc)) return false;
      if (c.level < minL || c.level > maxL) return false;
      if (sizeFilter.length && !sizeFilter.includes(c.size)) return false;
      if (familyFilter.length && !familyFilter.includes(c.family)) return false;
      if (traitFilter.length && !traitFilter.some((t) => c.traits.includes(t))) return false;
      if (creatureTypeFilter.length && !creatureTypeFilter.includes(c.creature_type)) return false;
      if (rarityFilter.length && !rarityFilter.includes(c.rarity)) return false;
      if (remasterOnly && !c.remaster) return false;
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
</script>

<div class="creatures-panel">
  <h2 class="section-title">Creatures</h2>
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
  <div class="row-count">
    <span><strong>{filtered.length}</strong> matching creature{filtered.length === 1 ? '' : 's'}.</span>
    <span>Click <AddButton decorative /> or double-click a row to add.</span>
  </div>
  {#snippet cols()}
    <col style:width="48px" />
    <col style:width="48px" />
    {#if columnVisibility.name}<col style:width="240px" />{/if}
    {#if columnVisibility.level}<col style:width="80px" />{/if}
    {#if columnVisibility.size}<col style:width="72px" />{/if}
    {#if columnVisibility.family}<col style:width="140px" />{/if}
    {#if columnVisibility.type}<col style:width="120px" />{/if}
    {#if columnVisibility.traits}<col />{/if}
    {#if columnVisibility.rarity}<col style:width="110px" />{/if}
  {/snippet}
  <Table>
    <div class="head-table-wrap">
      <table class="split-table">
        <colgroup>{@render cols()}</colgroup>
        <thead>
          <tr>
            <th class="icon-col action-cell">
              <button
                class="icon-btn gear"
                title="Choose columns"
                aria-label="Choose columns"
                onclick={() => (showColumnsDialog = true)}
              >
                <i class="fa-solid fa-gear" aria-hidden="true"></i>
              </button>
            </th>
            <th class="icon-col action-cell"></th>
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
      </table>
    </div>
    <div class="table-scroll">
      <table class="split-table">
        <colgroup>{@render cols()}</colgroup>
        <tbody>
          {#each filtered as c (c.id)}
            <tr ondblclick={() => onAdd(c)}>
              <td class="action-cell">
                <AddButton title="Add to encounter" onclick={() => onAdd(c)} />
              </td>
              <td class="action-cell">
                <OpenInNewButton title="Open on Archives of Nethys" onclick={() => openAon(c)} />
              </td>
              {#if columnVisibility.name}<td>{c.name}</td>{/if}
              {#if columnVisibility.level}<td>{c.level}</td>{/if}
              {#if columnVisibility.size}<td>{sizeLabel(c.size)}</td>{/if}
              {#if columnVisibility.family}<td>{c.family}</td>{/if}
              {#if columnVisibility.type}<td>{c.creature_type}</td>{/if}
              {#if columnVisibility.traits}
                <td
                  class="traits"
                  onmouseenter={(e) => maybeShowTraitsTooltip(e.currentTarget, c.traits.join(', '))}
                  onmouseleave={hideTraitsTooltip}
                >
                  <span class="traits-ellipsis">{c.traits.join(', ')}</span>
                </td>
              {/if}
              {#if columnVisibility.rarity}<td>{c.rarity}</td>{/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Table>
</div>

{#if traitsTip}
  <div
    class="traits-tooltip"
    style:left="{traitsTip.left}px"
    style:top="{traitsTip.top}px"
  >
    {traitsTip.text}
  </div>
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

<style>
  .creatures-panel { min-width: 0; }

  .section-title {
    font-family: var(--font-sans);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    text-transform: none;
    letter-spacing: normal;
    margin: 0 0 var(--space-8, 8px);
    color: var(--text-primary);
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

  /* Split-table pattern: header and body are separate <table>s sharing a
     <colgroup> so column widths line up. scrollbar-gutter: stable on both
     wraps reserves the same gutter width, so the body's scrollbar appears
     below the header instead of alongside it. */
  .split-table { table-layout: fixed; }
  /* Fill the reserved scrollbar gutter on the right with the header surface so
     the strip blends seamlessly into the thead instead of showing the table's
     default surface underneath. */
  .head-table-wrap {
    overflow: hidden;
    scrollbar-gutter: stable;
    background: var(--table-default-header-surface);
  }
  .table-scroll {
    max-height: 70vh;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-gutter: stable;
  }

  .row-count {
    color: var(--text-secondary, #bbb);
    font-family: var(--font-sans);
    font-size: 14px;
    margin: var(--space-8, 8px) 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-16, 16px);
  }

  .sortable { cursor: pointer; user-select: none; }
  .sortable:hover { color: var(--text-primary); }
  .traits {
    font-size: var(--font-size-xs, 12px);
    color: var(--text-tertiary);
  }
  .traits-ellipsis {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Single panel-level overlay for the traits tooltip. Replicates the design
     system Tooltip's portal-mode look so we keep tokens consistent, but lives
     as one node rather than one Tooltip per row. */
  .traits-tooltip {
    position: fixed;
    transform: translate(-50%, calc(-100% - var(--space-8, 8px)));
    background: var(--tooltip-surface);
    color: var(--tooltip-text);
    font-family: var(--tooltip-text-font-family);
    font-size: var(--tooltip-text-font-size);
    font-weight: var(--tooltip-text-font-weight);
    line-height: var(--tooltip-text-line-height);
    padding: var(--tooltip-padding, var(--space-6, 6px))
             calc(var(--tooltip-padding, var(--space-6, 6px)) * 2);
    border: var(--tooltip-border-width) solid var(--tooltip-border);
    border-radius: var(--tooltip-radius);
    box-shadow: var(--tooltip-shadow);
    max-width: var(--tooltip-max-width, 20rem);
    white-space: normal;
    overflow-wrap: anywhere;
    pointer-events: none;
    z-index: var(--z-tooltip);
  }
  .traits-tooltip::after {
    content: '';
    position: absolute;
    bottom: calc(-4px - var(--tooltip-border-width));
    left: 50%;
    width: 8px;
    height: 8px;
    transform: translateX(-50%) rotate(45deg);
    background: var(--tooltip-surface);
    border-right: var(--tooltip-border-width) solid var(--tooltip-border);
    border-bottom: var(--tooltip-border-width) solid var(--tooltip-border);
    z-index: -1;
  }

  .icon-col { width: 1%; white-space: nowrap; }
  /* IconAction fills its cell via position: absolute; inset: 0 — needs a positioned ancestor. */
  .action-cell { position: relative; }

  /* Top-align cell content so multi-line cells don't push single-line cells off-center. */
  tbody td { vertical-align: top; }

  /* Skip layout + paint for off-screen rows — keeps 3000+ rows feeling snappy
     without virtual-scroll bookkeeping. */
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
  /* Fill the containing <th class="action-cell"> so hover paints the whole cell,
     matching the AddButton/OpenInNewButton IconAction pattern in the body rows. */
  .icon-btn.gear {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 0;
    border-radius: 0;
    padding: var(--space-8, 8px);
    color: var(--text-primary, #eee);
    transition: background var(--duration-150, 150ms), color var(--duration-150, 150ms);
  }
  .icon-btn.gear:hover {
    background: var(--surface-neutral-highest, #91969a);
    color: var(--text-primary, #fff);
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
