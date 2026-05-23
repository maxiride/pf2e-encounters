/**
 * Fonts slice — sources + stacks. No derived CSS vars owned by this store
 * (the `--font-*` vars are written by `applyFontStacks` in fontLoader, and
 * @font-face rules by `applyFontSources`). We own the *data* (sources +
 * stacks); callers still invoke the DOM-side-effect helpers themselves
 * after mutating.
 */
import type { FontSource, FontStack } from '../themeTypes';
import { store, mutate, persist } from '../../store/editorCore';

export function setFontSources(sources: FontSource[]): void {
  mutate('update font sources', (s) => { s.fonts.sources = sources; });
}

export function setFontStacks(stacks: FontStack[]): void {
  mutate('update font stacks', (s) => { s.fonts.stacks = stacks; });
}

/**
 * Populate fonts from the server's active theme at boot. Does not push
 * a history entry — the boot load is a starting point, not an edit.
 */
export function seedFontsFromTheme(sources: FontSource[], stacks: FontStack[]): void {
  store.update((s) => {
    s.fonts.sources = structuredClone(sources);
    s.fonts.stacks = structuredClone(stacks);
    return s;
  });
  persist();
}
