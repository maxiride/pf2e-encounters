<script lang="ts">
  interface Props {
    src: string;
    alt: string;
    variant?: 'default' | 'banner' | 'medium' | 'compact';
    height?: string | undefined;
  }

  let {
    src,
    alt,
    variant = 'default',
    height = undefined
  }: Props = $props();

  const variantHeights: Record<string, string | undefined> = {
    default: undefined,
    banner: '360px',
    medium: '240px',
    compact: '180px',
  };

  let resolvedHeight = $derived(height ?? variantHeights[variant]);
</script>

<div class="image" style:height={resolvedHeight}>
  <img {src} {alt} />
</div>

<style>
  :global(:root) {
    --image-default-radius: var(--radius-xl);
    --image-default-border: var(--border-neutral);
    --image-default-border-width: var(--border-width-1);
    --image-default-shadow: var(--shadow-md);
  }

  .image {
    border-radius: var(--image-default-radius);
    overflow: hidden;
    border: var(--image-default-border-width) solid var(--image-default-border);
    box-shadow: var(--image-default-shadow);
  }

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center;
  }
</style>
