<script lang="ts">
  import { onMount } from 'svelte';
  import { columnsVisible } from './columnsOverlay';

  const isDev = import.meta.env.DEV;
  const isInIframe = typeof window !== 'undefined' && window.parent !== window;
  const enabled = isDev && !isInIframe;

  let count = $state(12);
  let gutter = $state('');
  let margin = $state('');

  function readTokens() {
    const cs = getComputedStyle(document.documentElement);
    const rawCount = cs.getPropertyValue('--columns-count').trim();
    const parsed = parseInt(rawCount, 10);
    if (!Number.isNaN(parsed) && parsed > 0) count = parsed;
    gutter = cs.getPropertyValue('--columns-gutter').trim();
    margin = cs.getPropertyValue('--columns-margin').trim();
  }

  onMount(() => {
    readTokens();
    const onResize = () => readTokens();
    window.addEventListener('resize', onResize);

    const observer = new MutationObserver(readTokens);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });

    return () => {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    };
  });
</script>

{#if enabled && $columnsVisible}
  <div class="columns-overlay" aria-hidden="true">
    <div class="columns-overlay__inner">
      {#each Array(count) as _, i}
        <div class="columns-overlay__col">
          <span class="columns-overlay__num">{i + 1}</span>
        </div>
      {/each}
    </div>
    <div class="columns-overlay__info">
      <i class="fas fa-grip-lines-vertical"></i>
      <span>{count} col</span>
      <span class="sep">·</span>
      <span>gutter {gutter || 'var(--columns-gutter)'}</span>
      <span class="sep">·</span>
      <span>margin {margin || 'var(--columns-margin)'}</span>
    </div>
  </div>
{/if}

<style>
  .columns-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1500;
    padding-inline: var(--columns-margin);
    display: flex;
    justify-content: center;
  }

  .columns-overlay__inner {
    width: 100%;
    max-width: var(--columns-max-width);
    height: 100%;
    display: grid;
    grid-template-columns: repeat(var(--columns-count, 12), 1fr);
    /* Single implicit row that fills the container — without this, row
       tracks default to `auto` and collapse to the content height (the
       number span, ~12px), so the column fill and dashed borders are
       only ~12px tall and look invisible against any backdrop. */
    grid-template-rows: 1fr;
    gap: var(--columns-gutter);
  }

  .columns-overlay__col {
    /* Fallbacks let the overlay render on any host. --ui-* tokens are
       declared in ui-editor.css which by convention is editor-scoped and
       not loaded globally; without fallbacks the host site sees invisible
       columns. */
    background: var(--ui-overlay-fill, rgba(128, 128, 128, 0.06));
    border-left: 1px dashed var(--ui-overlay-border, rgba(128, 128, 128, 0.32));
    border-right: 1px dashed var(--ui-overlay-border, rgba(128, 128, 128, 0.32));
  }

  .columns-overlay__num {
    display: block;
    font-family: var(--ui-font-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace);
    font-size: 9px;
    line-height: 1;
    color: var(--ui-overlay-num, rgba(128, 128, 128, 0.75));
    text-align: center;
    padding-top: 3px;
  }

  .columns-overlay__info {
    position: fixed;
    right: 12px;
    bottom: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 9px;
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-family: var(--ui-font-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace);
    font-size: 10px;
    color: rgba(255, 255, 255, 0.75);
    white-space: nowrap;
  }

  .columns-overlay__info i {
    font-size: 9px;
    opacity: 0.7;
  }

  .columns-overlay__info .sep {
    opacity: 0.4;
  }
</style>
