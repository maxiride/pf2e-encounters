<script module lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'notification';
  const variants = ['info', 'success', 'warning', 'danger'] as const;
  type Variant = typeof variants[number];

  // Per variant: notification frame (surface, border, border-width, radius, padding) + icon (color, size)
  // + action backdrop surface (paints behind the optional header action button).
  function variantTokens(v: Variant): Token[] {
    return [
      { label: 'surface color', groupKey: 'surface', variable: `--notification-${v}-surface` },
      { label: 'action surface', groupKey: 'action-surface', variable: `--notification-${v}-action-surface` },
      { label: 'border color', groupKey: 'border', variable: `--notification-${v}-border` },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--notification-${v}-border-width` },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--notification-${v}-radius` },
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--notification-${v}-padding` },
      { label: 'icon color', groupKey: 'icon', variable: `--notification-${v}-icon` },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: `--notification-${v}-icon-size` },
    ];
  }

  // Two type groups per variant: title and body text.
  function variantTypeGroups(v: Variant): TypeGroupConfig[] {
    return [
      {
        legend: 'title',
        colorVariable: `--notification-${v}-title`,
        familyVariable: `--notification-${v}-title-font-family`,
        sizeVariable: `--notification-${v}-title-font-size`,
        weightVariable: `--notification-${v}-title-font-weight`,
        lineHeightVariable: `--notification-${v}-title-line-height`,
      },
      {
        legend: 'body text',
        colorVariable: `--notification-${v}-text`,
        familyVariable: `--notification-${v}-text-font-family`,
        sizeVariable: `--notification-${v}-text-font-size`,
        weightVariable: `--notification-${v}-text-font-weight`,
        lineHeightVariable: `--notification-${v}-text-line-height`,
      },
    ];
  }
  function variantTypeGroupTokens(v: Variant): Token[] {
    return [
      { label: 'font family', canBeLinked: true, groupKey: 'title-font-family', variable: `--notification-${v}-title-font-family` },
      { label: 'font size', canBeLinked: true, groupKey: 'title-font-size', variable: `--notification-${v}-title-font-size` },
      { label: 'font weight', canBeLinked: true, groupKey: 'title-font-weight', variable: `--notification-${v}-title-font-weight` },
      { label: 'line height', canBeLinked: true, groupKey: 'title-line-height', variable: `--notification-${v}-title-line-height` },
      { label: 'font family', canBeLinked: true, groupKey: 'text-font-family', variable: `--notification-${v}-text-font-family` },
      { label: 'font size', canBeLinked: true, groupKey: 'text-font-size', variable: `--notification-${v}-text-font-size` },
      { label: 'font weight', canBeLinked: true, groupKey: 'text-font-weight', variable: `--notification-${v}-text-font-weight` },
      { label: 'line height', canBeLinked: true, groupKey: 'text-line-height', variable: `--notification-${v}-text-line-height` },
    ];
  }
  export const allTokens: Token[] = variants.flatMap((v) => [
    ...variantTokens(v),
    ...buildTypeGroupColorTokens(variantTypeGroups(v)),
    ...variantTypeGroupTokens(v),
  ]);

  // Linked block surfaces shape and font props that may be linked across variants.
  const linkableContexts = new Map<string, string>(variants.flatMap((v) => [
    [`--notification-${v}-border-width`, v] as const,
    [`--notification-${v}-radius`, v] as const,
    [`--notification-${v}-padding`, v] as const,
    [`--notification-${v}-icon-size`, v] as const,
    [`--notification-${v}-title-font-family`, v] as const,
    [`--notification-${v}-title-font-size`, v] as const,
    [`--notification-${v}-title-font-weight`, v] as const,
    [`--notification-${v}-title-line-height`, v] as const,
    [`--notification-${v}-text-font-family`, v] as const,
    [`--notification-${v}-text-font-size`, v] as const,
    [`--notification-${v}-text-font-weight`, v] as const,
    [`--notification-${v}-text-line-height`, v] as const,
  ]));

  const BUTTON_VARIANT_OPTIONS = ['none', 'primary', 'secondary', 'outline', 'success', 'danger', 'warning'] as const;
  type ButtonVariantOption = typeof BUTTON_VARIANT_OPTIONS[number];
  type ButtonVariant = Exclude<ButtonVariantOption, 'none'>;
  function variantLabel(v: ButtonVariantOption): string {
    return v.charAt(0).toUpperCase() + v.slice(1);
  }
  function toVariant(v: ButtonVariantOption): ButtonVariant | null {
    return v === 'none' ? null : v;
  }

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import Notification from '../../system/components/Notification.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import { buildSiblings } from './scaffolding/siblings';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleVariantTokens = $derived((v: Variant) => withLinkedDisabled(variantTokens(v), linked.varSet));

  import type { NotificationActions } from '../../system/components/types';

  let dismissible = $state(false);
  let rightOption: ButtonVariantOption = $state('none');
  let leftOption: ButtonVariantOption = $state('none');
  let actions = $derived(((): NotificationActions => {
    const a: NotificationActions = {};
    const right = toVariant(rightOption);
    const left = toVariant(leftOption);
    if (right) a.right = { label: 'Confirm', variant: right, onClick: () => {} };
    if (left) a.left = { label: 'Cancel', variant: left, onClick: () => {} };
    return a;
  })());
</script>

<ComponentEditorBase {component} title="Notification" description="Contextual feedback notifications with multiple variants." tokens={allTokens} {linked} variants={variantOptions}>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={{ [v]: visibleVariantTokens(v) }}
      typeGroups={{ [v]: variantTypeGroups(v) }}
      {component}
      siblings={buildSiblings(variants, v, (sv) => ({ [sv]: variantTokens(sv) }), (sv) => ({ [sv]: variantTypeGroups(sv) }))}
    >
      {#snippet canvasToolbarExtras()}
        <hr class="canvas-toolbar-divider" />
        <label class="toolbar-check">
          <input type="checkbox" bind:checked={dismissible} />
          <span>Dismissible</span>
        </label>
        <label class="toolbar-field">
          <span>Right button</span>
          <select class="canvas-toolbar-select" bind:value={rightOption}>
            {#each BUTTON_VARIANT_OPTIONS as opt}
              <option value={opt}>{variantLabel(opt)}</option>
            {/each}
          </select>
        </label>
        <label class="toolbar-field">
          <span>Left button</span>
          <select class="canvas-toolbar-select" bind:value={leftOption}>
            {#each BUTTON_VARIANT_OPTIONS as opt}
              <option value={opt}>{variantLabel(opt)}</option>
            {/each}
          </select>
        </label>
      {/snippet}
      <div class="notification-demo">
        {#if v === 'info'}
          <Notification variant="info" title="Information" description="This is an informational message to keep you updated." {dismissible} {actions} />
        {:else if v === 'success'}
          <Notification variant="success" title="Success" description="Your action was completed successfully." {dismissible} {actions} />
        {:else if v === 'warning'}
          <Notification variant="warning" title="Warning" description="Caution: This action may have unintended consequences." {dismissible} {actions} />
        {:else if v === 'danger'}
          <Notification variant="danger" title="Danger" description="Critical error: Please address this issue immediately." {dismissible} {actions} />
        {/if}
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .notification-demo {
    width: 100%;
    max-width: 46rem;
  }

  .toolbar-check {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: rgba(255, 255, 255, 0.78);
    cursor: pointer;
  }

  /* Stack label above control so a 11rem-wide toolbar isn't crowded. */
  .toolbar-field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    color: rgba(255, 255, 255, 0.6);
  }

</style>

