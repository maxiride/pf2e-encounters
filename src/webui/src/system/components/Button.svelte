<script lang="ts">
   import { createEventDispatcher } from 'svelte';

   interface Props {
      disabled?: boolean;
      type?: 'button' | 'submit' | 'reset';
      variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning';
      size?: 'default' | 'small';
      ariaLabel?: string | undefined;
      tooltip?: string | undefined;
      icon?: string | undefined;
      iconPosition?: 'left' | 'right';
      fullWidth?: boolean;
      buttonRef?: HTMLButtonElement | undefined;
      class?: string;
      /** Click callback. Preferred over `on:click` from 0.5.0 onward. */
      onclick?: (event: MouseEvent) => void;
      children?: import('svelte').Snippet;
   }

   let {
      disabled = false,
      type = 'button',
      variant = 'primary',
      size = 'default',
      ariaLabel = undefined,
      tooltip = undefined,
      icon = undefined,
      iconPosition = 'left',
      fullWidth = false,
      buttonRef = $bindable(undefined),
      class: className = '',
      onclick,
      children
   }: Props = $props();

   // Dual-fire bridge: keeps Svelte-4-style `<Button on:click={fn}>` consumers
   // working until 0.6.0. Remove the dispatcher and this comment in 0.6.0.
   const dispatch = createEventDispatcher();

   function handleClick(event: MouseEvent) {
      if (!disabled) {
         onclick?.(event);
         dispatch('click', event);
      }
   }
</script>

<button
   bind:this={buttonRef}
   {type}
   class="button {variant} {className}"
   class:small={size === 'small'}
   class:full-width={fullWidth}
   {disabled}
   aria-label={ariaLabel}
   data-tooltip={tooltip}
   onclick={handleClick}
