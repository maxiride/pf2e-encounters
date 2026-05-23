<script module lang="ts">
  type CellStatus = 'linked' | 'broken' | 'absent';
  type RowEntry = { label: string; key: string };
  type Axes =
    | { kind: '1d'; rows: RowEntry[] }
    | { kind: '2d'; rows: string[]; cols: string[] };

  function deriveAxes(contexts: string[]): Axes {
    if (contexts.length === 0) return { kind: '1d', rows: [] };
    const split = contexts.map((c) => c.split(/\s+/));
    const arity = split[0].length;
    const consistent = arity === 2 && split.every((s) => s.length === 2);
    if (!consistent) {
      return { kind: '1d', rows: contexts.map((c) => ({ label: c, key: c })) };
    }
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const rows: string[] = [];
    const cols: string[] = [];
    for (const [r, c] of split) {
      if (!rowSet.has(r)) { rowSet.add(r); rows.push(r); }
      if (!colSet.has(c)) { colSet.add(c); cols.push(c); }
    }
    // Keep the full context string as the label so row clicks still match the editor's tab strip.
    if (cols.length === 1) {
      return { kind: '1d', rows: rows.map((r) => ({ label: `${r} ${cols[0]}`, key: `${r} ${cols[0]}` })) };
    }
    if (rows.length === 1) {
      return { kind: '1d', rows: cols.map((c) => ({ label: `${rows[0]} ${c}`, key: `${rows[0]} ${c}` })) };
    }
    return { kind: '2d', rows, cols };
  }

</script>

<script lang="ts">
  interface Props {
    contexts?: string[];
    broken?: string[];
    singleAxisLabel?: string;
    /** Caption rendered above the grid. Use to describe the linkage scope
      (e.g. "Links across variants and states"). Defaults to the legacy
      "Linked Properties" label so consumers that don't pass a caption
      keep their existing rendering. */
    caption?: string;
    /** Currently focused variant (matches a row in 2d / a row label in 1d). When set,
      the matching row is highlighted with the same active style as the variant tab strip. */
    selectedRow?: string | null;
    /** Currently focused state (matches a column in 2d). The cell at (selectedRow, selectedCol)
      gets an additional accent. Ignored in 1d charts. */
    selectedCol?: string | null;
    onselect?: (label: string) => void;
  }

  let {
    contexts = [],
    broken = [],
    singleAxisLabel = '',
    caption = 'Linked Properties',
    selectedRow = null,
    selectedCol = null,
    onselect
  }: Props = $props();

  let axes = $derived(deriveAxes(contexts));
  let status = $derived((() => {
    const brokenSet = new Set(broken);
    const m = new Map<string, CellStatus>();
    for (const c of contexts) m.set(c, brokenSet.has(c) ? 'broken' : 'linked');
    return m;
  })());

  let hoveredRow: number = $state(-1);

  function key2d(r: string, c: string): string { return `${r} ${c}`; }
  function selectRow(label: string) { onselect?.(label); }
  /** True when this 1d row's key matches focus — either as a bare label
      (`"primary"` matches focusedVariant `"primary"`) or as a compound
      `"variant state"` matching the focused pair. */
  function isRowSelected1d(key: string, row: string | null, col: string | null): boolean {
    if (!row) return false;
    if (key === row) return true;
    if (col && key === `${row} ${col}`) return true;
    if (col && key === `${col} ${row}`) return true;
    return false;
  }
</script>

