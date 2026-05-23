<script module lang="ts">
  import { buildSiblings } from './scaffolding/siblings';
  import type { Token } from './scaffolding/types';

  export const component = 'button';

  const variants = ['primary', 'secondary', 'outline', 'success', 'danger', 'warning'] as const;
  type Variant = typeof variants[number];
  const stateNames = ['default', 'hover', 'disabled'] as const;
  type StateName = typeof stateNames[number];
  function statePrefix(v: Variant, s: StateName): string {
    return s === 'default' ? `--button-${v}` : `--button-${v}-${s}`;
  }
  // Single text slot: typography props are peer rows, not a TypeEditor fieldset.
  // Default carries the full font shape; hover/disabled only override text color.
  function variantStateTokens(v: Variant, s: StateName): Token[] {
    const p = statePrefix(v, s);
    const tokens: Token[] = [
      { label: 'surface color', groupKey: 'surface', variable: `${p}-surface` },
      { label: 'border color', groupKey: 'border', variable: `${p}-border` },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `${p}-border-width` },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `${p}-radius` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `${p}-padding` },
    ];
    if (s === 'default') {
      tokens.push(
        { label: 'text color', groupKey: 'text', variable: `--button-${v}-text` },
        { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--button-${v}-text-font-family` },
        { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--button-${v}-text-font-size` },
        { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--button-${v}-text-font-weight` },
        { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--button-${v}-text-line-height` },
        { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: `--button-${v}-icon-size` },
      );
    } else {
      tokens.push({ label: 'text color', groupKey: 'text', variable: `--button-${v}-${s}-text` });
    }
    return tokens;
  }

  // Outline is the only variant that paints a surface tint on :active; the rest
  // express press feedback through transform/shadow only. Expose just the one
  // tunable property here rather than adding an active state to every variant.
  const outlineActiveTokens: Token[] = [
    { label: 'surface color', groupKey: 'surface', variable: '--button-outline-active-surface' },
  ];

  function variantStates(v: Variant): Record<string, Token[]> {
    const out: Record<string, Token[]> = {};
    out.default = variantStateTokens(v, 'default');
    out.hover = variantStateTokens(v, 'hover');
    if (v === 'outline') out.active = outlineActiveTokens;
    out.disabled = variantStateTokens(v, 'disabled');
    return out;
  }
  export const allTokens: Token[] = variants.flatMap((v) =>
    Object.values(variantStates(v)).flat(),
  );

  // Shape props link across every variant × state (buttons share one geometry).
  // Typography props link across all variants.
  const linkableContexts = new Map<string, string>([
    ...variants.flatMap((v) => stateNames.flatMap((s) => [
      [`${statePrefix(v, s)}-border-width`, `${v} ${s}`] as const,
      [`${statePrefix(v, s)}-radius`, `${v} ${s}`] as const,
      [`${statePrefix(v, s)}-padding`, `${v} ${s}`] as const,
    ])),
    ...variants.flatMap((v) => [
      [`--button-${v}-text-font-family`, v] as const,
      [`--button-${v}-text-font-size`, v] as const,
      [`--button-${v}-text-font-weight`, v] as const,
      [`--button-${v}-text-line-height`, v] as const,
      [`--button-${v}-icon-size`, v] as const,
    ]),
  ]);

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import Button from '../../system/components/Button.svelte';
  import Toggle from '../ui/Toggle.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, setComponentAlias } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let shimmerRef = $derived($editorState.components.button?.aliases['--button-shimmer']);
  let shimmerEnabled = $derived(!(shimmerRef?.kind === 'token' && shimmerRef.name === '--shimmer-off'));

  function handleShimmerChange(checked: boolean) {
    setComponentAlias('button', '--button-shimmer', { kind: 'token', name: checked ? '--shimmer-on' : '--shimmer-off' });
  }

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleVariantStates = $derived((v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);
</script>

<ComponentEditorBase {component} title="Button" description="Reusable button component with multiple variants and sizes." tokens={allTokens} {linked} variants={variantOptions}>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={visibleVariantStates(v)}
      {component}
      columns={2}
      siblings={buildSiblings(variants, v, variantStates)}
    >
      {#snippet extraPropertyRows(stateName)}
        {#if stateName === 'hover'}
          <div class="property-row">
            <span class="property-label">hover shimmer</span>
            <Toggle checked={shimmerEnabled} onchange={handleShimmerChange} />
          </div>
        {/if}
      {/snippet}
      {#snippet children({ activeState })}
            {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
        {@const isDisabled = activeState === 'disabled'}
        <div class="size-row">
          <div class="size-section">
            <span class="size-label">size="default"</span>
            <div class="button-showcase-grid">
              <div class="button-showcase-item">
                <Button variant={v} disabled={isDisabled} class={forceClass}>{v.charAt(0).toUpperCase() + v.slice(1)}</Button>
              </div>
              <div class="button-showcase-item">
                <Button variant={v} icon="fas fa-star" iconPosition="left" disabled={isDisabled} class={forceClass}>With Icon</Button>
              </div>
            </div>
          </div>
          <div class="size-divider"></div>
          <div class="size-section">
            <span class="size-label">size="small"</span>
            <div class="button-showcase-grid">
              <div class="button-showcase-item">
                <Button variant={v} size="small" disabled={isDisabled} class={forceClass}>{v.charAt(0).toUpperCase() + v.slice(1)}</Button>
              </div>
              <div class="button-showcase-item">
                <Button variant={v} size="small" icon="fas fa-star" iconPosition="left" disabled={isDisabled} class={forceClass}>With Icon</Button>
              </div>
            </div>
          </div>
        </div>
                {/snippet}
        </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .size-row {
    display: flex;
    gap: var(--space-12);
    align-items: flex-start;
  }

  .size-divider {
    width: 1px;
    background: var(--ui-border-low);
    align-self: stretch;
  }

  .size-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .size-label {
    font-size: var(--font-size-xs);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-tertiary);
  }

  .button-showcase-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-16);
    align-items: start;
  }

  .button-showcase-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    align-items: flex-start;
  }
</style>
