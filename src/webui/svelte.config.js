import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Keeps `new Component({ target, props })` working under Svelte 5.
    // Removed in Step 3 once components migrate to runes.
    compatibility: { componentApi: 4 },
  },
}
