<script lang="ts">
  import { onMount } from 'svelte';
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import { setCssVar } from '../../core/cssVarSync';

  type Mode = 'default' | 'image' | 'color';

  interface Props {
    mode?: Mode;
    /** Editor-scoped CSS var the picker writes to (must end with `-surface` to allow gradients). */
    colorVariable: string;
    /** Which modes to expose. Defaults to all three. */
    modes?: ReadonlyArray<Mode>;
  }

  let { mode = $bindable('default'), colorVariable, modes = ['default', 'image', 'color'] }: Props = $props();

  const ALL_OPTIONS: ReadonlyArray<{ value: Mode; label: string }> = [
    { value: 'default', label: 'Default' },
    { value: 'image', label: 'Image' },
    { value: 'color', label: 'Color' },
  ];
  let options = $derived(ALL_OPTIONS.filter((o) => modes.includes(o.value)));

  onMount(() => {
    if (!document.documentElement.style.getPropertyValue(colorVariable)) {
      setCssVar(colorVariable, 'var(--surface-canvas)');
    }
  });
</script>

<div class="backdrop-grid" role="radiogroup">
  {#each options as opt (opt.value)}
    <div
      class="backdrop-option"
      class:checked={mode === opt.value}
      role="radio"
      aria-checked={mode === opt.value}
      aria-label={opt.label}
      tabindex={mode === opt.value ? 0 : -1}
      onclick={() => (mode = opt.value)}
      onkeydown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          mode = opt.value;
        }
      }}
    >
      <span class="backdrop-dot" aria-hidden="true"></span>
      {#if opt.value !== 'color'}
        <span>{opt.label}</span>
      {:else}
        <div class="picker-slot">
          <UIPaletteSelector variable={colorVariable} />
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .backdrop-grid {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  /* Reserve room for the swatch's absolute-positioned token-name caption so it
     doesn't bleed onto whatever sits below the controls. */
  .backdrop-grid:has(.picker-slot) {
    padding-bottom: var(--ui-space-16);
  }

  /* Each row keeps the same vertical rhythm; the trigger's height defines
     the line, so the radio-only rows match it via min-height. The whole row
     is clickable via the onclick handler — selecting on any pointer hit. */
  .backdrop-option {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    min-height: 1.75rem;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
    cursor: pointer;
    user-select: none;
    transition: color var(--ui-transition-fast);
  }
  .backdrop-option.checked {
    color: var(--ui-text-primary);
  }
  .backdrop-option:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  /* Custom radio dot replaces native input so the entire row's onclick
     handler runs without label/input dual-activation quirks. */
  .backdrop-dot {
    flex-shrink: 0;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1.5px solid currentColor;
    background: transparent;
    opacity: 0.6;
    transition: opacity var(--ui-transition-fast), background var(--ui-transition-fast);
  }
  .backdrop-option.checked .backdrop-dot {
    opacity: 1;
    background:
      radial-gradient(circle, currentColor 0 35%, transparent 38%);
  }

  .picker-slot {
    position: relative;
    flex: 1;
    min-width: 0;
  }
  .picker-slot :global(.ui-token-selector) {
    width: 100%;
  }
  /* Hang the token name caption under the swatch trigger so it doesn't
     stretch the row's height. */
  .picker-slot :global(.ui-ts-meta-text) {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 2px;
    white-space: nowrap;
    pointer-events: none;
  }
</style>
