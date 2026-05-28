<script lang="ts">
  import { LiveTokensRouter } from '@motion-proto/live-tokens';
  import Home from './app/Home.svelte';
</script>

<LiveTokensRouter
  pages={{
    '/': { component: Home, label: 'Site', icon: 'fa-home', source: 'src/app/Home.svelte' },
  }}
/>
