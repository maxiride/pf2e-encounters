<script lang="ts">
  // Wrapper used by publicSurface.test.ts to exercise default slot rendering.
  // Slot semantics are the most likely contract to drift Svelte 4 → 5
  // (slots are replaced by snippets). This fixture pins the consumer-facing
  // contract: "passing children renders them inside the component."
  import Button from '../../Button.svelte';
  import Card from '../../Card.svelte';
  import Callout from '../../Callout.svelte';

  interface Props {
    which: 'button' | 'card' | 'callout';
    text: string;
  }

  let { which, text }: Props = $props();
</script>

{#if which === 'button'}
  <Button>{text}</Button>
{:else if which === 'card'}
  <Card title="probe">{text}</Card>
{:else}
  <Callout label="probe">{text}</Callout>
{/if}
