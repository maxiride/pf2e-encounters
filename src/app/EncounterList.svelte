<script lang="ts">
  import Button from '@motion-proto/live-tokens/components/Button.svelte';
  import SegmentedControl from '@motion-proto/live-tokens/components/SegmentedControl.svelte';
  import type { EncounterEntry } from './encounter';

  const VARIANT_SEGMENTS = [
    { value: 'weak', label: 'Weak' },
    { value: 'base', label: 'Base' },
    { value: 'elite', label: 'Elite' },
  ];
  const VARIANT_TO_VALUE = ['base', 'weak', 'elite'] as const;
  const VALUE_TO_VARIANT: Record<string, 0 | 1 | 2> = { base: 0, weak: 1, elite: 2 };

  interface Props {
    encounter: EncounterEntry[];
    enriched: EncounterEntry[];
    xpCost: number;
    partySize: string;
    stageColor: string;
    totalsTextColor: string;
  }

  let {
    encounter = $bindable(),
    enriched,
    xpCost,
    partySize,
    stageColor,
    totalsTextColor,
  }: Props = $props();

  function increment(idx: number) {
    encounter[idx].count += 1;
  }

  function decrement(idx: number) {
    if (encounter[idx].count === 1) {
      encounter = encounter.filter((_, i) => i !== idx);
      return;
    }
    encounter[idx].count -= 1;
  }

  function setVariant(idx: number, v: 0 | 1 | 2) {
    encounter[idx].variant = v;
  }
</script>

<div class="encounter-section">
  <h2 class="section-title">Encounter</h2>
  <div class="encounter-panel" style:border-color={stageColor}>
    <div class="totals" style:background={stageColor} style:color={totalsTextColor}>
      <strong>Total encounter cost: {xpCost} XP</strong>
      {#if Number(partySize) > 0 && Number(partySize) !== 4}
        <small>XP award: {Math.floor((xpCost * 4) / Number(partySize))}</small>
      {/if}
    </div>

    <ul class="encounter-list">
      {#each enriched as item, i (i + '-' + item.id)}
        <li class="encounter-item">
          <div class="count-controls">
            <button class="icon-btn" onclick={() => increment(i)}>+</button>
            <button class="icon-btn" onclick={() => decrement(i)}>−</button>
          </div>
          <div class="info">
            <div class="title">{item.count} × {item.name}</div>
            <div class="cost">XP {item.cost}</div>
          </div>
          <SegmentedControl
            size="small"
            segments={VARIANT_SEGMENTS}
            value={VARIANT_TO_VALUE[item.variant]}
            onchange={(v) => setVariant(i, VALUE_TO_VARIANT[v])}
          />
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
</div>

<style>
  .section-title {
    font-family: var(--font-sans);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    text-transform: none;
    letter-spacing: normal;
    margin: 0 0 var(--space-8, 8px);
    color: var(--text-primary);
  }

  .encounter-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-12, 12px);
    background: var(--surface-neutral-lowest, #0d0d0d);
    border: 4px solid var(--border-canvas-subtle, #333);
    border-radius: var(--radius-md, 6px);
    padding: var(--space-16, 16px);
    transition: border-color var(--duration-150, 150ms);
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
    font-family: var(--font-sans);
    font-size: var(--font-size-md);
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
</style>
