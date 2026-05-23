<script lang="ts">
  import ComponentFileManager from './ComponentFileManager.svelte';

  interface Props {
    component: string;
    title: string;
    description?: string;
    resetVariables?: string[] | null;
  }

  let {
    component,
    title,
    description = '',
    resetVariables = null
  }: Props = $props();
</script>

<ComponentFileManager {component} {title} {resetVariables} />

{#if description}
  <p class="demo-description">{@html description}</p>
{/if}

<style>
  .demo-description {
    margin: 0;
    color: var(--ui-text-secondary);
  }
</style>
