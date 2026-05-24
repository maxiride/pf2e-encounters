<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Props {
    type?: 'text' | 'number' | 'search' | 'password';
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    /** Field label rendered above the input. */
    label?: string;
    /** Helper text below the input. Hidden when `error` is set. */
    hint?: string;
    /** Validation error message below the input. Switches the field into the invalid visual state. */
    error?: string;
    /** Editor preview: force the focused visual state without real focus. */
    forceFocus?: boolean;
    /** Native id forwarded to the input. Auto-derived from label/placeholder when omitted. */
    id?: string;
    class?: string;
    onchange?: (value: string) => void;
    oninput?: (value: string) => void;
  }

  let {
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    disabled = false,
    invalid = false,
    label = '',
    hint = '',
    error = '',
    forceFocus = false,
    id = undefined,
    class: className = '',
    onchange,
    oninput,
  }: Props = $props();

  const dispatch = createEventDispatcher<{ change: string; input: string }>();

  let revealed = $state(false);
  let inputRef: HTMLInputElement | undefined = $state(undefined);

  let effectiveType = $derived(type === 'password' && revealed ? 'text' : type);
  let isInvalid = $derived(invalid || error.length > 0);

  let autoId = `input-${Math.random().toString(36).slice(2, 10)}`;
  let resolvedId = $derived(id ?? autoId);

  function handleInput(e: Event) {
    const next = (e.target as HTMLInputElement).value;
    value = next;
    oninput?.(next);
    dispatch('input', next);
  }

  function handleChange(e: Event) {
    const next = (e.target as HTMLInputElement).value;
    onchange?.(next);
    dispatch('change', next);
  }

  function clearSearch() {
    value = '';
    oninput?.('');
    dispatch('input', '');
    inputRef?.focus();
  }
</script>

<div
  class="input-field {className}"
  class:disabled
  class:invalid={isInvalid}
  class:force-focus={forceFocus}
