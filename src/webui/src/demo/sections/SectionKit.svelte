<script lang="ts">
  import Card from '../../system/components/Card.svelte';
  import Section from '../Section.svelte';
</script>

<Section
  title="The Kit"
  eyebrow="What's inside"
  description="A basic set of design system components connected to Token library ."
  gap="var(--space-8)"
>
  <div class="kit-grid">
    <Card icon="fas fa-palette" title="Design tokens">
      <p>Over four hundred CSS variables for colour, type, spacing, radii, shadows, and motion. All editable in the browser.</p>
    </Card>
    <Card icon="fas fa-puzzle-piece" title="Component library">
      <p>Seventeen primitives: buttons, cards, callouts, dialogs, tabs, badges, tooltips, tables. Every surface resolves to tokens.</p>
    </Card>
    <Card icon="fas fa-pen-ruler" title="Live editor">
      <p>A side-panel overlay with tabs for every category. Each edit writes a CSS variable and the page reflows instantly.</p>
    </Card>
    <Card icon="fas fa-cube" title="Ships as CSS">
      <p>Promote a theme to production. The editor flushes its values into <code>tokens.css</code>, and the build is pure CSS.</p>
    </Card>
  </div>
</Section>

<style>
  .kit-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-24);
  }

  @media (max-width: 960px) {
    .kit-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
