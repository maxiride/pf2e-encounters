<script lang="ts">
  import CollapsibleSection from '../../system/components/CollapsibleSection.svelte';
  import Section from '../Section.svelte';

  let openStep = $state('01');
  function toggleStep(id: string) {
    openStep = openStep === id ? '' : id;
  }
</script>

<Section
  title="From edit to ship."
  description="Three steps the editor takes, start to finish."
  gap="var(--space-8)"
>
  <div class="how">
    <CollapsibleSection
      variant="container"
      label="01 · Edit in the overlay"
      expanded={openStep === '01'}
      ontoggle={() => toggleStep('01')}
    >
      <p>
        Click the floating overlay (top-right in dev) to open <code>/editor</code>
        in a side panel or floating window. Tabs cover every category in the base
        layer: palette, spacing, columns, radii, type, shadows, overlays,
        gradients, and utilities. Each edit writes a CSS variable on
        <code>:root</code>, and the page reflows instantly. No reload, no rebuild.
      </p>
    </CollapsibleSection>

    <CollapsibleSection
      variant="container"
      label="02 · Save themes as JSON"
      expanded={openStep === '02'}
      ontoggle={() => toggleStep('02')}
    >
      <p>
        Save persists the active theme to <code>themes/active.json</code>. Each
        theme is a flat key/value map, diff-friendly in git, easy to round-trip.
        Switch themes from the overlay; per-session backups are kept automatically.
      </p>
    </CollapsibleSection>

    <CollapsibleSection
      variant="container"
      label="03 · Promote to production CSS"
      expanded={openStep === '03'}
      ontoggle={() => toggleStep('03')}
    >
      <p>
        Promote a theme to production and the editor flushes its values into
        <code>tokens.css</code>. The production build then ships as pure CSS.
        No editor code reaches the bundle, no runtime cost, no theme provider.
      </p>
    </CollapsibleSection>
  </div>
</Section>

<style>
  .how {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
</style>
