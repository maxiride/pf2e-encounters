<script module lang="ts">
  import type { Token } from './scaffolding/types';

  export const component = 'image';

  // Single object: image frame.
  const states: Record<string, Token[]> = {
    image: [
      { label: 'border color', groupKey: 'border', variable: '--image-default-border' },
      { label: 'border width', groupKey: 'width', variable: '--image-default-border-width' },
      { label: 'corner radius', groupKey: 'radius', variable: '--image-default-radius' },
      { label: 'image shadow', groupKey: 'shadow', variable: '--image-default-shadow' },
    ],
  };

  export const allTokens: Token[] = Object.values(states).flat();
</script>

<script lang="ts">
  import Image from '../../system/components/Image.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import demoImageUrl from '../../system/assets/offering.webp';
</script>

<ComponentEditorBase {component} title="Image" description="Framed image with rounded corners, border, and shadow." tokens={allTokens}>
  <VariantGroup name="image" title="Image" {states} {component}>
    <Image src={demoImageUrl} alt="Demo" variant="banner" />
  </VariantGroup>
</ComponentEditorBase>
