<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Props {
    active?: boolean;
    label: string;
    color?: string;
    class?: string;
    /** Click callback. Preferred over `on:click` from 0.5.0 onward. */
    onclick?: () => void;
  }

  let {
    active = false,
    label,
    color = '',
    class: className = '',
    onclick
  }: Props = $props();

  // Dual-fire bridge — see Button.svelte for the deprecation timeline.
  const dispatch = createEventDispatcher();

  function fireClick() {
    onclick?.();
    dispatch('click');
  }
</script>

<button
  class="radio-button {className}"
  class:active
  style={color ? `--radiobutton-color: ${color};` : ''}
  onclick={fireClick}
>
  <span class="radio-dot"></span>
  <span class="radio-label">{label}</span>
</button>

<style lang="scss">
  :global(:root) {
    /* Default */
    --radiobutton-default-dot-border-color: var(--border-neutral);
    --radiobutton-default-dot-border-width: var(--border-width-2);
    --radiobutton-default-dot-fill: var(--text-secondary);
    --radiobutton-default-dot-size: var(--dot-size-0);
    --radiobutton-default-label: var(--text-primary);
    --radiobutton-default-label-font-family: var(--font-sans);
    --radiobutton-default-label-font-size: var(--font-size-md);
    --radiobutton-default-label-font-weight: var(--font-weight-semibold);
    --radiobutton-default-label-line-height: var(--line-height-xs);

    /* Hover */
    --radiobutton-hover-dot-border-color: var(--border-neutral);
    --radiobutton-hover-dot-border-width: var(--border-width-2);
    --radiobutton-hover-dot-fill: var(--text-secondary);
    --radiobutton-hover-dot-size: var(--dot-size-50);
    --radiobutton-hover-label: var(--text-primary);
    --radiobutton-hover-label-font-family: var(--font-sans);
    --radiobutton-hover-label-font-size: var(--font-size-md);
    --radiobutton-hover-label-font-weight: var(--font-weight-semibold);
    --radiobutton-hover-label-line-height: var(--line-height-xs);

    /* Active */
    --radiobutton-active-dot-border-color: var(--border-neutral);
    --radiobutton-active-dot-border-width: var(--border-width-2);
    --radiobutton-active-dot-fill: var(--text-secondary);
    --radiobutton-active-dot-size: var(--dot-size-50);
    --radiobutton-active-label: var(--text-primary);
    --radiobutton-active-label-font-family: var(--font-sans);
    --radiobutton-active-label-font-size: var(--font-size-md);
    --radiobutton-active-label-font-weight: var(--font-weight-semibold);
    --radiobutton-active-label-line-height: var(--line-height-xs);
  }

  .radio-button {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-8);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all var(--duration-200);
    line-height: var(--line-height-xs);

    &:hover,
    &.force-hover {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--radiobutton-color) 12%, var(--surface-neutral-lowest)),
        var(--surface-neutral-lowest)
      );

      .radio-label {
        color: var(--radiobutton-hover-label);
        font-family: var(--radiobutton-hover-label-font-family);
        font-size: var(--radiobutton-hover-label-font-size);
        font-weight: var(--radiobutton-hover-label-font-weight);
        line-height: var(--radiobutton-hover-label-line-height);
      }

      .radio-dot {
        border: var(--radiobutton-hover-dot-border-width) solid var(--radiobutton-color, var(--radiobutton-hover-dot-border-color));

        &::after {
          width: var(--radiobutton-hover-dot-size);
          height: var(--radiobutton-hover-dot-size);
          background: var(--radiobutton-color, var(--radiobutton-hover-dot-fill));
          opacity: 1;
        }
      }
    }

    &.active {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--radiobutton-color) 15%, var(--surface-neutral-lowest)),
        color-mix(in srgb, var(--radiobutton-color) 5%, var(--surface-neutral-lowest))
      );

      .radio-label {
        color: var(--radiobutton-active-label);
        font-family: var(--radiobutton-active-label-font-family);
        font-size: var(--radiobutton-active-label-font-size);
        font-weight: var(--radiobutton-active-label-font-weight);
        line-height: var(--radiobutton-active-label-line-height);
      }

      .radio-dot {
        border: var(--radiobutton-active-dot-border-width) solid var(--radiobutton-color, var(--radiobutton-active-dot-border-color));

        &::after {
          width: var(--radiobutton-active-dot-size);
          height: var(--radiobutton-active-dot-size);
          background: var(--radiobutton-color, var(--radiobutton-active-dot-fill));
          opacity: 1;
        }
      }
    }
  }

  .radio-dot {
    position: relative;
    width: var(--space-12);
    height: var(--space-12);
    border-radius: var(--radius-full);
    border: var(--radiobutton-default-dot-border-width) solid var(--radiobutton-default-dot-border-color);
    flex-shrink: 0;
    transition: all var(--duration-200);

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: var(--radiobutton-default-dot-size);
      height: var(--radiobutton-default-dot-size);
      background: var(--radiobutton-color, var(--radiobutton-default-dot-fill));
      border-radius: var(--radius-full);
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity var(--duration-200);
    }
  }

  .radio-label {
    color: var(--radiobutton-default-label);
    font-family: var(--radiobutton-default-label-font-family);
    font-size: var(--radiobutton-default-label-font-size);
    font-weight: var(--radiobutton-default-label-font-weight);
    line-height: var(--radiobutton-default-label-line-height);
  }
</style>
