import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';

export default defineConfig({
  plugins: [
    svelte({ preprocess: vitePreprocess() }),
    themeFileApi({
      tokensCssPath: 'node_modules/@motion-proto/live-tokens/src/system/styles/tokens.css',
      dataDir: 'live-tokens-data',
      componentsSrcDir: 'src/components',
    }),
  ],
  // Force Svelte's browser-side exports under vitest (happy-dom). Without this,
  // `import { createEventDispatcher } from 'svelte'` resolves to the SSR build
  // where it is a no-op and component event dispatch silently fails in tests.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
