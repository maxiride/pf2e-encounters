/**
 * DOM renderer for the editor store.
 *
 * Subscribes to the store and writes derived CSS variables to :root via
 * `cssVarSync` (which fans out to the parent document for the overlay
 * iframe). This module is where all DOM side effects live; everything
 * upstream of `deriveCssVars` is pure-data.
 *
 * Importing this module on the client triggers `store.subscribe(...)`. The
 * editorStore barrel re-exports from here so legacy `import '.../editorStore'`
 * paths still wire up the renderer at module load.
 */

import type { EditorState } from './editorTypes';
import { setCssVar, removeCssVar } from '../cssVarSync';
import { palettesToVars } from '../palettes/paletteDerivation';
import {
  editorState,
  columnsToVars,
  columnsEqualsDefault,
  overlaysToVars,
  overlaysEqualsDefault,
  shadowsToVars,
  gradientsToVars,
  componentsToVars,
} from './editorStore';

export function deriveCssVars(state: EditorState): Record<string, string> {
  const out: Record<string, string> = { ...state.cssVars };
  if (!columnsEqualsDefault(state.columns)) {
    Object.assign(out, columnsToVars(state.columns));
  }
  if (!overlaysEqualsDefault(state.overlays)) {
    Object.assign(out, overlaysToVars(state.overlays));
  }
  if (state.shadows.tokens.length > 0) {
    Object.assign(out, shadowsToVars(state.shadows));
  }
  if (state.gradients.tokens.length > 0) {
    Object.assign(out, gradientsToVars(state.gradients));
  }
  Object.assign(out, palettesToVars(state.palettes));
  Object.assign(out, componentsToVars(state.components));
  return out;
}

let lastApplied: Record<string, string> = {};
let installed = false;

/**
 * Install the DOM subscriber. Called once from `editorStore.ts` after its
 * exports are initialized — calling it earlier would TDZ-trip on `editorState`
 * because of the editorStore ↔ editorRenderer circular import.
 */
export function installRenderer(): void {
  if (installed) return;
  installed = true;
  if (typeof window === 'undefined') return;
  editorState.subscribe((state) => {
    const next = deriveCssVars(state);
    for (const name in next) {
      if (next[name] !== lastApplied[name]) setCssVar(name, next[name]);
    }
    for (const name in lastApplied) {
      if (!(name in next)) removeCssVar(name);
    }
    lastApplied = next;
  });
}

/** Test-only: clear the diff cache so independent test runs don't leak applied vars. */
export function __resetRendererCacheForTests(): void {
  lastApplied = {};
}
