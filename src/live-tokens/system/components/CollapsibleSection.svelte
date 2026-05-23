<script lang="ts">
   import { createEventDispatcher } from 'svelte';

   interface Props {
      label: string;
      expanded?: boolean;
      href?: string | undefined;
      active?: boolean;
      variant?: 'chromeless' | 'divider' | 'container';
      class?: string;
      /** Toggle callback. Preferred over `on:toggle` from 0.5.0 onward. */
      ontoggle?: () => void;
      summary?: import('svelte').Snippet;
      children?: import('svelte').Snippet;
   }

   let {
      label,
      expanded = false,
      href = undefined,
      active = false,
      variant = 'container',
      class: className = '',
      ontoggle,
      summary,
      children
   }: Props = $props();

   // Dual-fire bridge — see Button.svelte for the deprecation timeline.
   const dispatch = createEventDispatcher<{
      toggle: void;
   }>();

   function fireToggle() {
      ontoggle?.();
      dispatch('toggle');
   }

   function handleHeaderClick(e: MouseEvent) {
      if (href && active) {
         e.preventDefault();
         fireToggle();
      }
   }
</script>

<section class="es-root variant-{variant} {className}">
   {#if href}
      <a {href} class="section-header" class:expanded class:active onclick={handleHeaderClick}>
         <div class="section-toggle">
            <i class="fas fa-chevron-right toggle-icon"></i>
            <span class="section-label">{label}</span>
         </div>
         {@render summary?.()}
      </a>
   {:else}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
      <div class="section-header" class:expanded onclick={fireToggle}>
         <div class="section-toggle">
            <i class="fas fa-chevron-right toggle-icon"></i>
            <span class="section-label">{label}</span>
         </div>
         {@render summary?.()}
      </div>
   {/if}
   {#if expanded && children}
      <div class="section-content">
         {@render children?.()}
      </div>
   {/if}
</section>

<style lang="scss">
   @use '../styles/padding' as *;

   :global(:root) {
      /* Chromeless — default */
      --collapsiblesection-chromeless-default-surface: var(--color-transparent);
      --collapsiblesection-chromeless-default-padding: var(--space-4);
      --collapsiblesection-chromeless-default-label: var(--text-primary);
      --collapsiblesection-chromeless-default-label-font-family: var(--font-sans);
      --collapsiblesection-chromeless-default-label-font-size: var(--font-size-md);
      --collapsiblesection-chromeless-default-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-chromeless-default-label-line-height: var(--line-height-md);
      --collapsiblesection-chromeless-default-icon: var(--text-muted);
      --collapsiblesection-chromeless-default-icon-size: var(--icon-size-xs);
      /* Chromeless — hover */
      --collapsiblesection-chromeless-hover-surface: var(--color-transparent);
      --collapsiblesection-chromeless-hover-padding: var(--space-4);
      --collapsiblesection-chromeless-hover-label: var(--text-primary);
      --collapsiblesection-chromeless-hover-label-font-family: var(--font-sans);
      --collapsiblesection-chromeless-hover-label-font-size: var(--font-size-md);
      --collapsiblesection-chromeless-hover-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-chromeless-hover-label-line-height: var(--line-height-md);
      --collapsiblesection-chromeless-hover-icon: var(--text-primary);
      --collapsiblesection-chromeless-hover-icon-size: var(--icon-size-xs);
      /* Chromeless — active */
      --collapsiblesection-chromeless-active-surface: var(--color-transparent);
      --collapsiblesection-chromeless-active-padding: var(--space-4);
      --collapsiblesection-chromeless-active-label: var(--text-primary);
      --collapsiblesection-chromeless-active-label-font-family: var(--font-sans);
      --collapsiblesection-chromeless-active-label-font-size: var(--font-size-md);
      --collapsiblesection-chromeless-active-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-chromeless-active-label-line-height: var(--line-height-md);
      --collapsiblesection-chromeless-active-icon: var(--text-muted);
      --collapsiblesection-chromeless-active-icon-size: var(--icon-size-xs);
      /* Chromeless — expanded */
      --collapsiblesection-chromeless-expanded-padding: var(--space-4);

      /* Divider — default */
      --collapsiblesection-divider-default-surface: var(--color-transparent);
      --collapsiblesection-divider-default-border: var(--border-neutral-faint);
      --collapsiblesection-divider-default-border-width: var(--border-width-1);
      --collapsiblesection-divider-default-padding: var(--space-4);
      --collapsiblesection-divider-default-label: var(--text-primary);
      --collapsiblesection-divider-default-label-font-family: var(--font-sans);
      --collapsiblesection-divider-default-label-font-size: var(--font-size-md);
      --collapsiblesection-divider-default-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-divider-default-label-line-height: var(--line-height-md);
      --collapsiblesection-divider-default-icon: var(--text-muted);
      --collapsiblesection-divider-default-icon-size: var(--icon-size-xs);
      /* Divider — hover */
      --collapsiblesection-divider-hover-surface: var(--color-transparent);
      --collapsiblesection-divider-hover-border: var(--border-neutral);
      --collapsiblesection-divider-hover-border-width: var(--border-width-1);
      --collapsiblesection-divider-hover-padding: var(--space-4);
      --collapsiblesection-divider-hover-label: var(--text-primary);
      --collapsiblesection-divider-hover-label-font-family: var(--font-sans);
      --collapsiblesection-divider-hover-label-font-size: var(--font-size-md);
      --collapsiblesection-divider-hover-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-divider-hover-label-line-height: var(--line-height-md);
      --collapsiblesection-divider-hover-icon: var(--text-primary);
      --collapsiblesection-divider-hover-icon-size: var(--icon-size-xs);
      /* Divider — active */
      --collapsiblesection-divider-active-surface: var(--color-transparent);
      --collapsiblesection-divider-active-border: var(--color-brand-400);
      --collapsiblesection-divider-active-border-width: var(--border-width-1);
      --collapsiblesection-divider-active-padding: var(--space-4);
      --collapsiblesection-divider-active-label: var(--text-primary);
      --collapsiblesection-divider-active-label-font-family: var(--font-sans);
      --collapsiblesection-divider-active-label-font-size: var(--font-size-md);
      --collapsiblesection-divider-active-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-divider-active-label-line-height: var(--line-height-md);
      --collapsiblesection-divider-active-icon: var(--text-muted);
      --collapsiblesection-divider-active-icon-size: var(--icon-size-xs);
      /* Divider — expanded */
      --collapsiblesection-divider-expanded-padding: var(--space-4);

      /* Container — frame (always-on outer chrome) */
      --collapsiblesection-container-frame-border: var(--color-transparent);
      --collapsiblesection-container-frame-border-width: var(--border-width-3);
      --collapsiblesection-container-frame-radius: var(--radius-none);
      /* Container — default header strip */
      --collapsiblesection-container-default-surface: var(--surface-canvas);
      --collapsiblesection-container-default-padding: var(--space-4);
      --collapsiblesection-container-default-label: var(--text-primary);
      --collapsiblesection-container-default-label-font-family: var(--font-sans);
      --collapsiblesection-container-default-label-font-size: var(--font-size-md);
      --collapsiblesection-container-default-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-container-default-label-line-height: var(--line-height-md);
      --collapsiblesection-container-default-icon: var(--text-muted);
      --collapsiblesection-container-default-icon-size: var(--icon-size-xs);
      /* Container — hover header strip */
      --collapsiblesection-container-hover-surface: var(--surface-canvas);
      --collapsiblesection-container-hover-padding: var(--space-4);
      --collapsiblesection-container-hover-label: var(--text-primary);
      --collapsiblesection-container-hover-label-font-family: var(--font-sans);
      --collapsiblesection-container-hover-label-font-size: var(--font-size-md);
      --collapsiblesection-container-hover-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-container-hover-label-line-height: var(--line-height-md);
      --collapsiblesection-container-hover-icon: var(--text-muted);
      --collapsiblesection-container-hover-icon-size: var(--icon-size-xs);
      /* Container — active header strip */
      --collapsiblesection-container-active-surface: var(--surface-canvas-low);
      --collapsiblesection-container-active-padding: var(--space-4);
      --collapsiblesection-container-active-label: var(--text-primary);
      --collapsiblesection-container-active-label-font-family: var(--font-sans);
      --collapsiblesection-container-active-label-font-size: var(--font-size-md);
      --collapsiblesection-container-active-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-container-active-label-line-height: var(--line-height-md);
      --collapsiblesection-container-active-icon: var(--text-muted);
      --collapsiblesection-container-active-icon-size: var(--icon-size-xs);
      /* Container — expanded content area */
      --collapsiblesection-container-expanded-surface: var(--surface-canvas-low);
      --collapsiblesection-container-expanded-padding: var(--space-4);
   }

   .es-root {
      display: flex;
      flex-direction: column;
   }

   .section-header {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      transition: all var(--duration-150);

      &.expanded .toggle-icon {
         transform: rotate(90deg);
      }
   }

   .section-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-shrink: 0;
   }

   @mixin header-paint($variant, $state) {
      background: var(--collapsiblesection-#{$variant}-#{$state}-surface);
      @include themed-padding(--collapsiblesection-#{$variant}-#{$state}-padding, $h: 2);

      .section-label {
         color: var(--collapsiblesection-#{$variant}-#{$state}-label);
         font-family: var(--collapsiblesection-#{$variant}-#{$state}-label-font-family);
         font-size: var(--collapsiblesection-#{$variant}-#{$state}-label-font-size);
         font-weight: var(--collapsiblesection-#{$variant}-#{$state}-label-font-weight);
         line-height: var(--collapsiblesection-#{$variant}-#{$state}-label-line-height);
      }

      .toggle-icon {
         color: var(--collapsiblesection-#{$variant}-#{$state}-icon);
         font-size: var(--collapsiblesection-#{$variant}-#{$state}-icon-size);
         transition: transform var(--duration-150);
      }
   }

   @mixin divider-bottom($state) {
      border-bottom: var(--collapsiblesection-divider-#{$state}-border-width) solid var(--collapsiblesection-divider-#{$state}-border);
   }

   .es-root.variant-chromeless {
      > .section-header {
         @include header-paint(chromeless, default);
         &:hover { @include header-paint(chromeless, hover); }
         &.active { @include header-paint(chromeless, active); }
      }
      &.force-hover > .section-header { @include header-paint(chromeless, hover); }
      > .section-content {
         @include themed-padding(--collapsiblesection-chromeless-expanded-padding, $h: 2);
      }
   }

   .es-root.variant-divider {
      > .section-header {
         @include header-paint(divider, default);
         @include divider-bottom(default);
         &:hover {
            @include header-paint(divider, hover);
            @include divider-bottom(hover);
         }
         &.active {
            @include header-paint(divider, active);
            @include divider-bottom(active);
         }
      }
      &.force-hover > .section-header {
         @include header-paint(divider, hover);
         @include divider-bottom(hover);
      }
      > .section-content {
         @include themed-padding(--collapsiblesection-divider-expanded-padding, $h: 2);
      }
   }

   .es-root.variant-container {
      border: var(--collapsiblesection-container-frame-border-width) solid var(--collapsiblesection-container-frame-border);
      border-radius: var(--collapsiblesection-container-frame-radius);
      overflow: hidden;

      > .section-header {
         @include header-paint(container, default);
         &:hover { @include header-paint(container, hover); }
         &.active { @include header-paint(container, active); }
      }
      &.force-hover > .section-header { @include header-paint(container, hover); }
      > .section-content {
         background: var(--collapsiblesection-container-expanded-surface);
         @include themed-padding(--collapsiblesection-container-expanded-padding, $h: 2);
      }
   }

   .section-content {
      color: var(--text-secondary);
      font-size: var(--font-size-md);
      line-height: var(--line-height-md);
   }

   /* Slot content inherits the section's body typography so consumer-side
      global element rules (e.g. site.css `p { font-family: serif }`) don't
      override the collapsible's intended type styling. */
   .section-content :global(p),
   .section-content :global(ul),
   .section-content :global(ol),
   .section-content :global(li) {
      font: inherit;
      color: inherit;
   }

   .section-content :global(p) {
      margin: 0 0 var(--space-12);
   }

   .section-content :global(p:last-child) {
      margin-bottom: 0;
   }
</style>
