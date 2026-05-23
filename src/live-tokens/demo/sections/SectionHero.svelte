<script lang="ts">
  import Button from '../../system/components/Button.svelte';
  import FloatingTokenTags from '../../system/components/FloatingTokenTags.svelte';
  import { navigate } from '../../editor/core/routing/router';

  const isDev = import.meta.env.DEV;
</script>

<header class="hero">
  <div class="hero-kite">
    <FloatingTokenTags />
  </div>

  <div class="hero-text">
    <h1 class="hero-title">
      Live Tokens<br />
      <span class="hero-italic">The design system with an editor.</span>
    </h1>

    <p class="hero-tagline">
      Design system authoring for Svelte.<br />
      Edit tokens and components directly in the browser.<br />Ship plain CSS.
    </p>

    <div class="hero-actions">
      {#if isDev}
        <Button variant="secondary" onclick={() => navigate('/components')} icon="fas fa-puzzle-piece" iconPosition="left">
          Browse Components
        </Button>
        <Button onclick={() => navigate('/editor')} icon="fas fa-sliders" iconPosition="left">
          Open Token Editor
        </Button>
      {:else}
        <Button variant="outline" disabled>Editor &nbsp;·&nbsp; dev only</Button>
      {/if}
    </div>
  </div>
</header>

<style>
  .hero {
    grid-column: 1 / -1;
    position: relative;
    padding: var(--space-48) 0 var(--space-16);
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    isolation: isolate;
  }

  .hero-text {
    grid-column: 2 / span 5;
    grid-row: 1;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    position: relative;
    padding: var(--space-96) 0 0;
  }

  .hero-kite {
    grid-column: 5 / span 8;
    grid-row: 1;
    height: 32rem;
    margin-top: 1rem;
    position: relative;
  }

  .hero-kite::before {
    content: '';
    position: absolute;
    inset: -100% -100%;
    background: radial-gradient(
      ellipse 38% 48% at 50% 50%,
      color-mix(in srgb, var(--color-brand-500) 26%, transparent) 0%,
      transparent 100%
    );
    pointer-events: none;
    z-index: -1;
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: var(--font-size-7xl);
    font-weight: var(--font-weight-semibold);
    font-variation-settings: 'opsz' 144, 'SOFT' 30;
    color: var(--text-primary);
    line-height: .9;
    margin: 0;
  }

  .hero-italic {
    font-family: var(--font-serif);
    font-size: var(--font-size-6xl);
    font-weight: var(--font-weight-normal);
    color: var(--text-brand);
    font-variation-settings: 'opsz' 144, 'SOFT' 100;
    white-space: nowrap;
  }

  .hero-tagline {
    font-family: var(--font-serif);
    font-size: var(--font-size-2xl);
    color: var(--text-secondary);
    line-height: 1.2;
    max-width: 48rem;
    margin: var(--space-8) 0 0;
  }

  .hero-actions {
    display: flex;
    gap: var(--space-12);
    flex-wrap: wrap;
    margin-top: auto;
    padding-top: var(--space-24);
  }

  @media (max-width: 960px) {
    .hero-kite {
      grid-column: 1 / -1;
      grid-row: 1;
      height: 28rem;
    }
    .hero-text {
      grid-column: 1 / -1;
      grid-row: 2;
      align-self: center;
      padding: 0;
    }
    .hero-actions {
      margin-top: var(--space-12);
      padding-top: 0;
    }
  }

  @media (max-width: 600px) {
    .hero-title {
      font-size: var(--font-size-5xl);
    }
  }
</style>
