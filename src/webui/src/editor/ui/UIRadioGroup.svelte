<script lang="ts">
  interface Props {
    value: string;
    options: ReadonlyArray<{ value: string; label: string }>;
    name: string;
    onchange?: (value: string) => void;
  }

  let { value = $bindable(), options, name, onchange }: Props = $props();

  function select(v: string) {
    if (v === value) return;
    value = v;
    onchange?.(v);
  }
</script>

<div class="ui-radio-group" role="radiogroup">
  {#each options as opt (opt.value)}
    <label class="ui-radio" class:checked={value === opt.value}>
      <input
        type="radio"
        {name}
        value={opt.value}
        checked={value === opt.value}
        onchange={() => select(opt.value)}
      />
      <span>{opt.label}</span>
    </label>
  {/each}
</div>

<style>
  .ui-radio-group {
    display: inline-flex;
    gap: var(--ui-space-20);
    align-items: center;
  }
  .ui-radio {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    cursor: pointer;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
    user-select: none;
    transition: color var(--ui-transition-fast);
  }
  .ui-radio.checked {
    color: var(--ui-text-primary);
  }
  .ui-radio input {
    margin: 0;
    cursor: pointer;
    accent-color: currentColor;
  }
  .ui-radio:not(.checked) input {
    opacity: 0.5;
  }
</style>
