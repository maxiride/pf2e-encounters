<script lang="ts">
  import Notification from '../../system/components/Notification.svelte';
  import { navigate } from '../../editor/core/routing/router';

  const isDev = import.meta.env.DEV;
</script>

<section class="cta">
  <Notification
    title="Ready when you are."
    description="Run npm run dev to start the editor. The overlay appears in the top-right corner."
    variant="info"
    emphasis
    icon="fas fa-rocket"
    actions={isDev ? {
      right: { label: 'Open Editor', icon: 'fas fa-arrow-right', onClick: () => navigate('/editor') },
      left:  { label: 'Browse Components', variant: 'secondary', onClick: () => navigate('/components') },
    } : {}}
  />
</section>

<style>
  .cta {
    grid-column: 2 / span 10;
  }

  @media (max-width: 960px) {
    .cta {
      grid-column: 1 / -1;
    }
  }
</style>
