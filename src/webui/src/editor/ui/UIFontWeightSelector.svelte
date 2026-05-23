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
    { key: 'thin', label: 'Thin', value: '100' },
    { key: 'extralight', label: 'Extra Light', value: '200' },
    { key: 'light', label: 'Light', value: '300' },
    { key: 'normal', label: 'Normal', value: '400' },
    { key: 'medium', label: 'Medium', value: '500' },
    { key: 'semibold', label: 'Semibold', value: '600' },
    { key: 'bold', label: 'Bold', value: '700' },
    { key: 'extrabold', label: 'Extra Bold', value: '800' },
    { key: 'black', label: 'Black', value: '900' },
  ] as const;
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  varPrefix="--font-weight-"
  {options}
  {onchange}
>
  {#snippet option({ opt, active, select })}
  
      <UIOptionItem {active} onclick={select}>
        {#snippet preview()}
            <span  class="weight-sample" style="font-weight: var(--font-weight-{opt.key});">A</span>
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
  .weight-sample {
    display: inline-block;
    width: 1.5rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
    line-height: 1;
  }
</style>
