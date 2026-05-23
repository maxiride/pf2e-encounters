<script lang="ts">
  interface TextColorGroup {
    title: string;
    colors: Array<{ name: string; variable: string; description: string }>;
  }

  const textColorGroups: TextColorGroup[] = [
    {
      title: 'Base Text Colors',
      colors: [
        { name: 'Primary', variable: '--text-primary', description: 'Main text color' },
        { name: 'Secondary', variable: '--text-secondary', description: 'Less prominent text' },
        { name: 'Tertiary', variable: '--text-tertiary', description: 'Subtle text' },
        { name: 'Muted', variable: '--text-muted', description: 'De-emphasized text' },
        { name: 'Disabled', variable: '--text-disabled', description: 'Disabled state text' },
        { name: 'Inverted', variable: '--text-inverted', description: 'Dark text for light backgrounds' }
      ]
    },
    {
      title: 'Brand Text Colors (Crimson)',
      colors: [
        { name: 'Brand', variable: '--text-brand', description: 'Primary - Main text color' },
        { name: 'Brand Secondary', variable: '--text-brand-secondary', description: 'Secondary - Less prominent' },
        { name: 'Brand Tertiary', variable: '--text-brand-tertiary', description: 'Tertiary - Subtle text' },
        { name: 'Brand Muted', variable: '--text-brand-muted', description: 'Muted - De-emphasized' },
        { name: 'Brand Disabled', variable: '--text-brand-disabled', description: 'Disabled - Disabled state' }
      ]
    },
    {
      title: 'Accent Text Colors (Amber)',
      colors: [
        { name: 'Accent', variable: '--text-accent', description: 'Primary - Main text color' },
        { name: 'Accent Secondary', variable: '--text-accent-secondary', description: 'Secondary - Less prominent' },
        { name: 'Accent Tertiary', variable: '--text-accent-tertiary', description: 'Tertiary - Subtle text' },
        { name: 'Accent Muted', variable: '--text-accent-muted', description: 'Muted - De-emphasized' },
        { name: 'Accent Disabled', variable: '--text-accent-disabled', description: 'Disabled - Disabled state' }
      ]
    },
    {
      title: 'Success Text Colors',
      colors: [
        { name: 'Success', variable: '--text-success', description: 'Primary - Main text color' },
        { name: 'Success Secondary', variable: '--text-success-secondary', description: 'Secondary - Less prominent' },
        { name: 'Success Tertiary', variable: '--text-success-tertiary', description: 'Tertiary - Subtle text' },
        { name: 'Success Muted', variable: '--text-success-muted', description: 'Muted - De-emphasized' },
        { name: 'Success Disabled', variable: '--text-success-disabled', description: 'Disabled - Disabled state' }
      ]
    },
    {
      title: 'Warning Text Colors',
      colors: [
        { name: 'Warning', variable: '--text-warning', description: 'Primary - Main text color' },
        { name: 'Warning Secondary', variable: '--text-warning-secondary', description: 'Secondary - Less prominent' },
        { name: 'Warning Tertiary', variable: '--text-warning-tertiary', description: 'Tertiary - Subtle text' },
        { name: 'Warning Muted', variable: '--text-warning-muted', description: 'Muted - De-emphasized' },
        { name: 'Warning Disabled', variable: '--text-warning-disabled', description: 'Disabled - Disabled state' }
      ]
    },
    {
      title: 'Info Text Colors',
      colors: [
        { name: 'Info', variable: '--text-info', description: 'Primary - Main text color' },
        { name: 'Info Secondary', variable: '--text-info-secondary', description: 'Secondary - Less prominent' },
        { name: 'Info Tertiary', variable: '--text-info-tertiary', description: 'Tertiary - Subtle text' },
        { name: 'Info Muted', variable: '--text-info-muted', description: 'Muted - De-emphasized' },
        { name: 'Info Disabled', variable: '--text-info-disabled', description: 'Disabled - Disabled state' }
      ]
    },
    {
      title: 'Danger Text Colors',
      colors: [
        { name: 'Danger', variable: '--text-danger', description: 'Primary - Main text color' },
        { name: 'Danger Secondary', variable: '--text-danger-secondary', description: 'Secondary - Less prominent' },
        { name: 'Danger Tertiary', variable: '--text-danger-tertiary', description: 'Tertiary - Subtle text' },
        { name: 'Danger Muted', variable: '--text-danger-muted', description: 'Muted - De-emphasized' },
        { name: 'Danger Disabled', variable: '--text-danger-disabled', description: 'Disabled - Disabled state' }
      ]
    }
  ];

  let copiedVar: string | null = $state(null);
  function copyVariable(v: string) {
    navigator.clipboard.writeText(v);
    copiedVar = v;
    setTimeout(() => { copiedVar = null; }, 1000);
  }
</script>

<div class="text-container">
  {#each textColorGroups as group}
    <section class="color-group">
      <h3 class="group-title">{group.title}</h3>
      <div class="text-colors-grid">
        {#each group.colors as color}
          <div class="text-color-card">
            <div
              class="text-color-preview"
              style="color: var({color.variable});"
            >
              Ag
            </div>
            <div class="text-color-info">
              <button class="text-color-name copyable" class:copied={copiedVar === color.variable} onclick={() => copyVariable(color.variable)}>{copiedVar === color.variable ? 'copied!' : color.name}</button>
              <div class="text-color-variable">{color.variable}</div>
              <div class="text-color-description">{color.description}</div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .text-container {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-24);
  }

  .color-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
  }

  .group-title {
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    margin: 0;
    padding-bottom: var(--ui-space-4);
    border-bottom: 1px solid var(--ui-border-low);
  }

  .text-colors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--ui-space-12);
  }

  .text-color-card {
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    padding: var(--ui-space-12);
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    align-items: center;
  }

  .text-color-preview {
    font-size: var(--font-size-4xl);
    font-weight: var(--ui-font-weight-bold);
    line-height: 1;
  }

  .text-color-info {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    align-items: center;
    text-align: center;
  }

  .text-color-name {
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .text-color-name.copyable {
    all: unset;
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .text-color-name.copyable:hover {
    color: var(--ui-text-accent);
  }

  .text-color-name.copyable.copied {
    color: var(--ui-text-success);
  }

  .text-color-variable {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    background: var(--ui-surface-lowest);
    padding: var(--ui-space-2) var(--ui-space-4);
    border-radius: var(--ui-radius-sm);
  }

  .text-color-description {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
  }
</style>
