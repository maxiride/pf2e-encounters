/**
 * Shared parser for `:global(:root) { ... }` declaration blocks in Svelte
 * component sources.
 *
 * Both the browser-side `tokenRegistry` (Vite `?raw` import-time scrape) and
 * the Node-side `themeFileApi` plugin (filesystem read on dev/HMR) need to
 * recover Layer-2 component-token declarations from `.svelte` files. They had
 * been carrying separate copies of the same regex; this is the canonical
 * implementation that both targets import.
 *
 * Assumes no nested braces inside the block — Layer-2 token blocks are flat
 * declaration lists (`--name: value;`), not nested rulesets. If a future token
 * block ever needs `@media`/`@supports` nesting, this regex changes once here.
 *
 * Pure (no DOM, no fs) so the tsup ESM+CJS build of the vite plugin can import
 * it safely.
 *
 * Consumer-facing implication: components must keep their `:global(:root)`
 * blocks as flat literal declarations — no `@each` / SCSS loops — otherwise
 * this parser sees zero tokens and the editor's alias picker / file-manager
 * UI is empty for that component. See `src/components/Notification.svelte:86–92`
 * for the documented reason a four-variant block stays expanded.
 */
export function extractGlobalRootBody(source: string): string {
  const re = /:global\(:root\)\s*\{([^}]*)\}/g;
  const bodies: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    bodies.push(m[1]);
  }
  return bodies.join('\n');
}
