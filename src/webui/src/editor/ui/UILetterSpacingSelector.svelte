<script lang="ts">
  import UIVariantSelector from './UIVariantSelector.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  interface Props {
    variable: string;
    component?: string | undefined;
    canBeLinked?: boolean;
    disabled?: boolean;
    selectionsLocked?: boolean;
    onchange?: () => void;
  }

  let {
    variable,
    component = undefined,
    canBeLinked = false,
    disabled = false,
    selectionsLocked = false,
    onchange,
  }: Props = $props();

  const options = [
    { key: 'tighter', label: 'Tighter', value: '-0.04em' },
    { key: 'tight', label: 'Tight', value: '-0.02em' },
    { key: 'normal', label: 'Normal', value: '0' },
    { key: 'wide', label: 'Wide', value: '0.04em' },
    { key: 'wider', label: 'Wider', value: '0.08em' },
  ] as const;
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  varPrefix="--letter-spacing-"
  {options}
  {onchange}
>
  {#snippet option({ opt, active, select })}
    <UIOptionItem {active} onclick={select}>
      {#snippet preview()}
        <span class="ls-sample" style="letter-spacing: var(--letter-spacing-{opt.key});">AV</span>
      {/snippet}
      {#snippet label()}
        {opt.label}
      {/snippet}
      {#snippet meta()}
        {opt.value}
      {/snippet}
    </UIOptionItem>
  {/snippet}
</UIVariantSelector>

<style>
  .ls-sample {
    display: inline-block;
    width: 1.75rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
  }
</style>
