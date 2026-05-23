import type { AliasDiskValue, Theme } from './themeTypes';
import { activeFileName } from '../store/editorConfigStore';
import { migrateThemeFonts } from '../fonts/fontMigration';
import { applyFontSources, applyFontStacks } from '../fonts/fontLoader';
import { loadFromFile, seedComponentsFromApi } from '../store/editorStore';
import { getActiveComponentConfig } from '../components/componentConfigService';
import { safeFetch } from '../storage/storage';

interface ComponentSummaryDto {
  name: string;
  activeFile: string;
  productionFile: string;
}

interface ListComponentsDto {
  components: ComponentSummaryDto[];
}

/**
 * Fetch the active theme from the server and apply its CSS variables
 * to :root before the app mounts. Seeds the editor store so PaletteEditors
 * initialize from the theme instead of stale localStorage.
 *
 * Routes the theme through `loadFromFile` so palette-derived vars in
 * `deriveCssVars` correctly overwrite any stale hexes baked into
 * `theme.cssVariables` by `handleSave`'s scrape. Writing
 * `theme.cssVariables` directly to inline :root (the previous approach)
 * bypassed the store and left the subscriber's `lastApplied` diff cache
 * out of sync, so palette-derived values stayed stale until a
 * `PaletteEditor` mounted and re-emitted them.
 *
 * Network/parse failures fall through silently — `tokens.css` provides
 * defaults and the components slice stays empty until first edit. We use
 * `safeFetch` (instead of empty try/catch) to make the silence intentional.
 */
export async function initializeTheme(): Promise<void> {
  const theme = await safeFetch<Theme>('/api/themes/active');
  if (theme) {
    migrateThemeFonts(theme);
    loadFromFile(theme);
    if (theme.fontSources && theme.fontSources.length > 0) {
      applyFontSources(theme.fontSources);
    }
    if (theme.fontStacks && theme.fontStacks.length > 0) {
      applyFontStacks(theme.fontStacks, theme.fontSources ?? []);
    }
    const fileName = theme._fileName || 'default';
    activeFileName.set(fileName);
  }

  const list = await safeFetch<ListComponentsDto>('/api/component-configs');
  if (list && Array.isArray(list.components)) {
    const configs: Record<
      string,
      { activeFile: string; aliases: Record<string, AliasDiskValue>; config?: Record<string, unknown>; schemaVersion?: number }
    > = {};
    await Promise.all(
      list.components.map(async (c) => {
        const cfg = await getActiveComponentConfig(c.name);
        if (cfg) {
          configs[c.name] = {
            activeFile: c.activeFile,
            aliases: cfg.aliases,
            config: cfg.config,
            schemaVersion: cfg.schemaVersion,
          };
        }
      }),
    );
    if (Object.keys(configs).length > 0) {
      seedComponentsFromApi(configs);
    }
  }
}
