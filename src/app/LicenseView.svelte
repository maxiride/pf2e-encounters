<script lang="ts">
  import TabBar from '@motion-proto/live-tokens/components/TabBar.svelte';
  import Card from '@motion-proto/live-tokens/components/Card.svelte';
  import Input from '@motion-proto/live-tokens/components/Input.svelte';
  import orcImage from './assets/orc.webp';
  import githubIcon from './assets/GitHub_Invertocat_White_Clearspace.svg';
  import sources from './data/sources.generated.json';

  let { onClose }: { onClose: () => void } = $props();

  let sourceFilter = $state('');
  const filteredSources = $derived(
    sources.filter((s) => s.title.toLowerCase().includes(sourceFilter.trim().toLowerCase())),
  );

  let viewEl: HTMLElement;

  function handleWindowClick(e: MouseEvent) {
    if (viewEl && !viewEl.contains(e.target as Node)) onClose();
  }

  const tabs = [
    { id: 'game', label: 'Game license' },
    { id: 'software', label: 'Software license' },
  ];
  let selected = $state('game');
</script>

<svelte:window onclick={handleWindowClick} />

<section class="license-view" bind:this={viewEl}>
  <button class="close" onclick={onClose} aria-label="Close license information" title="Close">×</button>

  <div class="tabs">
    <TabBar {tabs} selectedTab={selected} ontabChange={(id) => (selected = id)} />
  </div>

  {#if selected === 'game'}
    <div class="license-grid">
      <div class="license-cards">
        <Card title="ORC Notice">
          <p>
            This product is licensed under the ORC License held in the Library of Congress
            at TX 9-307-067 and available online at various locations including
            www.azoralaw.com/orclicense, paizo.com/orclicense and others. All
            warranties are disclaimed as set forth therein.
          </p>
        </Card>

        <Card title="Attribution">
          <p>This product is based on the following Licensed Material:</p>
          <div class="source-search">
            <Input type="search" placeholder="Filter sources…" bind:value={sourceFilter} />
          </div>
          <ul class="source-list">
            {#each filteredSources as { title, year }}
              <li>{title}{#if year}, © {year}{/if}, Paizo Inc.</li>
            {:else}
              <li class="no-match">No sources match “{sourceFilter}”.</li>
            {/each}
          </ul>
        </Card>

        <Card title="Reserved Material">
          <p>
            This application's own original content (code, interface, and tools) is
            Reserved Material and is not licensed under the ORC License.
          </p>
        </Card>

        <Card title="Expressly Designated Licensed Material">
          <p>This product contains no Expressly Designated Licensed Material.</p>
        </Card>
      </div>

      <div class="license-image">
        <img src={orcImage} alt="ORC License" />
      </div>
    </div>
  {:else}
    <div class="license-text">
      <h3>Software License</h3>
      <p>
        This application is free software, released under the GNU General Public
        License, version 3.
      </p>
      <p>
        <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">
          Read the full GNU General Public License v3
        </a>
      </p>

      <ul class="repo-links">
        <li>
          <a href="https://github.com/rune-goblin/pf2e-encounters" target="_blank" rel="noopener noreferrer">
            <img src={githubIcon} alt="" aria-hidden="true" />
            View this project on GitHub
          </a>
        </li>
        <li>
          <a href="https://github.com/maxiride/pf2e-encounters" target="_blank" rel="noopener noreferrer">
            <img src={githubIcon} alt="" aria-hidden="true" />
            Based on the original work by maxiride
          </a>
        </li>
      </ul>
    </div>
  {/if}
</section>

<style>
  .license-view {
    position: relative;
    background: var(--surface-neutral-lowest);
    border: var(--border-width-1) solid var(--border-neutral-subtle);
    border-radius: var(--radius-xl);
    padding: var(--space-32);
    margin-top: var(--space-16);
  }

  .close {
    position: absolute;
    top: var(--space-12);
    right: var(--space-16);
    background: transparent;
    border: 0;
    padding: var(--space-8);
    line-height: 1;
    font-size: var(--font-size-4xl);
    color: var(--text-tertiary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background var(--duration-150), color var(--duration-150);
  }
  .close:hover {
    background: var(--surface-neutral-high);
    color: var(--text-primary);
  }

  .tabs {
    margin-right: var(--space-32);
    margin-bottom: var(--space-24);
  }

  .license-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--space-32);
    align-items: start;
  }

  .license-text {
    min-width: 0;
  }

  .license-cards {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  .repo-links {
    list-style: none;
    padding: 0;
    margin: var(--space-16) 0 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }
  .repo-links li {
    margin: 0;
  }
  .repo-links a {
    display: inline-flex;
    align-items: center;
    gap: var(--space-8);
  }
  .repo-links img {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .source-search {
    margin: var(--space-8) 0 var(--space-12);
    max-width: 320px;
  }
  .source-list {
    max-height: 220px;
    overflow-y: auto;
    margin-top: 0;
  }
  .source-list li {
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-2);
  }
  .source-list li.no-match {
    list-style: none;
    color: var(--text-tertiary);
  }

  .license-image img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: var(--radius-lg);
  }

  @media (max-width: 768px) {
    .license-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
