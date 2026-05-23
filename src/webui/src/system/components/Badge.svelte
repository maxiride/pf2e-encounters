<script module lang="ts">
  export const badgeVariants = [
    'primary',
    'accent',
    'neutral',
    'alternate',
    'canvas',
    'special',
    'success',
    'warning',
    'danger',
    'info',
  ] as const;
  export type BadgeVariant = typeof badgeVariants[number];
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: BadgeVariant;
    size?: 'default' | 'small';
    icon?: string | undefined;
    /** Custom icon content. Falls back to `icon` prop's font-icon class. Renamed from `slot="icon"` in 0.5.0. */
    iconSlot?: Snippet;
    children?: Snippet;
  }

  let {
    variant = 'info',
    size = 'default',
    icon = undefined,
    iconSlot,
    children,
  }: Props = $props();
</script>

<span
  class="badge badge-{variant}"
  class:badge-small={size === 'small'}
>
  {#if icon}
    <span class="icon"><i class={icon}></i></span>
  {:else if iconSlot}
    <span class="icon">{@render iconSlot()}</span>
  {/if}
  {@render children?.()}
</span>

<style lang="scss">
  @use '../styles/padding' as *;

  $variants: info, accent, primary, success, warning, danger, neutral, special, alternate, canvas;

  // Per-variant token block kept flat (not collapsed via SCSS @each) so the
  // Layer-2 token-discovery parser (`extractGlobalRootBody` in
  // src/lib/parsers/globalRootBlock.ts) can read the .svelte source verbatim;
  // @each interpolation would make the parser see zero tokens for Badge,
  // even though the rendered DOM would be identical. See parallel comment in
  // Notification.svelte. `--text-primary` is the neutral primary text (with
  // -secondary/-tertiary scale); `--text-brand` is the brand-family text.
  :global(:root) {
    /* Primary */
    --badge-primary-surface: var(--surface-brand);
    --badge-primary-text: var(--text-brand);
    --badge-primary-border: var(--border-brand);
    --badge-primary-text-font-family: var(--font-sans);
    --badge-primary-text-font-size: var(--font-size-sm);
    --badge-primary-text-font-weight: var(--font-weight-light);
    --badge-primary-text-line-height: var(--line-height-xs);
    --badge-primary-border-width: var(--border-width-1);
    --badge-primary-radius: var(--radius-full);
    --badge-primary-padding: var(--space-6);
    --badge-primary-shadow: var(--shadow-none);
    --badge-primary-blur: var(--blur-none);
    --badge-primary-icon-size: var(--icon-size-sm);

    /* Accent */
    --badge-accent-surface: var(--surface-accent);
    --badge-accent-text: var(--text-accent);
    --badge-accent-border: var(--border-accent);
    --badge-accent-text-font-family: var(--font-sans);
    --badge-accent-text-font-size: var(--font-size-sm);
    --badge-accent-text-font-weight: var(--font-weight-light);
    --badge-accent-text-line-height: var(--line-height-xs);
    --badge-accent-border-width: var(--border-width-1);
    --badge-accent-radius: var(--radius-full);
    --badge-accent-padding: var(--space-6);
    --badge-accent-shadow: var(--shadow-none);
    --badge-accent-blur: var(--blur-none);
    --badge-accent-icon-size: var(--icon-size-sm);

    /* Neutral */
    --badge-neutral-surface: var(--surface-neutral);
    --badge-neutral-text: var(--text-primary);
    --badge-neutral-border: var(--border-neutral);
    --badge-neutral-text-font-family: var(--font-sans);
    --badge-neutral-text-font-size: var(--font-size-sm);
    --badge-neutral-text-font-weight: var(--font-weight-light);
    --badge-neutral-text-line-height: var(--line-height-xs);
    --badge-neutral-border-width: var(--border-width-1);
    --badge-neutral-radius: var(--radius-full);
    --badge-neutral-padding: var(--space-6);
    --badge-neutral-shadow: var(--shadow-none);
    --badge-neutral-blur: var(--blur-none);
    --badge-neutral-icon-size: var(--icon-size-sm);

    /* Alternate */
    --badge-alternate-surface: var(--surface-alternate);
    --badge-alternate-text: var(--text-alternate);
    --badge-alternate-border: var(--border-alternate);
    --badge-alternate-text-font-family: var(--font-sans);
    --badge-alternate-text-font-size: var(--font-size-sm);
    --badge-alternate-text-font-weight: var(--font-weight-light);
    --badge-alternate-text-line-height: var(--line-height-xs);
    --badge-alternate-border-width: var(--border-width-1);
    --badge-alternate-radius: var(--radius-full);
    --badge-alternate-padding: var(--space-6);
    --badge-alternate-shadow: var(--shadow-none);
    --badge-alternate-blur: var(--blur-none);
    --badge-alternate-icon-size: var(--icon-size-sm);

    /* Canvas */
    --badge-canvas-surface: var(--surface-canvas);
    --badge-canvas-text: var(--text-canvas);
    --badge-canvas-border: var(--border-canvas);
    --badge-canvas-text-font-family: var(--font-sans);
    --badge-canvas-text-font-size: var(--font-size-sm);
    --badge-canvas-text-font-weight: var(--font-weight-light);
    --badge-canvas-text-line-height: var(--line-height-xs);
    --badge-canvas-border-width: var(--border-width-1);
    --badge-canvas-radius: var(--radius-full);
    --badge-canvas-padding: var(--space-6);
    --badge-canvas-shadow: var(--shadow-none);
    --badge-canvas-blur: var(--blur-none);
    --badge-canvas-icon-size: var(--icon-size-sm);

    /* Special */
    --badge-special-surface: var(--surface-special);
    --badge-special-text: var(--text-special);
    --badge-special-border: var(--border-special);
    --badge-special-text-font-family: var(--font-sans);
    --badge-special-text-font-size: var(--font-size-sm);
    --badge-special-text-font-weight: var(--font-weight-light);
    --badge-special-text-line-height: var(--line-height-xs);
    --badge-special-border-width: var(--border-width-1);
    --badge-special-radius: var(--radius-full);
    --badge-special-padding: var(--space-6);
    --badge-special-shadow: var(--shadow-none);
    --badge-special-blur: var(--blur-none);
    --badge-special-icon-size: var(--icon-size-sm);

    /* Success */
    --badge-success-surface: var(--surface-success);
    --badge-success-text: var(--text-success);
    --badge-success-border: var(--border-success);
    --badge-success-text-font-family: var(--font-sans);
    --badge-success-text-font-size: var(--font-size-sm);
    --badge-success-text-font-weight: var(--font-weight-light);
    --badge-success-text-line-height: var(--line-height-xs);
    --badge-success-border-width: var(--border-width-1);
    --badge-success-radius: var(--radius-full);
    --badge-success-padding: var(--space-6);
    --badge-success-shadow: var(--shadow-none);
    --badge-success-blur: var(--blur-none);
    --badge-success-icon-size: var(--icon-size-sm);

    /* Warning */
    --badge-warning-surface: var(--surface-warning);
    --badge-warning-text: var(--text-warning);
    --badge-warning-border: var(--border-warning);
    --badge-warning-text-font-family: var(--font-sans);
    --badge-warning-text-font-size: var(--font-size-sm);
    --badge-warning-text-font-weight: var(--font-weight-light);
    --badge-warning-text-line-height: var(--line-height-xs);
    --badge-warning-border-width: var(--border-width-1);
    --badge-warning-radius: var(--radius-full);
    --badge-warning-padding: var(--space-6);
    --badge-warning-shadow: var(--shadow-none);
    --badge-warning-blur: var(--blur-none);
    --badge-warning-icon-size: var(--icon-size-sm);

    /* Danger */
    --badge-danger-surface: var(--surface-danger);
    --badge-danger-text: var(--text-danger);
    --badge-danger-border: var(--border-danger);
    --badge-danger-text-font-family: var(--font-sans);
    --badge-danger-text-font-size: var(--font-size-sm);
    --badge-danger-text-font-weight: var(--font-weight-light);
    --badge-danger-text-line-height: var(--line-height-xs);
    --badge-danger-border-width: var(--border-width-1);
    --badge-danger-radius: var(--radius-full);
    --badge-danger-padding: var(--space-6);
    --badge-danger-shadow: var(--shadow-none);
    --badge-danger-blur: var(--blur-none);
    --badge-danger-icon-size: var(--icon-size-sm);

    /* Info */
    --badge-info-surface: var(--surface-info);
    --badge-info-text: var(--text-info);
    --badge-info-border: var(--border-info);
    --badge-info-text-font-family: var(--font-sans);
    --badge-info-text-font-size: var(--font-size-sm);
    --badge-info-text-font-weight: var(--font-weight-light);
    --badge-info-text-line-height: var(--line-height-xs);
    --badge-info-border-width: var(--border-width-1);
    --badge-info-radius: var(--radius-full);
    --badge-info-padding: var(--space-6);
    --badge-info-shadow: var(--shadow-none);
    --badge-info-blur: var(--blur-none);
    --badge-info-icon-size: var(--icon-size-sm);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    line-height: var(--line-height-xs);
    white-space: nowrap;
    backdrop-filter: blur(var(--badge-blur, 0));
    -webkit-backdrop-filter: blur(var(--badge-blur, 0));
  }

  .icon {
    display: inline-flex;
    align-items: center;
    font-size: var(--badge-icon-size, 1em);
  }

  .icon:empty {
    display: none;
  }

  .badge-small {
    gap: var(--space-4);
  }

  @each $v in $variants {
    .badge-#{$v} {
      --badge-icon-size: var(--badge-#{$v}-icon-size);
      --badge-blur: var(--badge-#{$v}-blur);
      color: var(--badge-#{$v}-text);
      background: var(--badge-#{$v}-surface);
      border: var(--badge-#{$v}-border-width) solid var(--badge-#{$v}-border);
      border-radius: var(--badge-#{$v}-radius);
      @include themed-padding(--badge-#{$v}-padding, $h: 2);
      font-family: var(--badge-#{$v}-text-font-family);
      font-size: var(--badge-#{$v}-text-font-size);
      font-weight: var(--badge-#{$v}-text-font-weight);
      line-height: var(--badge-#{$v}-text-line-height);
      box-shadow: var(--badge-#{$v}-shadow);
    }
  }
</style>