<div class="chart">
  <span class="chart-label">{caption}</span>
  <div class="chart-grid-wrap" role="grid" aria-label="Linked contexts">
  {#if axes.kind === '2d'}
    <div class="grid grid-2d" style="--cols: {axes.cols.length};">
      <div class="corner"></div>
      {#each axes.cols as c (c)}
        <div class="col-h">{c}</div>
      {/each}
      {#each axes.rows as r, i (r)}
        <button
          type="button"
          class="row-h row-target"
          class:hovered={hoveredRow === i}
          class:selected={selectedRow === r}
          onclick={() => selectRow(r)}
          onmouseenter={() => (hoveredRow = i)}
          onmouseleave={() => (hoveredRow = -1)}
          onfocus={() => (hoveredRow = i)}
          onblur={() => (hoveredRow = -1)}
        >{r}</button>
        {#each axes.cols as c (c)}
          {@const st = status.get(key2d(r, c)) ?? 'absent'}
          <button
            type="button"
            tabindex="-1"
            class="cell row-target {st}"
            class:hovered={hoveredRow === i}
            class:selected={selectedRow === r && selectedCol === c}
            class:in-selected-row={selectedRow === r && selectedCol !== c}
            aria-label="{r} {c}: {st}"
            onclick={() => selectRow(r)}
            onmouseenter={() => (hoveredRow = i)}
            onmouseleave={() => (hoveredRow = -1)}
          >
            {#if st === 'linked'}
              <span class="dot" aria-hidden="true"></span>
            {:else if st === 'broken'}
              <svg class="lock" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3.5" y="7.5" width="9" height="6" rx="1.2"/>
                <path d="M5.5 7.5V5.2a2.5 2.5 0 0 1 4.6-1.4"/>
              </svg>
            {:else}
              <span class="absent" aria-hidden="true"></span>
            {/if}
          </button>
        {/each}
      {/each}
    </div>
  {:else}
    <div class="grid grid-1d">
      <div class="corner"></div>
      <div class="col-h">{singleAxisLabel}</div>
      {#each axes.rows as r, i (r.key)}
        {@const st = status.get(r.key) ?? 'absent'}
        {@const isSel = isRowSelected1d(r.key, selectedRow, selectedCol)}
        <button
          type="button"
          class="row-h row-target"
          class:hovered={hoveredRow === i}
          class:selected={isSel}
          onclick={() => selectRow(r.label)}
          onmouseenter={() => (hoveredRow = i)}
          onmouseleave={() => (hoveredRow = -1)}
          onfocus={() => (hoveredRow = i)}
          onblur={() => (hoveredRow = -1)}
        >{r.label}</button>
        <button
          type="button"
          tabindex="-1"
          class="cell row-target {st}"
          class:hovered={hoveredRow === i}
          class:selected={isSel}
          aria-label="{r.label}: {st}"
          onclick={() => selectRow(r.label)}
          onmouseenter={() => (hoveredRow = i)}
          onmouseleave={() => (hoveredRow = -1)}
        >
          {#if st === 'linked'}
            <span class="dot" aria-hidden="true"></span>
          {:else if st === 'broken'}
            <svg class="lock" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3.5" y="7.5" width="9" height="6" rx="1.2"/>
              <path d="M5.5 7.5V5.2a2.5 2.5 0 0 1 4.6-1.4"/>
            </svg>
          {:else}
            <span class="absent" aria-hidden="true"></span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
  </div>
</div>

<style>
  .chart {
    --linkage-dot: var(--ui-text-tertiary);
    --linkage-broken-fg: #f0a338;
    --linkage-broken-tint: rgba(240, 163, 56, 0.09);

    flex: 0 0 auto;
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-24);
  }

  .chart-label {
    display: block;
    margin: 0;
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-secondary);
  }

  /* Gridlines via 1px gap exposing the container bg; cells fill themselves to hide it. */
  .grid {
    display: grid;
    gap: 1px;
    background: var(--ui-border-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    overflow: hidden;
  }
  .grid-2d { grid-template-columns: auto repeat(var(--cols, 1), minmax(64px, 1fr)); }
  .grid-1d { grid-template-columns: auto 40px; }

  .grid > * {
    background: var(--ui-surface-lowest);
    padding: var(--ui-space-4) var(--ui-space-10);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
    line-height: 1;
    display: flex;
    align-items: center;
  }
  .grid .col-h {
    background: var(--ui-gray-200);
    justify-content: center;
  }
  .grid .cell { justify-content: center; }

  /* Avoid `font: inherit` — the shorthand resets font-size to body and oversizes row labels. */
  button.row-target {
    border: 0;
    margin: 0;
    font-family: inherit;
    font-weight: inherit;
    text-align: left;
    cursor: pointer;
  }
  button.cell.row-target {
    text-align: center;
  }
  button.row-target:focus-visible {
    outline: 1px solid var(--ui-border, var(--ui-gray-700));
    outline-offset: -2px;
  }

  .row-target.hovered {
    background: var(--ui-hover);
  }
  .grid .row-h.row-target.hovered {
    background: var(--ui-hover-high, var(--ui-hover));
    color: var(--ui-text-secondary);
  }
  .cell.broken.row-target.hovered {
    background: var(--linkage-broken-tint);
    filter: brightness(1.15);
  }

  /* Selected row — matches the variant tab's active treatment so the visual
     relationship between the focused tab above and the chart row reading the
     same context is clear. The selected cell (variant×state intersection) gets
     an extra accent ring to mark it as the live read-out. */
  .grid .row-h.row-target.selected {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
    box-shadow: inset 0 0 0 1px var(--ui-border);
    z-index: 1;
  }
  .grid .cell.row-target.in-selected-row,
  .grid .cell.row-target.selected {
    background: var(--ui-surface-high);
  }
  .grid .cell.row-target.selected {
    box-shadow: inset 0 0 0 1px var(--ui-border);
    z-index: 1;
  }
  .grid .cell.broken.row-target.in-selected-row,
  .grid .cell.broken.row-target.selected {
    background: color-mix(in srgb, var(--linkage-broken-tint) 60%, var(--ui-surface-high));
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--linkage-dot);
  }

  .cell.broken {
    color: var(--linkage-broken-fg);
    background: var(--linkage-broken-tint);
  }
  .lock {
    width: 13px;
    height: 13px;
  }

  .absent {
    width: 5px;
    height: 1px;
    background: var(--ui-border-low);
    opacity: 0.6;
  }
</style>
