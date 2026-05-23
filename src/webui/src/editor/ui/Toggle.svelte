<script lang="ts">
  interface Props {
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    onchange?: (checked: boolean) => void;
  }

  let { checked = $bindable(false), disabled = false, label = '', onchange }: Props = $props();

  function toggle() {
    if (disabled) return;
    checked = !checked;
    onchange?.(checked);
  }
</script>

<label class="toggle" class:disabled>
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label || 'Toggle'}
    {disabled}
    class="toggle-track"
    class:on={checked}
    onclick={toggle}
  >
    <span class="toggle-thumb"></span>
  </button>
  {#if label}
    <span class="toggle-label">{label}</span>
  {/if}
</label>

<style lang="scss">
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-8);
    cursor: pointer;
    user-select: none;

    &.disabled {
      cursor: not-allowed;

      .toggle-track {
        background: var(--surface-neutral-lower);
        border-color: var(--border-neutral-faint);
      }

      .toggle-thumb {
        background: var(--text-disabled);
      }

      .toggle-label {
        color: var(--text-disabled);
      }
    }
  }

  .toggle-track {
    position: relative;
    width: 2.25rem;
    height: var(--space-20);
    border-radius: var(--radius-2xl);
    border: var(--border-width-1) solid var(--border-neutral);
    background: var(--surface-neutral-low);
    padding: 0;
    cursor: inherit;
    transition: background var(--duration-150), border-color var(--duration-150);
    flex-shrink: 0;

    &.on {
      background: var(--ui-toggle);
      border-color: var(--ui-toggle);
    }

    &:hover:not(:disabled) {
      border-color: var(--border-neutral-medium);
    }

    &:focus-visible {
      outline: var(--border-width-2) solid var(--border-brand);
      outline-offset: var(--space-2);
    }
  }

  .toggle-thumb {
    position: absolute;
    top: var(--space-2);
    left: var(--space-2);
    width: 0.875rem;
    height: 0.875rem;
    border-radius: var(--radius-full);
    background: var(--text-secondary);
    transition: transform var(--duration-150), background var(--duration-150);

    .on & {
      transform: translateX(var(--space-16));
      background: var(--text-primary);
    }
  }

  .toggle-label {
    font-size: var(--font-size-md);
    color: var(--text-secondary);
    line-height: 1;
  }
</style>
