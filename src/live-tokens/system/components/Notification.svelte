<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import Button from './Button.svelte';
   import type { NotificationActions } from './types';

   interface Props {
      title: string;
      description: string;
      variant?: 'info' | 'warning' | 'danger' | 'success';
      size?: 'normal' | 'compact';
      icon?: string;
      dismissible?: boolean;
      emphasis?: boolean;
      actions?: NotificationActions;
      /** Dismiss callback. Preferred over `on:dismiss` from 0.5.0 onward. */
      ondismiss?: () => void;
      children?: import('svelte').Snippet;
   }

   let {
      title,
      description,
      variant = 'info',
      size = 'normal',
      icon = '',
      dismissible = false,
      emphasis = false,
      actions = {},
      ondismiss,
      children
   }: Props = $props();

   // Dual-fire bridge — see Button.svelte for the deprecation timeline.
   const dispatch = createEventDispatcher();

   // Default icons based on variant
   const defaultIcons = {
      info: 'fas fa-info-circle',
      warning: 'fas fa-exclamation-triangle',
      danger: 'fas fa-times-circle',
      success: 'fas fa-check-circle'
   };

   let displayIcon = $derived(icon || defaultIcons[variant]);

   function handleDismiss() {
      ondismiss?.();
      dispatch('dismiss');
   }
</script>

