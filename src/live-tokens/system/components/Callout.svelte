<script module lang="ts">
  export const calloutVariants = ['info', 'success', 'warning', 'danger'] as const;
  export type CalloutVariant = typeof calloutVariants[number];
</script>

<script lang="ts">
  interface Props {
    variant?: CalloutVariant;
    label?: string;
    children?: import('svelte').Snippet;
  }

  let { variant = 'info', label = '', children }: Props = $props();
</script>

<div class="callout callout-{variant}">
  {#if label}<strong class="callout-label">{label}</strong>{' '}{/if}<span class="callout-message">{@render children?.()}</span>
</div>

<style lang="scss">
  @use '../styles/padding' as *;

  // Kept flat (not collapsed via SCSS @each) so the Layer-2 token-discovery
  // parser (`extractGlobalRootBody` in src/lib/parsers/globalRootBlock.ts)
  // can read the .svelte source verbatim. See parallel comment in
  // Notification.svelte.
  :global(:root) {
    /* Info */
    --callout-info-surface: var(--surface-info-lowest);
    --callout-info-border: var(--border-info-subtle);
    --callout-info-border-width: var(--border-width-1);
    --callout-info-accent-width: var(--border-width-4);
    --callout-info-radius: var(--radius-lg);
    --callout-info-padding: var(--space-12);
    --callout-info-label: var(--text-primary);
    --callout-info-label-font-family: var(--font-serif);
    --callout-info-label-font-size: var(--font-size-md);
    --callout-info-label-font-weight: var(--font-weight-bold);
    --callout-info-label-line-height: var(--line-height-md);
    --callout-info-text: var(--text-info);
    --callout-info-text-font-family: var(--font-serif);
    --callout-info-text-font-size: var(--font-size-md);
    --callout-info-text-font-weight: var(--font-weight-normal);
    --callout-info-text-line-height: var(--line-height-md);

    /* Success */
    --callout-success-surface: var(--surface-success-lowest);
    --callout-success-border: var(--border-success-subtle);
    --callout-success-border-width: var(--border-width-1);
    --callout-success-accent-width: var(--border-width-4);
    --callout-success-radius: var(--radius-lg);
    --callout-success-padding: var(--space-12);
    --callout-success-label: var(--text-primary);
    --callout-success-label-font-family: var(--font-serif);
    --callout-success-label-font-size: var(--font-size-md);
    --callout-success-label-font-weight: var(--font-weight-bold);
    --callout-success-label-line-height: var(--line-height-md);
    --callout-success-text: var(--text-success);
    --callout-success-text-font-family: var(--font-serif);
    --callout-success-text-font-size: var(--font-size-md);
    --callout-success-text-font-weight: var(--font-weight-normal);
    --callout-success-text-line-height: var(--line-height-md);

    /* Warning */
    --callout-warning-surface: var(--surface-warning-lowest);
    --callout-warning-border: var(--border-warning-subtle);
    --callout-warning-border-width: var(--border-width-1);
    --callout-warning-accent-width: var(--border-width-4);
    --callout-warning-radius: var(--radius-lg);
    --callout-warning-padding: var(--space-12);
    --callout-warning-label: var(--text-primary);
    --callout-warning-label-font-family: var(--font-serif);
    --callout-warning-label-font-size: var(--font-size-md);
    --callout-warning-label-font-weight: var(--font-weight-bold);
    --callout-warning-label-line-height: var(--line-height-md);
    --callout-warning-text: var(--text-warning);
    --callout-warning-text-font-family: var(--font-serif);
    --callout-warning-text-font-size: var(--font-size-md);
    --callout-warning-text-font-weight: var(--font-weight-normal);
    --callout-warning-text-line-height: var(--line-height-md);

    /* Danger */
    --callout-danger-surface: var(--surface-danger-lowest);
    --callout-danger-border: var(--border-danger-subtle);
    --callout-danger-border-width: var(--border-width-1);
    --callout-danger-accent-width: var(--border-width-4);
    --callout-danger-radius: var(--radius-lg);
    --callout-danger-padding: var(--space-12);
    --callout-danger-label: var(--text-primary);
    --callout-danger-label-font-family: var(--font-serif);
    --callout-danger-label-font-size: var(--font-size-md);
    --callout-danger-label-font-weight: var(--font-weight-bold);
    --callout-danger-label-line-height: var(--line-height-md);
    --callout-danger-text: var(--text-danger);
    --callout-danger-text-font-family: var(--font-serif);
    --callout-danger-text-font-size: var(--font-size-md);
    --callout-danger-text-font-weight: var(--font-weight-normal);
    --callout-danger-text-line-height: var(--line-height-md);
  }

  .callout {
    margin: var(--space-24) 0;

    :global(p) {
      margin: 0;
      display: inline;
    }

    :global(a) {
      color: inherit;
      text-decoration: underline;
      text-underline-offset: 2px;

      &:hover {
        opacity: 0.8;
      }
    }
  }

  .callout-label {
    margin-right: 0.25em;
  }

  // Variant rules differ only by token prefix.
  @each $variant in (info, success, warning, danger) {
    .callout-#{$variant} {
      background: var(--callout-#{$variant}-surface);
      border: var(--callout-#{$variant}-border-width) solid var(--callout-#{$variant}-border);
      border-left-width: var(--callout-#{$variant}-accent-width);
      border-radius: var(--callout-#{$variant}-radius);
      @include themed-padding(--callout-#{$variant}-padding, $h: 1.33);

      .callout-label {
        color: var(--callout-#{$variant}-label);
        font-family: var(--callout-#{$variant}-label-font-family);
        font-size: var(--callout-#{$variant}-label-font-size);
        font-weight: var(--callout-#{$variant}-label-font-weight);
        line-height: var(--callout-#{$variant}-label-line-height);
      }

      .callout-message {
        color: var(--callout-#{$variant}-text);
        font-family: var(--callout-#{$variant}-text-font-family);
        font-size: var(--callout-#{$variant}-text-font-size);
        font-weight: var(--callout-#{$variant}-text-font-weight);
        line-height: var(--callout-#{$variant}-text-line-height);
      }
    }
  }
</style>
