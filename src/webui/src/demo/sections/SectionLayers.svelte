<script lang="ts">
  import Badge from '../../system/components/Badge.svelte';
  import Card from '../../system/components/Card.svelte';
  import Table from '../../system/components/Table.svelte';
  import Section from '../Section.svelte';
</script>

<Section
  title="Two layers, no surprises."
  description="A base of raw tokens. An upper layer of components that consume them through semantic names."
  gap="var(--space-8)"
>
  <div class="arch">
    <Card class="arch-card arch-base" icon="fas fa-layer-group" title="Base layer · tokens.css">
      <p>
        Raw CSS variables for every primitive. Colour, type, spacing, radii,
        shadows, motion. Names describe values, not the components that use them.
      </p>
      <pre class="code-block"><code>{`--color-brand-500: #eb0ad4;
--space-16:        1rem;
--radius-md:       0.25rem;
--duration-150:    150ms;`}</code></pre>
    </Card>

    <Card class="arch-card arch-component" icon="fas fa-shapes" title="Upper layer · components">
      <p>
        Each component declares its own semantic tokens and binds them to base
        tokens. Edit a base token, and every consumer updates instantly.
      </p>

      <pre class="code-block"><code>{`--button-primary-surface:
  var(--surface-brand-high);

--surface-brand-high:
  var(--color-brand-700);`}</code></pre>
    </Card>

    <div class="arch-table">
      <header class="arch-table-header">
        <span class="arch-eyebrow">A real resolution chain</span>
        <h3>One base edit. Four touchpoints.</h3>
      </header>
      <Table>
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Resolves to</th>
              <th>Layer</th>
              <th>Used by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>--button-primary-surface</code></td>
              <td><code>var(--surface-brand-high)</code></td>
              <td><Badge variant="neutral" size="small">Component</Badge></td>
              <td>Button</td>
            </tr>
            <tr>
              <td><code>--surface-brand-high</code></td>
              <td><code>var(--color-brand-700)</code></td>
              <td><Badge variant="accent" size="small">Semantic</Badge></td>
              <td>Badge, Button, Card</td>
            </tr>
            <tr>
              <td><code>--color-brand-700</code></td>
              <td><code>#ac009b</code></td>
              <td><Badge variant="primary" size="small">Base</Badge></td>
              <td>10 components</td>
            </tr>
            <tr>
              <td><code>--color-brand-500</code></td>
              <td><code>#eb0ad4</code></td>
              <td><Badge variant="primary" size="small">Base</Badge></td>
              <td>11 components</td>
            </tr>
          </tbody>
        </table>
      </Table>
    </div>
  </div>
</Section>

<style>
  .arch {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    column-gap: var(--columns-gutter);
    row-gap: var(--space-32);
  }

  .arch :global(.arch-card) {
    height: 100%;
  }

  .arch-table {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  .arch-table-header {
    padding: 0 var(--space-4);
  }

  .arch-eyebrow {
    display: block;
    font-family: var(--font-sans);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    color: var(--text-accent);
    margin-bottom: var(--space-4);
  }

  .arch-table-header h3 {
    font-family: var(--font-display);
    font-style: italic;
    font-size: var(--font-size-2xl);
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
    margin: 0;
    line-height: 1.1;
  }

  .arch-table :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
    color: var(--text-primary);
    background: var(--overlay-low);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .arch :global(.code-block) {
    margin: var(--space-16) 0 0;
    padding: var(--space-12) var(--space-16);
    background: var(--surface-neutral-lowest);
    border: var(--border-width-1) solid var(--border-neutral-faint);
    border-radius: var(--radius-md);
    overflow-x: auto;
  }

  .arch :global(.code-block code) {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-accent);
    background: none;
    padding: 0;
    line-height: 1.7;
    white-space: pre;
  }

  @media (max-width: 960px) {
    .arch {
      grid-template-columns: 1fr;
    }
  }
</style>
