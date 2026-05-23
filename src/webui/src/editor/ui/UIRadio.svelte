<!--
  Custom-styled radio that matches the editor's selection language: a quiet ring
  in the unselected state (--ui-border-higher stroke, soft black inner fill) and
  the highlight amber when selected (ring + dot, transparent inside).

  Usage:
    <UIRadio bind:group={selected} value="alpha" />
    <UIRadio bind:group={selected} value="beta" disabled />
-->
<script lang="ts">
  import { createBubbler } from 'svelte/legacy';

  const bubble = createBubbler();
  
  
  
  interface Props {
    /** Value this radio represents within its group. */
    value: string;
    /** Two-way bound group selection. The radio is checked when `group === value`. */
    group: string;
    /** Optional native name; omit to let Svelte's `bind:group` wire it automatically. */
    name?: string;
    disabled?: boolean;
  }

  let {
    value,
    group = $bindable(),
    name = '',
    disabled = false
  }: Props = $props();
</script>

<input
  type="radio"
  class="ui-radio"
  {value}
  {name}
  {disabled}
  bind:group
  onchange={bubble('change')}
/>

<style>
  .ui-radio {
    appearance: none;
    -webkit-appearance: none;
    margin: 0;
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    border: 1.5px solid var(--ui-border-higher);
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.3);
    cursor: pointer;
    display: grid;
    place-items: center;
    transition:
      border-color 140ms cubic-bezier(0.4, 0, 0.2, 1),
      background-color 140ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ui-radio::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ui-highlight);
    transform: scale(0);
    transition: transform 140ms cubic-bezier(0.5, 1.6, 0.5, 1);
  }
  .ui-radio:checked {
    border-color: var(--ui-highlight);
    background: transparent;
  }
  .ui-radio:checked::before {
    transform: scale(1);
  }
  .ui-radio:focus-visible {
    outline: 2px solid var(--ui-highlight);
    outline-offset: 1px;
  }
  .ui-radio:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
</style>
