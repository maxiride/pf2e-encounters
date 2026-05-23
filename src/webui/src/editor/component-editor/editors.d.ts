// Augment the global `*.svelte` ambient module to expose the named
// `allTokens` export that each `<Name>Editor.svelte` declares in its
// `<script module>` block. The default ambient (shipped via
// node_modules/svelte/types/index.d.ts) declares only a default export,
// so without this augmentation tsc fails on the named imports in
// registry.ts.

declare module '*.svelte' {
  export const allTokens: import('./scaffolding/types').Token[];
}
