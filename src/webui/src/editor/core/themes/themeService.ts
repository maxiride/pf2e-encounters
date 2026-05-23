import { tick } from 'svelte';
import type { Theme, ThemeMeta } from './themeTypes';
import type { EditorState } from '../store/editorTypes';
import {
  versionedFileResource,
  sanitizeFileName as sanitizeFileNameImpl,
} from '../storage/files/versionedFileResourceClient';
import { loadFromFile as loadEditorState, toTheme, markSaved } from '../store/editorStore';
import { activeFileName } from '../store/editorConfigStore';
import { applyFontSources, applyFontStacks } from '../fonts/fontLoader';
import { migrateThemeFonts } from '../fonts/fontMigration';

// ── API helpers ──────────────────────────────────────────────
//
// All theme CRUD goes through `versionedFileResource('/api/themes')` —
// shared with `componentConfigService`'s per-component clients. Theme-specific
// response shapes (ThemeMeta list payload, ProductionInfo) are layered on top
// via the generic type parameters.

export interface ProductionInfo {
  fileName: string;
  name: string;
  updatedAt: string;
  cssVariables: Record<string, string>;
}

const themeResource = versionedFileResource<Theme, ThemeMeta, ProductionInfo>({
  baseUrl: '/api/themes',
});

export async function listThemes(): Promise<ThemeMeta[]> {
  const data = await themeResource.list();
  return data.files;
}

export const loadTheme = (fileName: string): Promise<Theme> => themeResource.load(fileName);
export const saveTheme = (fileName: string, data: Theme): Promise<void> =>
  themeResource.save(fileName, data);
export const deleteTheme = (fileName: string): Promise<void> => themeResource.remove(fileName);

export async function getActiveTheme(): Promise<Theme | null> {
  return themeResource.getActive();
}

export const setActiveFile = (fileName: string): Promise<void> => themeResource.setActive(fileName);

// ── Production API helpers ─────────────────────────────────

export const getProductionInfo = (): Promise<ProductionInfo> => themeResource.getProductionInfo();

export async function setProductionFile(
  fileName: string,
): Promise<{ ok: boolean; fileName: string; name: string }> {
  const data = await themeResource.setProduction(fileName);
  return { ok: data.ok, fileName: data.fileName, name: data.name };
}

/** Sanitize a display name to a safe file name. Re-exported from the shared
 * `files/versionedFileResource` so the dev-server plugin can import the
 * canonical pure helper without depending on this module's CSS imports. */
export const sanitizeFileName = sanitizeFileNameImpl;

// ── Theme save/load orchestration ──────────────────────────
//
// `persistTheme` and `hydrateTheme` are the canonical entry points for
// round-tripping editor state to disk. Callers (e.g. `EditorShell`) need
// only handle UI-level concerns (status flashing, error chrome) and
// delegate the actual orchestration here.

/** Snapshot the editor state to disk under `fileName`, mark the file active,
 *  and clear the dirty flag. The caller is responsible for surfacing
 *  saving / saved / error UI states around this call. */
export async function persistTheme(
  state: EditorState,
  fileName: string,
  displayName: string,
): Promise<void> {
  await tick();
  const theme = toTheme(state, { name: displayName });
  await saveTheme(fileName, theme);
  await setActiveFile(fileName);
  activeFileName.set(fileName);
  markSaved();
}

/** Load a theme file into the editor state and re-apply font side-effects
 *  (@font-face rules + `--font-*` CSS vars on :root). */
export async function hydrateTheme(fileName: string): Promise<void> {
  const theme = await loadTheme(fileName);
  migrateThemeFonts(theme);
  loadEditorState(theme);
  // Font data is in state.fonts via loadEditorState; the DOM-side-effect
  // helpers still need to run so @font-face rules and --font-* CSS vars
  // land on :root.
  if (theme.fontSources && theme.fontSources.length > 0) {
    applyFontSources(theme.fontSources);
  }
  if (theme.fontStacks && theme.fontStacks.length > 0) {
    applyFontStacks(theme.fontStacks, theme.fontSources ?? []);
  }
}
