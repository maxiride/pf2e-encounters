import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['vite-plugin/index.ts'],
  outDir: 'dist-plugin',
  format: ['esm', 'cjs'],
  dts: true,
  external: ['vite'],
  platform: 'node',
  clean: true,
});
