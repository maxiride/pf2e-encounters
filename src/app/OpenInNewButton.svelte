<script lang="ts">
  import IconAction from './IconAction.svelte';

  interface Props {
    onclick?: (e: MouseEvent) => void;
    title?: string;
  }

  let { onclick, title }: Props = $props();
</script>

<IconAction icon="↗" tone="gray" {onclick} {title} />