>
   {#if icon && iconPosition === 'left'}
      <i class={icon}></i>
   {/if}
   {@render children?.()}
   {#if icon && iconPosition === 'right'}
      <i class={icon}></i>
   {/if}
</button>

<style lang="scss">
   @use '../styles/padding' as *;

   :global(:root) {
      /* Shared — set to `none` to disable the hover shimmer sweep */
      --button-shimmer: block;

      /* Primary */
      --button-primary-surface: var(--surface-brand-high);
      --button-primary-text: var(--text-primary);
      --button-primary-text-font-family: var(--font-sans);
      --button-primary-text-font-size: var(--font-size-sm);
      --button-primary-text-font-weight: var(--font-weight-light);
      --button-primary-text-line-height: var(--line-height-sm);
      --button-primary-border: var(--border-brand);
      --button-primary-border-width: var(--border-width-1);
      --button-primary-radius: var(--radius-md);
      --button-primary-padding: var(--space-8);
      --button-primary-hover-surface: var(--surface-brand-higher);
      --button-primary-hover-text: var(--text-primary);
      --button-primary-hover-border: var(--border-brand-strong);
      --button-primary-hover-border-width: var(--border-width-1);
      --button-primary-hover-radius: var(--radius-md);
      --button-primary-hover-padding: var(--space-8);
      --button-primary-disabled-surface: var(--color-neutral-700);
      --button-primary-disabled-text: var(--text-tertiary);
      --button-primary-disabled-border: var(--border-neutral-faint);
      --button-primary-disabled-border-width: var(--border-width-1);
      --button-primary-disabled-radius: var(--radius-md);
      --button-primary-disabled-padding: var(--space-8);
      --button-primary-icon-size: var(--icon-size-sm);

      /* Secondary */
      --button-secondary-surface: var(--surface-neutral-high);
      --button-secondary-text: var(--text-primary);
      --button-secondary-text-font-family: var(--font-sans);
      --button-secondary-text-font-size: var(--font-size-sm);
      --button-secondary-text-font-weight: var(--font-weight-light);
      --button-secondary-text-line-height: var(--line-height-sm);
      --button-secondary-border: var(--border-neutral);
      --button-secondary-border-width: var(--border-width-1);
      --button-secondary-radius: var(--radius-md);
      --button-secondary-padding: var(--space-8);
      --button-secondary-hover-surface: var(--surface-neutral-higher);
      --button-secondary-hover-text: var(--text-primary);
      --button-secondary-hover-border: var(--border-neutral-strong);
      --button-secondary-hover-border-width: var(--border-width-1);
      --button-secondary-hover-radius: var(--radius-md);
      --button-secondary-hover-padding: var(--space-8);
      --button-secondary-disabled-surface: var(--color-neutral-700);
      --button-secondary-disabled-text: var(--text-tertiary);
      --button-secondary-disabled-border: var(--border-neutral-faint);
      --button-secondary-disabled-border-width: var(--border-width-1);
      --button-secondary-disabled-radius: var(--radius-md);
      --button-secondary-disabled-padding: var(--space-8);
      --button-secondary-icon-size: var(--icon-size-sm);

      /* Outline */
      --button-outline-surface: var(--color-transparent);
      --button-outline-text: var(--text-primary);
      --button-outline-text-font-family: var(--font-sans);
      --button-outline-text-font-size: var(--font-size-sm);
      --button-outline-text-font-weight: var(--font-weight-light);
      --button-outline-text-line-height: var(--line-height-sm);
      --button-outline-border: var(--border-neutral);
      --button-outline-border-width: var(--border-width-1);
      --button-outline-radius: var(--radius-md);
      --button-outline-padding: var(--space-8);
      --button-outline-hover-surface: var(--surface-neutral-lower);
      --button-outline-hover-text: var(--text-primary);
      --button-outline-hover-border: var(--border-neutral-strong);
      --button-outline-hover-border-width: var(--border-width-1);
      --button-outline-hover-radius: var(--radius-md);
      --button-outline-hover-padding: var(--space-8);
      --button-outline-active-surface: var(--hover);
      --button-outline-disabled-surface: var(--color-transparent);
      --button-outline-disabled-text: var(--text-tertiary);
      --button-outline-disabled-border: var(--border-neutral-faint);
      --button-outline-disabled-border-width: var(--border-width-1);
      --button-outline-disabled-radius: var(--radius-md);
      --button-outline-disabled-padding: var(--space-8);
      --button-outline-icon-size: var(--icon-size-sm);

      /* Success */
      --button-success-surface: var(--surface-success-low);
      --button-success-text: var(--text-success);
      --button-success-text-font-family: var(--font-sans);
      --button-success-text-font-size: var(--font-size-sm);
      --button-success-text-font-weight: var(--font-weight-light);
      --button-success-text-line-height: var(--line-height-sm);
      --button-success-border: var(--border-success);
      --button-success-border-width: var(--border-width-2);
      --button-success-radius: var(--radius-md);
      --button-success-padding: var(--space-8);
      --button-success-hover-surface: var(--surface-success-higher);
      --button-success-hover-text: var(--text-primary);
      --button-success-hover-border: var(--border-success-strong);
      --button-success-hover-border-width: var(--border-width-2);
      --button-success-hover-radius: var(--radius-md);
      --button-success-hover-padding: var(--space-8);
      --button-success-disabled-surface: var(--color-neutral-700);
      --button-success-disabled-text: var(--text-tertiary);
      --button-success-disabled-border: var(--border-neutral-faint);
      --button-success-disabled-border-width: var(--border-width-2);
      --button-success-disabled-radius: var(--radius-md);
      --button-success-disabled-padding: var(--space-8);
      --button-success-icon-size: var(--icon-size-sm);

      /* Danger */
      --button-danger-surface: var(--surface-danger-low);
      --button-danger-text: var(--text-danger);
      --button-danger-text-font-family: var(--font-sans);
      --button-danger-text-font-size: var(--font-size-sm);
      --button-danger-text-font-weight: var(--font-weight-light);
      --button-danger-text-line-height: var(--line-height-sm);
      --button-danger-border: var(--border-danger);
      --button-danger-border-width: var(--border-width-2);
      --button-danger-radius: var(--radius-md);
      --button-danger-padding: var(--space-8);
      --button-danger-hover-surface: var(--surface-danger-high);
      --button-danger-hover-text: var(--text-primary);
      --button-danger-hover-border: var(--border-danger-medium);
      --button-danger-hover-border-width: var(--border-width-2);
      --button-danger-hover-radius: var(--radius-md);
      --button-danger-hover-padding: var(--space-8);
      --button-danger-disabled-surface: var(--color-neutral-700);
      --button-danger-disabled-text: var(--text-tertiary);
      --button-danger-disabled-border: var(--border-neutral-faint);
      --button-danger-disabled-border-width: var(--border-width-2);
      --button-danger-disabled-radius: var(--radius-md);
      --button-danger-disabled-padding: var(--space-8);
      --button-danger-icon-size: var(--icon-size-sm);

      /* Warning */
      --button-warning-surface: var(--surface-warning-low);
      --button-warning-text: var(--text-warning);
      --button-warning-text-font-family: var(--font-sans);
      --button-warning-text-font-size: var(--font-size-sm);
      --button-warning-text-font-weight: var(--font-weight-light);
      --button-warning-text-line-height: var(--line-height-sm);
      --button-warning-border: var(--border-warning);
      --button-warning-border-width: var(--border-width-2);
      --button-warning-radius: var(--radius-md);
      --button-warning-padding: var(--space-8);
      --button-warning-hover-surface: var(--surface-warning-high);
      --button-warning-hover-text: var(--text-primary);
      --button-warning-hover-border: var(--border-warning-medium);
      --button-warning-hover-border-width: var(--border-width-2);
      --button-warning-hover-radius: var(--radius-md);
      --button-warning-hover-padding: var(--space-8);
      --button-warning-disabled-surface: var(--color-neutral-700);
      --button-warning-disabled-text: var(--text-tertiary);
      --button-warning-disabled-border: var(--border-neutral-faint);
      --button-warning-disabled-border-width: var(--border-width-2);
      --button-warning-disabled-radius: var(--radius-md);
      --button-warning-disabled-padding: var(--space-8);
      --button-warning-icon-size: var(--icon-size-sm);
   }

   .button {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-8);
      transition: all var(--duration-150);
      position: relative;
      overflow: hidden;

      &.full-width {
         width: 100%;
         display: flex;
      }

      // Shimmer effect
      &::before {
         content: '';
         display: var(--button-shimmer, block);
         position: absolute;
         top: 0;
         left: -100%;
         width: 100%;
         height: 100%;
         transition: left 0.5s ease;
      }

      &:hover:not(:disabled)::before,
      &.force-hover:not(:disabled)::before {
         left: 100%;
      }

      &:hover:not(:disabled),
      &.force-hover:not(:disabled) {
         transform: translateY(-0.0625rem);
         box-shadow: var(--shadow-md);
      }

      &:active:not(:disabled) {
         transform: translateY(0);
      }

      &:disabled {
         cursor: not-allowed;

         &::before {
            display: none;
         }
      }

      // Primary variant (default)
      &.primary {
         --button-icon-size: var(--button-primary-icon-size);
         background: var(--button-primary-surface);
         color: var(--button-primary-text);
         border: var(--button-primary-border-width) solid var(--button-primary-border);
         border-radius: var(--button-primary-radius);
         @include themed-padding(--button-primary-padding, $h: 2);
         font-family: var(--button-primary-text-font-family);
         font-size: var(--button-primary-text-font-size);
         font-weight: var(--button-primary-text-font-weight);
         line-height: var(--button-primary-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-primary-hover-surface);
            border: var(--button-primary-hover-border-width) solid var(--button-primary-hover-border);
            border-radius: var(--button-primary-hover-radius);
            @include themed-padding(--button-primary-hover-padding, $h: 2);
            color: var(--button-primary-hover-text);
         }

         &:active:not(:disabled) {
            box-shadow: var(--shadow-sm);
         }

         &:disabled {
            background: var(--button-primary-disabled-surface);
            border: var(--button-primary-disabled-border-width) solid var(--button-primary-disabled-border);
            border-radius: var(--button-primary-disabled-radius);
            @include themed-padding(--button-primary-disabled-padding, $h: 2);
            color: var(--button-primary-disabled-text);
         }
      }

      // Secondary variant
      &.secondary {
         --button-icon-size: var(--button-secondary-icon-size);
         background: var(--button-secondary-surface);
         color: var(--button-secondary-text);
         border: var(--button-secondary-border-width) solid var(--button-secondary-border);
         border-radius: var(--button-secondary-radius);
         @include themed-padding(--button-secondary-padding, $h: 2);
         font-family: var(--button-secondary-text-font-family);
         font-size: var(--button-secondary-text-font-size);
         font-weight: var(--button-secondary-text-font-weight);
         line-height: var(--button-secondary-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.1),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-secondary-hover-surface);
            border: var(--button-secondary-hover-border-width) solid var(--button-secondary-hover-border);
            border-radius: var(--button-secondary-hover-radius);
            @include themed-padding(--button-secondary-hover-padding, $h: 2);
            color: var(--button-secondary-hover-text);
         }

         &:disabled {
            background: var(--button-secondary-disabled-surface);
            border: var(--button-secondary-disabled-border-width) solid var(--button-secondary-disabled-border);
            border-radius: var(--button-secondary-disabled-radius);
            @include themed-padding(--button-secondary-disabled-padding, $h: 2);
            color: var(--button-secondary-disabled-text);
         }
      }

      // Outline variant
      &.outline {
         --button-icon-size: var(--button-outline-icon-size);
         background: var(--button-outline-surface);
         color: var(--button-outline-text);
         border: var(--button-outline-border-width) solid var(--button-outline-border);
         border-radius: var(--button-outline-radius);
         @include themed-padding(--button-outline-padding, $h: 2);
         font-family: var(--button-outline-text-font-family);
         font-size: var(--button-outline-text-font-size);
         font-weight: var(--button-outline-text-font-weight);
         line-height: var(--button-outline-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.1),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-outline-hover-surface);
            border: var(--button-outline-hover-border-width) solid var(--button-outline-hover-border);
            border-radius: var(--button-outline-hover-radius);
            @include themed-padding(--button-outline-hover-padding, $h: 2);
            color: var(--button-outline-hover-text);
         }

         &:active:not(:disabled) {
            background: var(--button-outline-active-surface);
         }

         &:disabled {
            background: var(--button-outline-disabled-surface);
            border: var(--button-outline-disabled-border-width) solid var(--button-outline-disabled-border);
            border-radius: var(--button-outline-disabled-radius);
            @include themed-padding(--button-outline-disabled-padding, $h: 2);
            color: var(--button-outline-disabled-text);
         }
      }

      // Success variant
      &.success {
         --button-icon-size: var(--button-success-icon-size);
         background: var(--button-success-surface);
         border: var(--button-success-border-width) solid var(--button-success-border);
         border-radius: var(--button-success-radius);
         @include themed-padding(--button-success-padding, $h: 2);
         color: var(--button-success-text);
         font-family: var(--button-success-text-font-family);
         font-size: var(--button-success-text-font-size);
         font-weight: var(--button-success-text-font-weight);
         line-height: var(--button-success-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-success-hover-surface);
            border: var(--button-success-hover-border-width) solid var(--button-success-hover-border);
            border-radius: var(--button-success-hover-radius);
            @include themed-padding(--button-success-hover-padding, $h: 2);
            color: var(--button-success-hover-text);
         }

         &:disabled {
            background: var(--button-success-disabled-surface);
            border: var(--button-success-disabled-border-width) solid var(--button-success-disabled-border);
            border-radius: var(--button-success-disabled-radius);
            @include themed-padding(--button-success-disabled-padding, $h: 2);
            color: var(--button-success-disabled-text);
         }
      }

      // Danger variant
      &.danger {
         --button-icon-size: var(--button-danger-icon-size);
         background: var(--button-danger-surface);
         border: var(--button-danger-border-width) solid var(--button-danger-border);
         border-radius: var(--button-danger-radius);
         @include themed-padding(--button-danger-padding, $h: 2);
         color: var(--button-danger-text);
         font-family: var(--button-danger-text-font-family);
         font-size: var(--button-danger-text-font-size);
         font-weight: var(--button-danger-text-font-weight);
         line-height: var(--button-danger-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(0, 0, 0, 0.15),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-danger-hover-surface);
            border: var(--button-danger-hover-border-width) solid var(--button-danger-hover-border);
            border-radius: var(--button-danger-hover-radius);
            @include themed-padding(--button-danger-hover-padding, $h: 2);
            color: var(--button-danger-hover-text);
         }

         &:disabled {
            background: var(--button-danger-disabled-surface);
            border: var(--button-danger-disabled-border-width) solid var(--button-danger-disabled-border);
            border-radius: var(--button-danger-disabled-radius);
            @include themed-padding(--button-danger-disabled-padding, $h: 2);
            color: var(--button-danger-disabled-text);
         }
      }

      // Warning variant
      &.warning {
         --button-icon-size: var(--button-warning-icon-size);
         background: var(--button-warning-surface);
         border: var(--button-warning-border-width) solid var(--button-warning-border);
         border-radius: var(--button-warning-radius);
         @include themed-padding(--button-warning-padding, $h: 2);
         color: var(--button-warning-text);
         font-family: var(--button-warning-text-font-family);
         font-size: var(--button-warning-text-font-size);
         font-weight: var(--button-warning-text-font-weight);
         line-height: var(--button-warning-text-line-height);

         &::before {
            background: linear-gradient(90deg,
               transparent,
               rgba(255, 255, 255, 0.2),
               transparent);
         }

         &:hover:not(:disabled),
         &.force-hover:not(:disabled) {
            background: var(--button-warning-hover-surface);
            border: var(--button-warning-hover-border-width) solid var(--button-warning-hover-border);
            border-radius: var(--button-warning-hover-radius);
            @include themed-padding(--button-warning-hover-padding, $h: 2);
            color: var(--button-warning-hover-text);
         }

         &:disabled {
            background: var(--button-warning-disabled-surface);
            border: var(--button-warning-disabled-border-width) solid var(--button-warning-disabled-border);
            border-radius: var(--button-warning-disabled-radius);
            @include themed-padding(--button-warning-disabled-padding, $h: 2);
            color: var(--button-warning-disabled-text);
         }
      }

      // Small size modifier (applies to any variant).
      // Declared after variants so equal-specificity rules win on source order;
      // :hover/.force-hover/:disabled are listed so variant state-padding
      // doesn't clobber .small in those states.
      &.small,
      &.small:hover:not(:disabled),
      &.small.force-hover:not(:disabled),
      &.small:disabled {
         padding: var(--space-6) var(--space-12);
         font-size: var(--font-size-xs);
         font-weight: var(--font-weight-normal);
         line-height: var(--line-height-sm);
      }

      &.small :global(i) {
         font-size: var(--font-size-xs);
         font-weight: var(--font-weight-semibold);
      }

   :global(i) {
      font-size: var(--button-icon-size, var(--icon-size-sm));

      &.spinning {
         animation: spin 1s linear infinite;
      }
   }

   @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
   }

      // Support for slotted content with special styles
      :global(.badge), :global(.count), :global(.fame-count) {
         font-size: var(--font-size-sm);
         opacity: 0.9;
         padding: var(--space-2) var(--space-6);
         background: var(--overlay-low);
         border-radius: var(--radius-sm);
         margin-left: var(--space-4);
      }
   }
</style>
