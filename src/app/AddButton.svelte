<script lang="ts">
  import IconAction from './IconAction.svelte';

  interface Props {
    onclick?: (e: MouseEvent) => void;
    title?: string;
    decorative?: boolean;
  }

  let { onclick, title, decorative = false }: Props = $props();
</script>

<IconAction icon="+" tone="green" {onclick} {title} {decorative} />