>
  {#if label}
    <label class="input-label" for={resolvedId}>{label}</label>
  {/if}

  <div class="input-shell">
    {#if type === 'search'}
      <i class="input-icon input-icon-leading fas fa-search" aria-hidden="true"></i>
    {/if}

    <input
      bind:this={inputRef}
      id={resolvedId}
      class="input-control"
      class:has-leading-icon={type === 'search'}
      class:has-trailing-icon={type === 'password' || (type === 'search' && value.length > 0)}
      type={effectiveType}
      {value}
      {placeholder}
      {disabled}
      aria-invalid={isInvalid || undefined}
      aria-describedby={[hint && `${resolvedId}-hint`, error && `${resolvedId}-error`].filter(Boolean).join(' ') || undefined}
      oninput={handleInput}
      onchange={handleChange}
    />

    {#if type === 'password'}
      <button
        type="button"
        class="input-icon-button"
        aria-label={revealed ? 'Hide password' : 'Show password'}
        aria-pressed={revealed}
        {disabled}
        onclick={() => (revealed = !revealed)}
      >
        <i class="input-icon fas {revealed ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>
      </button>
    {:else if type === 'search' && value.length > 0}
      <button
        type="button"
        class="input-icon-button"
        aria-label="Clear search"
        {disabled}
        onclick={clearSearch}
      >
        <i class="input-icon fas fa-times" aria-hidden="true"></i>
      </button>
    {/if}
  </div>

  {#if hint}
    <p id="{resolvedId}-hint" class="input-hint">{hint}</p>
  {/if}
  {#if error}
    <p id="{resolvedId}-error" class="input-error" role="alert">
      <i class="input-error-icon fas fa-exclamation-triangle" aria-hidden="true"></i>
      <span>{error}</span>
    </p>
  {/if}
</div>

<style lang="scss">
  @use '../styles/padding' as *;

  :global(:root) {
    /* Shape (shared across states) */
    --input-radius: var(--radius-md);
    --input-padding: var(--space-8);
    --input-border-width: var(--border-width-1);
    --input-gap: var(--space-6);

    /* Default */
    --input-default-surface: var(--surface-neutral-lower);
    --input-default-border: var(--border-neutral);
    --input-default-text: var(--text-primary);
    --input-default-text-font-family: var(--font-sans);
    --input-default-text-font-size: var(--font-size-sm);
    --input-default-text-font-weight: var(--font-weight-normal);
    --input-default-text-line-height: var(--line-height-sm);
    --input-default-icon: var(--text-tertiary);
    --input-default-icon-size: var(--icon-size-sm);
    --input-default-placeholder: var(--text-tertiary);

    /* Focused — applied as a CSS outline so the layout doesn't shift on focus */
    --input-focused-surface: var(--surface-neutral-lower);
    --input-focused-outline: var(--border-brand);
    --input-focused-outline-width: var(--border-width-2);
    --input-focused-text: var(--text-primary);
    --input-focused-text-font-family: var(--font-sans);
    --input-focused-text-font-size: var(--font-size-sm);
    --input-focused-text-font-weight: var(--font-weight-normal);
    --input-focused-text-line-height: var(--line-height-sm);
    --input-focused-icon: var(--text-secondary);
    --input-focused-icon-size: var(--icon-size-sm);

    /* Disabled */
    --input-disabled-surface: var(--surface-neutral);
    --input-disabled-border: var(--border-neutral-faint);
    --input-disabled-text: var(--text-tertiary);
    --input-disabled-text-font-family: var(--font-sans);
    --input-disabled-text-font-size: var(--font-size-sm);
    --input-disabled-text-font-weight: var(--font-weight-normal);
    --input-disabled-text-line-height: var(--line-height-sm);
    --input-disabled-icon: var(--text-tertiary);
    --input-disabled-icon-size: var(--icon-size-sm);

    /* Label */
    --input-label: var(--text-secondary);
    --input-label-font-family: var(--font-sans);
    --input-label-font-size: var(--font-size-sm);
    --input-label-font-weight: var(--font-weight-semibold);
    --input-label-line-height: var(--line-height-sm);

    /* Hint */
    --input-hint: var(--text-tertiary);
    --input-hint-font-family: var(--font-sans);
    --input-hint-font-size: var(--font-size-xs);
    --input-hint-font-weight: var(--font-weight-normal);
    --input-hint-line-height: var(--line-height-sm);

    /* Error — outline mirrors the focused state so width changes don't reflow the field */
    --input-error-outline: var(--border-danger);
    --input-error-outline-width: var(--border-width-2);
    --input-error: var(--text-danger);
    --input-error-font-family: var(--font-sans);
    --input-error-font-size: var(--font-size-xs);
    --input-error-font-weight: var(--font-weight-medium);
    --input-error-line-height: var(--line-height-sm);
  }

  .input-field {
    display: flex;
    flex-direction: column;
    gap: var(--input-gap);
    width: 100%;
  }

  .input-label {
    color: var(--input-label);
    font-family: var(--input-label-font-family);
    font-size: var(--input-label-font-size);
    font-weight: var(--input-label-font-weight);
    line-height: var(--input-label-line-height);
  }

  .input-shell {
    position: relative;
    display: flex;
    align-items: stretch;
  }

  .input-control {
    flex: 1 1 auto;
    width: 100%;
    background: var(--input-default-surface);
    border: var(--input-border-width) solid var(--input-default-border);
    border-radius: var(--input-radius);
    color: var(--input-default-text);
    font-family: var(--input-default-text-font-family);
    font-size: var(--input-default-text-font-size);
    font-weight: var(--input-default-text-font-weight);
    line-height: var(--input-default-text-line-height);
    @include themed-padding(--input-padding, $h: 1.25);
    transition: outline-color var(--duration-150), background var(--duration-150), color var(--duration-150);
    outline: 0 solid transparent;
    outline-offset: 0;
    appearance: none;
    -webkit-appearance: none;

    &::placeholder {
      color: var(--input-default-placeholder);
      opacity: 1;
    }

    &.has-leading-icon {
      padding-left: calc(var(--input-padding) + var(--input-default-icon-size) + var(--space-12));
    }

    &.has-trailing-icon {
      padding-right: calc(var(--input-padding) + var(--input-default-icon-size) + var(--space-12));
    }

    &:focus,
    .input-field.force-focus & {
      background: var(--input-focused-surface);
      outline: var(--input-focused-outline-width) solid var(--input-focused-outline);
      color: var(--input-focused-text);
      font-family: var(--input-focused-text-font-family);
      font-size: var(--input-focused-text-font-size);
      font-weight: var(--input-focused-text-font-weight);
      line-height: var(--input-focused-text-line-height);
    }

    &:disabled,
    .input-field.disabled & {
      background: var(--input-disabled-surface);
      border-color: var(--input-disabled-border);
      color: var(--input-disabled-text);
      font-family: var(--input-disabled-text-font-family);
      font-size: var(--input-disabled-text-font-size);
      font-weight: var(--input-disabled-text-font-weight);
      line-height: var(--input-disabled-text-line-height);
      cursor: not-allowed;
    }
  }

  /* Error outline overrides the focus outline so red wins when both apply. */
  .input-field.invalid .input-control,
  .input-field.invalid .input-control:focus,
  .input-field.invalid.force-focus .input-control {
    outline: var(--input-error-outline-width) solid var(--input-error-outline);
  }

  .input-icon {
    color: var(--input-default-icon);
    font-size: var(--input-default-icon-size);
    line-height: 1;
    transition: color var(--duration-150), font-size var(--duration-150);
  }

  .input-icon-leading {
    position: absolute;
    left: calc(var(--input-padding) + var(--space-2));
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .input-icon-button {
    position: absolute;
    right: calc(var(--input-padding) - var(--space-2));
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 0;
    padding: var(--space-4);
    border-radius: var(--radius-sm);
    cursor: pointer;

    &:hover:not(:disabled) .input-icon {
      color: var(--input-focused-icon);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .input-shell:focus-within .input-icon,
  .input-field.force-focus .input-icon {
    color: var(--input-focused-icon);
    font-size: var(--input-focused-icon-size);
  }

  .input-field.disabled .input-icon {
    color: var(--input-disabled-icon);
    font-size: var(--input-disabled-icon-size);
  }

  .input-hint {
    margin: 0;
    color: var(--input-hint);
    font-family: var(--input-hint-font-family);
    font-size: var(--input-hint-font-size);
    font-weight: var(--input-hint-font-weight);
    line-height: var(--input-hint-line-height);
  }

  .input-error {
    margin: 0;
    display: flex;
    align-items: flex-start;
    gap: var(--space-6);
    color: var(--input-error);
    font-family: var(--input-error-font-family);
    font-size: var(--input-error-font-size);
    font-weight: var(--input-error-font-weight);
    line-height: var(--input-error-line-height);
  }

  /* Icon inherits .input-error's color so it always matches the error text. */
  .input-error-icon {
    flex: 0 0 auto;
    font-size: 1em;
    line-height: inherit;
  }

  /* Hide the native number spinner — themable spinners are a future enhancement. */
  .input-control[type='number']::-webkit-outer-spin-button,
  .input-control[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .input-control[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  /* Suppress the native search clear; we render our own affordance. */
  .input-control[type='search']::-webkit-search-decoration,
  .input-control[type='search']::-webkit-search-cancel-button,
  .input-control[type='search']::-webkit-search-results-button,
  .input-control[type='search']::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }
</style>
