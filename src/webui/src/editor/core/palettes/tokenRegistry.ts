/**
 * Static registry of CSS custom-property declarations.
 *
 * Layer-1 design tokens live in tokens.css (the single source of truth for
 * shared primitives). Layer-2 component tokens live inside each component's
 * `<style>` block as `:global(:root) { ... }` declarations — owned by the
 * component that uses them.
 *
 * Token-picking UIs need to recover the semantic identity of an arbitrary
 * variable — e.g. to display "info text / primary" rather than a raw hex. For
 * alias variables we must follow the `var(--x)` chain from the declaration to
 * find the underlying token whose *name* the selector can parse.
 *
 * This module parses both sources at import time (tokens.css via Vite's
 * ?raw loader, component files via import.meta.glob) and exposes helpers that
 * walk those aliases. The pure `buildTokenRegistry` and `extractGlobalRootBody`
 * helpers are also exported so tests can construct a registry from fs-loaded
 * files (Vitest's default CSS plugin swallows `?raw` imports for .css files).
 */

import { derived, type Readable } from 'svelte/store';
import tokensCss from '../../../system/styles/tokens.css?raw';
import { editorState } from '../store/editorStore';
import type { EditorState } from '../store/editorTypes';
import { extractGlobalRootBody } from '../themes/parsers/globalRootBlock';
import { formatGradientValue } from '../themes/slices/gradients';

// Re-exported for tests and downstream consumers that previously imported it
// from this module. The canonical implementation lives in `./parsers/globalRootBlock`
// so the dev-server vite plugin can share it.
export { extractGlobalRootBody };

const componentSources = import.meta.glob('../../../system/components/*.svelte', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface TokenRegistry {
  getDeclaredValue(varName: string): string | null;
  resolveAliasChain(varName: string): string[];
}

/**
 * Pure constructor: parses a CSS source string (possibly concatenated from
 * multiple files) and returns a registry bound to that snapshot.
 */
export function buildTokenRegistry(cssText: string): TokenRegistry {
  const declarations = new Map<string, string>();
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cssText)) !== null) {
    declarations.set(m[1], m[2].trim());
  }

  function resolveAliasChain(varName: string): string[] {
    const chain = [varName];
    const visited = new Set<string>([varName]);
    let current = varName;
    while (true) {
      const decl = declarations.get(current);
      if (!decl) return chain;
      const aliasMatch = decl.match(/var\((--[a-z0-9-]+)\)/i);
      if (!aliasMatch) return chain;
      const next = aliasMatch[1];
      if (visited.has(next)) return chain;
      visited.add(next);
      chain.push(next);
      current = next;
    }
  }

  return {
    getDeclaredValue: (v) => declarations.get(v) ?? null,
    resolveAliasChain,
  };
}

const componentTokenCss = Object.values(componentSources)
  .map(extractGlobalRootBody)
  .join('\n');

const defaultRegistry = buildTokenRegistry(tokensCss + '\n' + componentTokenCss);

/** Raw declared value from tokens.css, or null if not declared. */
export const getDeclaredValue = defaultRegistry.getDeclaredValue;

/**
 * Walk the alias chain starting at `varName`, returning each successive
 * variable reference (including the starting one). Stops when a declaration is
 * a literal value (e.g. hex) or when the next link is absent from the
 * registry. Guards against cycles.
 *
 * Example: `--notification-info-title` → `--text-info` → stops (literal hex).
 * Returns `['--notification-info-title', '--text-info']`.
 *
 * This is a static snapshot: it only sees declarations from tokens.css + the
 * baked-in `:global(:root)` blocks at module load. For state-aware resolution
 * that includes live component-alias edits, subscribe to `tokenRegistry$`.
 */
export const resolveAliasChain = defaultRegistry.resolveAliasChain;

/**
 * Build a registry that layers live component-alias overrides on top of the
 * static base. Cheap enough to rebuild per editorState tick — components
 * count is small and the alias walk is lazy.
 */
function buildOverlayRegistry(
  base: TokenRegistry,
  components: EditorState['components'],
): TokenRegistry {
  const overrides = new Map<string, string>();
  for (const slice of Object.values(components)) {
    for (const [varName, ref] of Object.entries(slice.aliases)) {
      if (ref.kind === 'token') overrides.set(varName, `var(${ref.name})`);
      else if (ref.kind === 'literal') overrides.set(varName, ref.value);
      else overrides.set(varName, formatGradientValue(ref.value));
    }
  }
  const getDeclared = (v: string): string | null =>
    overrides.has(v) ? overrides.get(v)! : base.getDeclaredValue(v);
  return {
    getDeclaredValue: getDeclared,
    resolveAliasChain(varName: string): string[] {
      const chain = [varName];
      const visited = new Set<string>([varName]);
      let current = varName;
      while (true) {
        const decl = getDeclared(current);
        if (!decl) return chain;
        const aliasMatch = decl.match(/var\((--[a-z0-9-]+)\)/i);
        if (!aliasMatch) return chain;
        const next = aliasMatch[1];
        if (visited.has(next)) return chain;
        visited.add(next);
        chain.push(next);
        current = next;
      }
    },
  };
}

/**
 * State-aware token registry: overlays live `state.components[*].aliases`
 * on top of the static base registry. Consume with `$tokenRegistry$` in
 * Svelte components when the UI needs to reflect in-flight alias edits
 * (e.g. selectors displaying the currently-selected semantic token).
 */
export const tokenRegistry$: Readable<TokenRegistry> = derived(editorState, ($state) =>
  buildOverlayRegistry(defaultRegistry, $state.components),
);
