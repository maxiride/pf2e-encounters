import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Aliases mirror the ones Quasar generates in .quasar/tsconfig.json —
// only the ones actually imported by code under test are listed.
export default defineConfig({
  resolve: {
    alias: {
      src: fileURLToPath(new URL('./src', import.meta.url)),
      stores: fileURLToPath(new URL('./src/stores', import.meta.url)),
      components: fileURLToPath(new URL('./src/components', import.meta.url)),
    },
  },
  test: {
    // the encounter store registers window/document listeners at setup,
    // so tests need a DOM even when they only exercise pure logic
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts'],
  },
});
