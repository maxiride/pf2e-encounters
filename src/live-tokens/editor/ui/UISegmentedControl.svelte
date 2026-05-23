<script lang="ts" generics="V extends string">
  interface Option {
    value: V;
    label: string;
    icon?: string;
    title?: string;
  }

  interface Props {
    value: V;
    options: ReadonlyArray<Option>;
    /** Native radio group name. Auto-generated per instance if omitted. */
    name?: string;
    ariaLabel?: string;
    onchange?: (value: V) => void;
  }

  let { value = $bindable(), options, name, ariaLabel, onchange }: Props = $props();

  // Stable per-instance fallback so internal radios group correctly when no
  // `name` is passed. Not reactive: the group identity shouldn't change.
  const fallbackName = `ui-seg-${Math.random().toString(36).slice(2, 9)}`;
  let groupName = $derived(name ?? fallbackName);

  function select(v: V) {
    if (v === value) return;
    value = v;
    onchange?.(v);
  }
</script>

<div class="ui-seg" role="radiogroup" aria-label={ariaLabel}>
  {#each options as opt (opt.value)}
    <label
      class="ui-seg-item"
      class:active={value === opt.value}
      title={opt.title}
    >
      <input
        type="radio"
        name={groupName}
        value={opt.value}
        checked={value === opt.value}
        onchange={() => select(opt.value)}
      />
      {#if opt.icon}<i class="fas {opt.icon}" aria-hidden="true"></i>{/if}
      <span>{opt.label}</span>
    </label>
  {/each}
</div>

<style>
  .ui-seg {
    display: inline-flex;
    align-self: flex-start;
    align-items: stretch;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: var(--ui-radius-xl, 8px);
    overflow: hidden;
  }

  .ui-seg-item {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6, 6px);
    padding: var(--ui-space-4, 4px) var(--ui-space-12, 12px);
    color: var(--ui-text-secondary, rgba(255, 255, 255, 0.65));
    font-family: inherit;
    font-size: var(--ui-font-size-sm, 14px);
    font-weight: var(--ui-font-weight-medium, 500);
    line-height: 1.5;
    cursor: pointer;
    user-select: none;
    transition:
      background var(--ui-transition-fast, 120ms ease),
      color var(--ui-transition-fast, 120ms ease);
  }

  .ui-seg-item + .ui-seg-item {
    border-left: 1px solid rgba(255, 255, 255, 0.18);
  }

  .ui-seg-item input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 1px;
    height: 1px;
    margin: 0;
  }

  .ui-seg-item:hover:not(.active) {
    background: rgba(255, 255, 255, 0.06);
    color: var(--ui-text-primary, #fff);
  }

  .ui-seg-item.active {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.25) 100%);
    color: var(--ui-text-primary, #fff);
  }

  .ui-seg-item:has(input:focus-visible) {
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.55);
  }

  .ui-seg-item i {
    font-size: var(--ui-font-size-xs, 12px);
    color: rgba(255, 255, 255, 0.65);
  }
  .ui-seg-item.active i {
    color: rgba(255, 255, 255, 0.85);
  }
</style>
