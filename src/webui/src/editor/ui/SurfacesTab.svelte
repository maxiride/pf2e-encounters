<script lang="ts">
  interface Swatch {
    name: string;
    variable: string;
    description: string;
  }

  interface SwatchGroup {
    title: string;
    swatches: Swatch[];
  }

  interface BorderGroup {
    title: string;
    borders: Array<{ name: string; variable: string }>;
  }

  const swatchGroups: SwatchGroup[] = [
    {
      title: 'Base Surfaces',
      swatches: [
        { name: 'Lowest', variable: '--surface-neutral-lowest', description: '10% - Deepest surface layer' },
        { name: 'Lower', variable: '--surface-neutral-lower', description: '~11% - Very subtle lift' },
        { name: 'Low', variable: '--surface-neutral-low', description: '~12% - Subtle panels' },
        { name: 'Surface', variable: '--surface-neutral', description: '~13% - Standard surface (MIDPOINT)' },
        { name: 'High', variable: '--surface-neutral-high', description: '~14% - Elevated panels' },
        { name: 'Higher', variable: '--surface-neutral-higher', description: '~14.5% - Prominent elements' },
        { name: 'Highest', variable: '--surface-neutral-highest', description: '15% - Most elevated (modals, tooltips)' }
      ]
    },
    {
      title: 'Overlays',
      swatches: [
        { name: 'Lowest', variable: '--overlay-lowest', description: 'Barely visible tint' },
        { name: 'Lower', variable: '--overlay-lower', description: 'Very subtle overlay' },
        { name: 'Low', variable: '--overlay-low', description: 'Light overlay' },
        { name: 'Overlay', variable: '--overlay', description: 'Standard overlay' },
        { name: 'High', variable: '--overlay-high', description: 'Heavy overlay' },
        { name: 'Higher', variable: '--overlay-higher', description: 'Modal backdrop' },
        { name: 'Highest', variable: '--overlay-highest', description: 'Nearly opaque' }
      ]
    },
    {
      title: 'Brand (Crimson)',
      swatches: [
        { name: 'Lowest', variable: '--surface-brand-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-brand-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-brand-low', description: 'Subtle' },
        { name: 'Brand', variable: '--surface-brand', description: 'Default' },
        { name: 'High', variable: '--surface-brand-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-brand-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-brand-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Accent (Amber)',
      swatches: [
        { name: 'Lowest', variable: '--surface-accent-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-accent-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-accent-low', description: 'Subtle' },
        { name: 'Accent', variable: '--surface-accent', description: 'Default' },
        { name: 'High', variable: '--surface-accent-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-accent-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-accent-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Success (Green)',
      swatches: [
        { name: 'Lowest', variable: '--surface-success-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-success-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-success-low', description: 'Subtle' },
        { name: 'Success', variable: '--surface-success', description: 'Default' },
        { name: 'High', variable: '--surface-success-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-success-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-success-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Warning (Orange)',
      swatches: [
        { name: 'Lowest', variable: '--surface-warning-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-warning-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-warning-low', description: 'Subtle' },
        { name: 'Warning', variable: '--surface-warning', description: 'Default' },
        { name: 'High', variable: '--surface-warning-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-warning-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-warning-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Info (Blue)',
      swatches: [
        { name: 'Lowest', variable: '--surface-info-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-info-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-info-low', description: 'Subtle' },
        { name: 'Info', variable: '--surface-info', description: 'Default' },
        { name: 'High', variable: '--surface-info-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-info-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-info-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Danger (Bright Red)',
      swatches: [
        { name: 'Lowest', variable: '--surface-danger-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-danger-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-danger-low', description: 'Subtle' },
        { name: 'Danger', variable: '--surface-danger', description: 'Default' },
        { name: 'High', variable: '--surface-danger-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-danger-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-danger-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Hover States',
      swatches: [
        { name: '', variable: '', description: 'Empty slot' },
        { name: '', variable: '', description: 'Empty slot' },
        { name: 'Low', variable: '--hover-low', description: 'Subtle hover' },
        { name: 'Hover', variable: '--hover', description: 'Standard hover' },
        { name: 'High', variable: '--hover-high', description: 'Prominent hover' },
        { name: '', variable: '', description: 'Empty slot' },
        { name: '', variable: '', description: 'Empty slot' }
      ]
    }
  ];

  let copiedVar: string | null = $state(null);
  function copyVariable(v: string) {
    navigator.clipboard.writeText(v);
    copiedVar = v;
    setTimeout(() => { copiedVar = null; }, 1000);
  }

  const borderGroups: BorderGroup[] = [
    {
      title: 'Base Borders',
      borders: [
        { name: 'Faint', variable: '--border-neutral-faint' },
        { name: 'Subtle', variable: '--border-neutral-subtle' },
        { name: 'Default', variable: '--border-neutral' },
        { name: 'Medium', variable: '--border-neutral-medium' },
        { name: 'Strong', variable: '--border-neutral-strong' }
      ]
    },
    {
      title: 'Brand (Crimson)',
      borders: [
        { name: 'Faint', variable: '--border-brand-faint' },
        { name: 'Subtle', variable: '--border-brand-subtle' },
        { name: 'Brand', variable: '--border-brand' },
        { name: 'Medium', variable: '--border-brand-medium' },
        { name: 'Strong', variable: '--border-brand-strong' }
      ]
    },
    {
      title: 'Accent (Amber)',
      borders: [
        { name: 'Faint', variable: '--border-accent-faint' },
        { name: 'Subtle', variable: '--border-accent-subtle' },
        { name: 'Accent', variable: '--border-accent' },
        { name: 'Medium', variable: '--border-accent-medium' },
        { name: 'Strong', variable: '--border-accent-strong' }
      ]
    },
    {
      title: 'Success (Green)',
      borders: [
        { name: 'Faint', variable: '--border-success-faint' },
        { name: 'Subtle', variable: '--border-success-subtle' },
        { name: 'Success', variable: '--border-success' },
        { name: 'Medium', variable: '--border-success-medium' },
        { name: 'Strong', variable: '--border-success-strong' }
      ]
    },
    {
      title: 'Warning (Orange)',
      borders: [
        { name: 'Faint', variable: '--border-warning-faint' },
        { name: 'Subtle', variable: '--border-warning-subtle' },
        { name: 'Warning', variable: '--border-warning' },
        { name: 'Medium', variable: '--border-warning-medium' },
        { name: 'Strong', variable: '--border-warning-strong' }
      ]
    },
    {
      title: 'Info (Blue)',
      borders: [
        { name: 'Faint', variable: '--border-info-faint' },
        { name: 'Subtle', variable: '--border-info-subtle' },
        { name: 'Info', variable: '--border-info' },
        { name: 'Medium', variable: '--border-info-medium' },
        { name: 'Strong', variable: '--border-info-strong' }
      ]
    },
    {
      title: 'Danger (Bright Red)',
      borders: [
        { name: 'Faint', variable: '--border-danger-faint' },
        { name: 'Subtle', variable: '--border-danger-subtle' },
        { name: 'Danger', variable: '--border-danger' },
        { name: 'Medium', variable: '--border-danger-medium' },
        { name: 'Strong', variable: '--border-danger-strong' }
      ]
    }
  ];
</script>

<div class="surfaces-container">
  <section class="section">
    <h2 class="section-title">Surfaces</h2>
    <div class="swatch-groups-grid">
      {#each swatchGroups as group}
        <div class="swatch-group">
          <h3 class="group-title">{group.title}</h3>
          <div class="swatches-row">
            {#each group.swatches as swatch}
              <div class="swatch-card">
                {#if swatch.variable !== ''}
                  <div
                    class="swatch-box"
                    style="background: var({swatch.variable});"
                  ></div>
                  <button class="swatch-name copyable" class:copied={copiedVar === swatch.variable} onclick={() => copyVariable(swatch.variable)}>{copiedVar === swatch.variable ? 'copied!' : swatch.name}</button>
                {:else}
                  <div class="swatch-box empty"></div>
                  <div class="swatch-name">&nbsp;</div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="section">
    <h2 class="section-title">Borders</h2>
    <div class="border-groups-grid">
      {#each borderGroups as group}
        <div class="border-group">
          <h3 class="group-title">{group.title}</h3>
          <div class="borders-row">
            {#each group.borders as border}
              <div class="border-card">
                <div
                  class="border-box"
                  style="border: 2px solid var({border.variable});"
                ></div>
                <button class="border-name copyable" class:copied={copiedVar === border.variable} onclick={() => copyVariable(border.variable)}>{copiedVar === border.variable ? 'copied!' : border.name}</button>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .surfaces-container {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-32);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-16);
  }

  .section-title {
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 2px solid var(--ui-border-high);
  }

  .swatch-groups-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(28rem, 100%), 1fr));
    gap: var(--ui-space-24);
  }

  .swatch-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    min-width: 0;
  }

  .group-title {
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    margin: 0;
  }

  .swatches-row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(3.5rem, 1fr));
    gap: var(--ui-space-8);
    max-width: calc(7 * 3.5rem + 6 * var(--ui-space-8));
  }

  .swatch-card {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    align-items: center;
  }

  .swatch-box {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: var(--ui-radius-md);
    flex-shrink: 0;
  }

  .swatch-box.empty {
    opacity: 0;
  }

  .swatch-name {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    text-align: center;
  }

  .swatch-name.copyable {
    all: unset;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    text-align: center;
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .swatch-name.copyable:hover {
    color: var(--ui-text-accent);
  }

  .swatch-name.copyable.copied {
    color: var(--ui-text-success);
  }

  .border-groups-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(22rem, 100%), 1fr));
    gap: var(--ui-space-24);
  }

  .border-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    min-width: 0;
  }

  .borders-row {
    display: flex;
    gap: var(--ui-space-8);
    flex-wrap: wrap;
  }

  .border-card {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    align-items: center;
  }

  .border-box {
    width: 3.5rem;
    height: 3.5rem;
    background: var(--ui-surface-low);
    border-radius: var(--ui-radius-md);
    flex-shrink: 0;
  }

  .border-name {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    text-align: center;
  }

  .border-name.copyable {
    all: unset;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    text-align: center;
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .border-name.copyable:hover {
    color: var(--ui-text-accent);
  }

  .border-name.copyable.copied {
    color: var(--ui-text-success);
  }
</style>
