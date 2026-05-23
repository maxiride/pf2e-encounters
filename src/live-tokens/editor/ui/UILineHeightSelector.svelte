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
    { key: 'xs', label: 'Extra Small', value: '1' },
    { key: 'sm', label: 'Small', value: '1.25' },
    { key: 'md', label: 'Medium', value: '1.5' },
    { key: 'lg', label: 'Large', value: '1.75' },
    { key: 'xl', label: 'Extra Large', value: '2' },
  ] as const;
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  varPrefix="--line-height-"
  {options}
  {onchange}
>
  {#snippet option({ opt, active, select })}
  
      <UIOptionItem {active} onclick={select}>
        {#snippet preview()}
            <span  class="lh-sample" style="line-height: var(--line-height-{opt.key});">≡</span>
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
  .lh-sample {
    display: inline-block;
    width: 1.5rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
  }
</style>