<div class="notification" class:info={variant === 'info'} class:warning={variant === 'warning'} class:danger={variant === 'danger'} class:success={variant === 'success'} class:emphasis={emphasis} class:compact={size === 'compact'}>
   <div class="notification-header" class:has-action={actions.header}>
      <i class={displayIcon}></i>
      <span class="notification-title">{title}</span>
      {#if actions.header}
         <div class="action-button-backdrop">
            <Button variant={actions.header.variant ?? 'outline'} icon={actions.header.icon} disabled={actions.header.disabled} on:click={actions.header.onClick}>
               {actions.header.label ?? ''}
            </Button>
         </div>
      {/if}
      {#if dismissible}
         <button class="notification-close" onclick={handleDismiss} type="button" aria-label="Dismiss">
            <i class="fas fa-times"></i>
         </button>
      {/if}
   </div>
   {#if (description && !actions.inline) || actions.right || actions.left}
      <div class="notification-body">
         {#if description && !actions.inline}
            <div class="notification-description">{description}</div>
         {/if}
         {#if actions.right || actions.left}
            <div class="notification-body-actions">
               {#if actions.left}
                  <Button variant={actions.left.variant ?? 'outline'} icon={actions.left.icon} disabled={actions.left.disabled} on:click={actions.left.onClick}>
                     {actions.left.label ?? ''}
                  </Button>
               {/if}
               {#if actions.right}
                  <Button variant={actions.right.variant ?? 'primary'} icon={actions.right.icon} disabled={actions.right.disabled} on:click={actions.right.onClick}>
                     {actions.right.label ?? ''}
                  </Button>
               {/if}
            </div>
         {/if}
      </div>
   {/if}
   {@render children?.()}
   {#if actions.inline}
      <div class="notification-actions-inline">
         {#if description}
            <span class="description-text">{description}</span>
         {/if}
         <Button variant={actions.inline.variant ?? 'outline'} icon={actions.inline.icon} disabled={actions.inline.disabled} on:click={actions.inline.onClick}>
            {actions.inline.label ?? ''}
         </Button>
      </div>
   {/if}
</div>

<style lang="scss">
   @use '../styles/padding' as *;

   // The four-variant token block below is intentionally NOT collapsed via SCSS
   // `@each`. The Layer-2 token-discovery parser (`extractGlobalRootBody` in
   // src/lib/parsers/globalRootBlock.ts) reads the `.svelte` source verbatim and
   // does not pre-compile SCSS — wrapping these declarations in `@each` would
   // make the editor's alias picker / file-manager UI see zero tokens for
   // Notification, even though the rendered DOM would be unchanged. The
   // declarations are kept flat by design so the parser can scrape them.
   :global(:root) {
      /* Info */
      --notification-info-surface: var(--surface-info);
      --notification-info-action-surface: var(--surface-neutral-lowest);
      --notification-info-border: var(--border-info);
      --notification-info-border-width: var(--border-width-1);
      --notification-info-radius: var(--radius-md);
      --notification-info-padding: var(--space-12);
      --notification-info-icon: var(--text-info);
      --notification-info-icon-size: var(--icon-size-md);
      --notification-info-title: var(--text-info);
      --notification-info-title-font-family: var(--font-sans);
      --notification-info-title-font-size: var(--font-size-lg);
      --notification-info-title-font-weight: var(--font-weight-normal);
      --notification-info-title-line-height: var(--line-height-sm);
      --notification-info-text: var(--text-primary);
      --notification-info-text-font-family: var(--font-sans);
      --notification-info-text-font-size: var(--font-size-md);
      --notification-info-text-font-weight: var(--font-weight-extralight);
      --notification-info-text-line-height: var(--line-height-md);

      /* Success */
      --notification-success-surface: var(--surface-success);
      --notification-success-action-surface: var(--surface-neutral-lowest);
      --notification-success-border: var(--border-success);
      --notification-success-border-width: var(--border-width-1);
      --notification-success-radius: var(--radius-md);
      --notification-success-padding: var(--space-12);
      --notification-success-icon: var(--text-success);
      --notification-success-icon-size: var(--icon-size-md);
      --notification-success-title: var(--text-success);
      --notification-success-title-font-family: var(--font-sans);
      --notification-success-title-font-size: var(--font-size-lg);
      --notification-success-title-font-weight: var(--font-weight-normal);
      --notification-success-title-line-height: var(--line-height-sm);
      --notification-success-text: var(--text-primary);
      --notification-success-text-font-family: var(--font-sans);
      --notification-success-text-font-size: var(--font-size-md);
      --notification-success-text-font-weight: var(--font-weight-extralight);
      --notification-success-text-line-height: var(--line-height-md);

      /* Warning */
      --notification-warning-surface: var(--surface-warning);
      --notification-warning-action-surface: var(--surface-neutral-lowest);
      --notification-warning-border: var(--border-warning);
      --notification-warning-border-width: var(--border-width-1);
      --notification-warning-radius: var(--radius-md);
      --notification-warning-padding: var(--space-12);
      --notification-warning-icon: var(--text-warning);
      --notification-warning-icon-size: var(--icon-size-md);
      --notification-warning-title: var(--text-warning);
      --notification-warning-title-font-family: var(--font-sans);
      --notification-warning-title-font-size: var(--font-size-lg);
      --notification-warning-title-font-weight: var(--font-weight-normal);
      --notification-warning-title-line-height: var(--line-height-sm);
      --notification-warning-text: var(--text-primary);
      --notification-warning-text-font-family: var(--font-sans);
      --notification-warning-text-font-size: var(--font-size-md);
      --notification-warning-text-font-weight: var(--font-weight-extralight);
      --notification-warning-text-line-height: var(--line-height-md);

      /* Danger */
      --notification-danger-surface: var(--surface-danger);
      --notification-danger-action-surface: var(--surface-neutral-lowest);
      --notification-danger-border: var(--border-danger);
      --notification-danger-border-width: var(--border-width-1);
      --notification-danger-radius: var(--radius-md);
      --notification-danger-padding: var(--space-12);
      --notification-danger-icon: var(--text-danger);
      --notification-danger-icon-size: var(--icon-size-md);
      --notification-danger-title: var(--text-danger);
      --notification-danger-title-font-family: var(--font-sans);
      --notification-danger-title-font-size: var(--font-size-lg);
      --notification-danger-title-font-weight: var(--font-weight-normal);
      --notification-danger-title-line-height: var(--line-height-sm);
      --notification-danger-text: var(--text-primary);
      --notification-danger-text-font-family: var(--font-sans);
      --notification-danger-text-font-size: var(--font-size-md);
      --notification-danger-text-font-weight: var(--font-weight-extralight);
      --notification-danger-text-line-height: var(--line-height-md);
   }

   .notification {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      gap: 0;
      transition: all var(--duration-150);
      position: relative;
      text-align: left;
      overflow: hidden;

      &.emphasis {
         border-left-width: 0.375rem;
      }

      &.compact {
         font-size: var(--font-size-sm);

         .notification-description,
         .notification-actions-inline,
         .notification-actions {
            font-size: var(--font-size-sm);
         }
      }

      // Variant rules (info / warning / danger / success) only differ by token prefix.
      @each $variant in (info, warning, danger, success) {
         &.#{$variant} {
            border: var(--notification-#{$variant}-border-width) solid var(--notification-#{$variant}-border);
            border-radius: var(--notification-#{$variant}-radius);
            color: var(--notification-#{$variant}-text);
            font-family: var(--notification-#{$variant}-text-font-family);
            font-size: var(--notification-#{$variant}-text-font-size);
            font-weight: var(--notification-#{$variant}-text-font-weight);
            line-height: var(--notification-#{$variant}-text-line-height);

            .notification-header {
               background: var(--notification-#{$variant}-surface);
               @include themed-padding(--notification-#{$variant}-padding, $h: 1.33);

               i {
                  color: var(--notification-#{$variant}-icon);
                  font-size: var(--notification-#{$variant}-icon-size);
               }

               .notification-title {
                  color: var(--notification-#{$variant}-title);
                  font-family: var(--notification-#{$variant}-title-font-family);
                  font-size: var(--notification-#{$variant}-title-font-size);
                  font-weight: var(--notification-#{$variant}-title-font-weight);
                  line-height: var(--notification-#{$variant}-title-line-height);
               }

               .action-button-backdrop {
                  background: var(--notification-#{$variant}-action-surface);
               }
            }
         }
      }
   }

   .notification-header {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: var(--space-8);
      width: 100%;
      box-sizing: border-box;
      position: relative;

      // When action button is in header, add spacing
      &.has-action {
         gap: var(--space-12);
      }

      i {
         flex-shrink: 0;
      }

      .notification-title {
         text-align: left;
         flex: 1;
      }

      .action-button-backdrop {
         flex-shrink: 0;
         border-radius: var(--radius-md);
      }

      .notification-close {
         flex-shrink: 0;
         margin-left: auto;
         padding: 0;
         background: none;
         border: none;
         cursor: pointer;
         color: inherit;
         font-size: inherit;
         line-height: 1;
         transition: color var(--duration-200);

         &:hover {
            color: var(--text-primary);
         }

         &:focus {
            outline: var(--border-width-2) solid currentColor;
            outline-offset: var(--space-2);
         }
      }
   }

   // Body row: description (col 1) + optional action buttons (col 2, right-aligned).
   .notification-body {
      display: flex;
      align-items: center;
      gap: var(--space-16);
      padding: var(--space-12) var(--space-16);
      width: 100%;
      box-sizing: border-box;
      text-align: left;
   }

   .notification-description {
      flex: 1;
   }

   .notification-body-actions {
      display: flex;
      gap: var(--space-8);
      margin-left: auto;
      flex-shrink: 0;
   }

   // Action buttons - inline variant
   .notification-actions-inline {
      display: flex;
      align-items: center;
      gap: var(--space-16);
      padding: var(--space-12) var(--space-16);

      .description-text {
         flex: 1;
      }

      // Button stays on the right (doesn't shrink or grow)
      :global(button) {
         flex-shrink: 0;
         margin-left: auto;
      }
   }

   // Action buttons - standard (below description)
   .notification-actions {
      display: flex;
      gap: var(--space-8);
      padding: var(--space-12) var(--space-16);
      padding-top: var(--space-8);
      border-top: var(--border-width-1) solid var(--border-neutral-subtle);
   }

</style>
