import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { themeFileApi } from './vite-plugin';

export default defineConfig({
  plugins: [
    svelte({ preprocess: vitePreprocess() }),
    themeFileApi({
      themesDir: 'themes',
      tokensCssPath: 'src/live-tokens/system/styles/tokens.css',
      componentsSrcDir: 'src/live-tokens/system/components',
    }),
  ],
  // Force Svelte's browser-side exports under vitest (happy-dom). Without this,
  // `import { createEventDispatcher } from 'svelte'` resolves to the SSR build
  // where it is a no-op — and component event dispatch silently fails in tests.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
