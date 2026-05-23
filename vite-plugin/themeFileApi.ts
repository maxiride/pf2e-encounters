import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { extractGlobalRootBody } from '../src/editor/core/themes/parsers/globalRootBlock';
import { sanitizeFileName } from '../src/editor/core/storage/files/versionedFileResourceClient';
import {
  palettesToVars,
  reconcilePalettesFromCssVars,
} from '../src/editor/core/palettes/paletteDerivation';
import {
  versionedFileResourceServer,
  type VersionedFileResourceServer,
} from './files/versionedFileResourceServer';
import { dispatch, type Route } from './files/routeTable';
import { nextAvailableName as allocNextAvailableName } from './files/nameAllocator';
import { fileURLToPath } from 'node:url';

// Read live-tokens' own package.json by walking up from this file. Works the
// same in dev (plugin source) and built (dist-plugin/index.js) — single source.
const PKG_VERSION: string = (() => {
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 4; i++) {
      const p = path.join(dir, 'package.json');
      if (fs.existsSync(p)) {
        const json = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (json?.name === '@motion-proto/live-tokens') return json.version ?? '';
      }
      const up = path.dirname(dir);
      if (up === dir) break;
      dir = up;
    }
  } catch { /* fall through */ }
  return '';
})();

export interface ThemeFileApiOptions {
  themesDir: string;           // required, e.g. 'themes' (relative to cwd, resolved with path.resolve)
  tokensCssPath: string;       // required, e.g. 'src/styles/tokens.css'. Developer-authored, never written.
  tokensGeneratedCssPath?: string; // default: sibling of tokensCssPath named 'tokens.generated.css'. Editor-owned.
  fontsCssPath?: string;       // default: sibling of tokensCssPath named 'fonts.css'
  apiBase?: string;            // default: '/api'. Must be a simple '/path' without regex metacharacters.
  componentConfigsDir?: string; // default: 'component-configs'
  componentsSrcDir?: string;   // default: 'src/system/components'
  manifestsDir?: string;       // default: 'manifests'
}

export function themeFileApi(opts: ThemeFileApiOptions): Plugin {
  const THEMES_DIR = path.resolve(opts.themesDir);
  const CSS_PATH = path.resolve(opts.tokensCssPath);
  const GENERATED_CSS_PATH = opts.tokensGeneratedCssPath
    ? path.resolve(opts.tokensGeneratedCssPath)
    : path.join(path.dirname(CSS_PATH), 'tokens.generated.css');
  const FONTS_CSS_PATH = opts.fontsCssPath
    ? path.resolve(opts.fontsCssPath)
    : path.join(path.dirname(CSS_PATH), 'fonts.css');
  const API_BASE = opts.apiBase ?? '/api';
  const COMPONENT_CONFIGS_DIR = opts.componentConfigsDir
    ? path.resolve(opts.componentConfigsDir)
    : path.resolve('component-configs');
  const COMPONENTS_SRC_DIR = opts.componentsSrcDir
    ? path.resolve(opts.componentsSrcDir)
    : path.resolve('src/system/components');
  const MANIFESTS_DIR = opts.manifestsDir
    ? path.resolve(opts.manifestsDir)
    : path.resolve('manifests');
  const LEGACY_PRESETS_DIR = path.resolve('presets');

  // Themes resource — list/load/save/delete + active/production.
  const themesResource = versionedFileResourceServer({
    dir: THEMES_DIR,
  });

  // Per-component resources are constructed on demand because the set of
  // components is discovered at runtime from `src/system/components/*.svelte`.
  const componentResourceCache = new Map<string, VersionedFileResourceServer>();
  function componentResource(comp: string): VersionedFileResourceServer {
    let r = componentResourceCache.get(comp);
    if (!r) {
      r = versionedFileResourceServer({ dir: path.join(COMPONENT_CONFIGS_DIR, comp) });
      componentResourceCache.set(comp, r);
    }
    return r;
  }

  // Manifests resource — files that pin one theme + one config per component.
  // The active manifest is the single live snapshot; theme/component Adopts
  // patch its refs (see `patchActiveManifest`). `_production.json` is unused
  // for this resource — the new model has no separate Production slot.
  const manifestsResource = versionedFileResourceServer({ dir: MANIFESTS_DIR });

  function ensureThemesDir() {
    themesResource.ensureDir();
    if (!fs.existsSync(path.join(THEMES_DIR, 'default.json'))) {
      const defaultTheme = {
        name: 'Default Theme',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        editorConfigs: {},
        cssVariables: {},
      };
      fs.writeFileSync(path.join(THEMES_DIR, 'default.json'), JSON.stringify(defaultTheme, null, 2));
    }
    themesResource.ensureMeta();
  }

  function readBody(req: any): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk));
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  function jsonResponse(res: any, status: number, data: any) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  }

  /**
   * Single-door theme normaliser. Runs the per-slice reconciler (palettes
   * today; fonts/shadows/gradients later phases), then strips every variable
   * the typed slices now own from the catch-all `cssVariables` bag.
   *
   * The reconciler is gated by `_imported` per palette — editor-authored
   * themes are no-ops, importers opt in. Strip runs unconditionally because
   * the renderer already overlays typed-slice derivations on top of
   * cssVariables; stripped values were dead data.
   *
   * Call from every theme-read door. See temp/manifest-robustness-plan.md §10.
   */
  function normalizeTheme<T extends { cssVariables?: Record<string, string>; editorConfigs?: any } | null | undefined>(
    theme: T,
  ): T {
    if (!theme || typeof theme !== 'object') return theme;
    const palettes = theme.editorConfigs ?? {};
    const cssVars = theme.cssVariables ?? {};
    const { palettes: nextPalettes, consumed } = reconcilePalettesFromCssVars(palettes, cssVars);
    const nextCssVars: Record<string, string> = {};
    for (const [k, v] of Object.entries(cssVars)) {
      if (!consumed.has(k)) nextCssVars[k] = v;
    }
    return { ...theme, editorConfigs: nextPalettes, cssVariables: nextCssVars };
  }

  const SYSTEM_CASCADES_SSR: Record<string, string> = {
    'system-ui-sans':
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    'system-ui-serif': 'Georgia, "Times New Roman", serif',
    'system-ui-mono': 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  };

  function resolveFontStacks(themeData: any): Record<string, string> {
    const stacks = themeData.fontStacks as Array<{ variable: string; slots: any[] }> | undefined;
    const sources = themeData.fontSources as Array<{ id: string; families: Array<{ id: string; cssName: string }> }> | undefined;
    if (!stacks || stacks.length === 0) return {};
    const familyById = new Map<string, string>();
    for (const src of sources ?? []) {
      for (const f of src.families) familyById.set(f.id, f.cssName);
    }
    const out: Record<string, string> = {};
    for (const stack of stacks) {
      const parts: string[] = [];
      for (const slot of stack.slots) {
        if (slot.kind === 'project') {
          const css = familyById.get(slot.familyId);
          if (css) parts.push(css);
        } else if (slot.kind === 'system') {
          const cascade = SYSTEM_CASCADES_SSR[slot.preset];
          if (cascade) parts.push(cascade);
        } else if (slot.kind === 'generic') {
          parts.push(slot.value);
        }
      }
      if (parts.length > 0) out[stack.variable] = parts.join(', ');
    }
    return out;
  }

  /**
   * Regenerate the editor-owned `tokens.generated.css` sidecar from the
   * production theme and every component's `_production.json`. The
   * developer-authored `tokens.css` is never written — it holds defaults the
   * user is free to hand-edit and stays the single source of truth for
   * primitives. The generated file is imported immediately after `tokens.css`
   * and uses `:root:root` selectors (specificity 0,0,2) so its overrides win
   * over the defaults (0,0,1) and the component-default `:global(:root)`
   * blocks (0,0,1) regardless of CSS chunk ordering.
   *
   * Mirrors the client renderer's overlay order in `editorRenderer.ts`:
   * catch-all cssVariables first, then typed-slice derivations (palette ramps,
   * font stacks) on top. Per-component alias overrides emit only when a
   * component's production config differs from its default.
   */
  function regenerateTokensCss(): void {
    const lines: string[] = [];
    lines.push('/* Generated by themeFileApi from the production theme and component configs. Do not edit. */');
    lines.push('/* tokens.css holds developer-authored defaults; this file holds editor overrides. */');
    lines.push('');

    // Section 1: production-theme overrides (palette ramps, font stacks, custom vars).
    const productionThemeName = themesResource.getProductionName();
    const themePath = path.join(THEMES_DIR, `${productionThemeName}.json`);
    let themeVarCount = 0;
    if (fs.existsSync(themePath)) {
      const themeData = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
      const cssVars: Record<string, string> = { ...(themeData.cssVariables || {}) };
      Object.assign(cssVars, palettesToVars(themeData.editorConfigs ?? {}));
      const resolvedFontVars = resolveFontStacks(themeData);
      for (const [name, value] of Object.entries(resolvedFontVars)) {
        cssVars[name] = value;
      }
      themeVarCount = Object.keys(cssVars).length;
      if (themeVarCount > 0) {
        lines.push(`/* Production theme: ${productionThemeName} */`);
        lines.push(':root:root {');
        for (const [name, value] of Object.entries(cssVars)) {
          lines.push(`  ${name}: ${value};`);
        }
        lines.push('}');
        lines.push('');
      }
    }

    // Section 2: component-alias overrides — every production config that
    // differs from the component's default. When production points to
    // 'default', no overrides are emitted (the source `.svelte` is
    // authoritative).
    let componentOverrideCount = 0;
    if (fs.existsSync(COMPONENT_CONFIGS_DIR)) {
      const blocks: string[][] = [];
      for (const comp of listComponentNames()) {
        const prod = componentResource(comp).getProductionName();
        if (prod === 'default') continue;
        const prodCfg = readComponentConfig(comp, prod);
        const defaultCfg = readComponentConfig(comp, 'default');
        if (!prodCfg || !defaultCfg) continue;
        const overrides: [string, AliasDiskValue][] = [];
        const defaultAliases = (defaultCfg.aliases ?? {}) as Record<string, AliasDiskValue>;
        for (const [varName, semanticValue] of Object.entries((prodCfg.aliases ?? {}) as Record<string, AliasDiskValue>)) {
          if (!aliasValuesEqual(defaultAliases[varName], semanticValue)) {
            overrides.push([varName, semanticValue]);
          }
        }
        if (overrides.length === 0) continue;
        const block: string[] = [`  /* ${comp} (${prod}) */`];
        for (const [varName, semanticValue] of overrides) {
          block.push(`  ${varName}: ${aliasValueToCss(semanticValue)};`);
        }
        blocks.push(block);
        componentOverrideCount += overrides.length;
      }
      if (blocks.length > 0) {
        lines.push('/* Component aliases (production configs differing from defaults) */');
        lines.push(':root:root {');
        for (let i = 0; i < blocks.length; i++) {
          if (i > 0) lines.push('');
          lines.push(...blocks[i]);
        }
        lines.push('}');
        lines.push('');
      }
    }

    if (!fs.existsSync(path.dirname(GENERATED_CSS_PATH))) {
      fs.mkdirSync(path.dirname(GENERATED_CSS_PATH), { recursive: true });
    }
    fs.writeFileSync(GENERATED_CSS_PATH, lines.join('\n'));
    console.log(
      `[regenerateTokensCss] Wrote ${path.basename(GENERATED_CSS_PATH)} (${themeVarCount} theme vars, ${componentOverrideCount} component overrides)`,
    );
  }

  /** Back-compat wrapper. The argument is ignored; the generated file is
   * always rebuilt from the current production theme. Existing call sites
   * pass a fileName for historical reasons (they all set the production
   * pointer first, then call this). */
  function syncTokensToCss(_fileName: string): void {
    regenerateTokensCss();
  }

  /**
   * Regenerate fonts.css from a theme's fontSources. Called alongside
   * syncTokensToCss so the production build's static font-loading layer
   * matches the registry the editor last promoted.
   */
  function syncFontsToCss(fileName: string): void {
    const themePath = path.join(THEMES_DIR, `${fileName}.json`);
    if (!fs.existsSync(themePath)) return;
    const themeData = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
    const sources = themeData.fontSources as Array<{
      id: string;
      kind: string;
      url?: string;
      cssText?: string;
      label?: string;
      families: Array<{ name: string }>;
    }> | undefined;
    if (!sources) return;

    const lines: string[] = [];
    lines.push('/* Generated from the production theme by syncFontsToCss. Do not edit. */');
    lines.push('/* Both fonts.css and fonts/ are in dist/, so relative paths work at runtime. */');
    lines.push('');

    // CSS requires all @import rules to precede other statements, so emit
    // URL-based sources first and font-face rules after, regardless of the
    // order they appear in fontSources.
    const urlSources = sources.filter((s) => s.kind !== 'font-face' && s.url);
    const faceSources = sources.filter((s) => s.kind === 'font-face' && s.cssText);

    for (const source of urlSources) {
      const familyNames = source.families.map((f) => f.name).join(', ');
      const label = source.label ? `${source.label} — ${familyNames}` : familyNames;
      lines.push(`/* ${label} */`);
      lines.push(`@import url('${source.url}');`);
      lines.push('');
    }

    for (const source of faceSources) {
      const familyNames = source.families.map((f) => f.name).join(', ');
      const label = source.label ? `${source.label} — ${familyNames}` : familyNames;
      lines.push(`/* ${label} */`);
      lines.push(source.cssText!);
      lines.push('');
    }

    const content = lines.join('\n');
    if (!fs.existsSync(path.dirname(FONTS_CSS_PATH))) {
      fs.mkdirSync(path.dirname(FONTS_CSS_PATH), { recursive: true });
    }
    fs.writeFileSync(FONTS_CSS_PATH, content);
    console.log(`[syncFontsToCss] Wrote ${sources.length} source(s) into ${path.basename(FONTS_CSS_PATH)}`);
  }

  // ── Component-configs helpers ─────────────────────────────────────────────
  //
  // Each component under `src/system/components/*.svelte` has an independent editor
  // artifact: component-configs/{comp}/{default.json,_active.json,_production.json}.
  // default.json is regenerated from the component's `:global(:root)` block at
  // dev startup and on HMR; other files are user-authored.

  function extractAliasDeclarations(body: string): Record<string, string> {
    const aliases: Record<string, string> = {};
    const re = /(--[a-z0-9-]+)\s*:\s*var\((--[a-z0-9-]+)\)\s*;/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) aliases[m[1]] = m[2];
    return aliases;
  }

  function componentNameFromFile(filePath: string): string {
    return path.basename(filePath, '.svelte').toLowerCase();
  }

  function listComponentSourcePaths(): string[] {
    if (!fs.existsSync(COMPONENTS_SRC_DIR)) return [];
    return fs
      .readdirSync(COMPONENTS_SRC_DIR)
      .filter((f) => f.endsWith('.svelte'))
      .map((f) => path.join(COMPONENTS_SRC_DIR, f));
  }

  function listComponentNames(): string[] {
    return listComponentSourcePaths().map(componentNameFromFile);
  }

  /**
   * Regenerate `component-configs/{comp}/default.json` from the component's
   * `:global(:root)` block. Writes only if missing or stale (source mtime >
   * default mtime). Preserves createdAt on regeneration.
   */
  function generateDefaultConfig(comp: string, sourcePath: string): void {
    if (!fs.existsSync(sourcePath)) return;
    const r = componentResource(comp);
    r.ensureDir();
    const defaultPath = r.filePath('default');
    const sourceStat = fs.statSync(sourcePath);
    if (fs.existsSync(defaultPath)) {
      const defaultStat = fs.statSync(defaultPath);
      if (defaultStat.mtimeMs >= sourceStat.mtimeMs) return;
    }
    const source = fs.readFileSync(sourcePath, 'utf-8');
    const body = extractGlobalRootBody(source);
    const aliases = extractAliasDeclarations(body);
    const now = new Date().toISOString();
    let createdAt = now;
    let existingUpdatedAt: string | undefined;
    let existingAliases: Record<string, string> | undefined;
    if (fs.existsSync(defaultPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
        if (existing.createdAt) createdAt = existing.createdAt;
        if (typeof existing.updatedAt === 'string') existingUpdatedAt = existing.updatedAt;
        if (existing.aliases && typeof existing.aliases === 'object') {
          existingAliases = existing.aliases as Record<string, string>;
        }
      } catch { /* overwrite */ }
    }
    const aliasesUnchanged =
      existingAliases !== undefined &&
      JSON.stringify(existingAliases) === JSON.stringify(aliases);
    const defaultConfig = {
      name: 'default',
      component: comp,
      createdAt,
      updatedAt: aliasesUnchanged && existingUpdatedAt ? existingUpdatedAt : now,
      aliases,
    };
    if (aliasesUnchanged && existingUpdatedAt) {
      // Bump default.json's mtime so the source > default check stops firing,
      // but leave file bytes (including updatedAt) untouched.
      const t = new Date();
      fs.utimesSync(defaultPath, t, t);
      return;
    }
    fs.writeFileSync(defaultPath, JSON.stringify(defaultConfig, null, 2));
  }

  function ensureComponentConfigsDir(): void {
    if (!fs.existsSync(COMPONENT_CONFIGS_DIR)) {
      fs.mkdirSync(COMPONENT_CONFIGS_DIR, { recursive: true });
    }
    for (const sourcePath of listComponentSourcePaths()) {
      const comp = componentNameFromFile(sourcePath);
      const r = componentResource(comp);
      r.ensureDir();
      generateDefaultConfig(comp, sourcePath);
      r.ensureMeta();
    }
  }

  // ── Manifests helpers ─────────────────────────────────────────────────────

  function ensureManifestsDir(): void {
    // One-shot migration: rename legacy presets/ → manifests/ if the new
    // directory doesn't exist yet. Drop the legacy `_production.json` pointer
    // (the new model has no separate Production slot). Idempotent — guarded
    // by directory existence.
    if (!fs.existsSync(MANIFESTS_DIR) && fs.existsSync(LEGACY_PRESETS_DIR)) {
      fs.renameSync(LEGACY_PRESETS_DIR, MANIFESTS_DIR);
      const legacyProd = path.join(MANIFESTS_DIR, '_production.json');
      if (fs.existsSync(legacyProd)) fs.unlinkSync(legacyProd);
    }

    manifestsResource.ensureDir();
    const defaultPath = path.join(MANIFESTS_DIR, 'default.json');
    if (!fs.existsSync(defaultPath)) {
      // The default manifest captures whatever is checked in as the current
      // active state — the team's intended defaults — not a synthetic all-
      // default manifest. Read each resource's `_active.json` pointer so a
      // first run on a customized repo produces a Default manifest that
      // round-trips back to the same state.
      const componentConfigs: Record<string, string> = {};
      for (const comp of listComponentNames()) {
        componentConfigs[comp] = componentResource(comp).getActiveName();
      }
      const now = new Date().toISOString();
      const defaultManifest = {
        name: 'Default',
        createdAt: now,
        updatedAt: now,
        theme: themesResource.getActiveName(),
        componentConfigs,
      };
      fs.writeFileSync(defaultPath, JSON.stringify(defaultManifest, null, 2));
    }

    // Ensure `_active.json` exists; never write `_production.json` for this
    // resource (it's not part of the manifest model). If a legacy one
    // survived migration, scrub it.
    if (!fs.existsSync(manifestsResource.activePath)) {
      fs.writeFileSync(
        manifestsResource.activePath,
        JSON.stringify({ activeFile: 'default' }),
      );
    } else {
      // Normalize: if the pointer references a missing file, fall back to default.
      const activeName = manifestsResource.getActiveName();
      if (!fs.existsSync(manifestsResource.filePath(activeName))) {
        manifestsResource.setActiveName('default');
      }
    }
    const stragglerProd = path.join(MANIFESTS_DIR, '_production.json');
    if (fs.existsSync(stragglerProd)) fs.unlinkSync(stragglerProd);
  }

  /**
   * Patch the currently-active manifest in response to a theme or component
   * Adopt: rewrites the matching ref (`theme` or `componentConfigs[comp]`).
   * Returns `false` if the active manifest is `default` (protected) so the
   * caller can fail the Adopt with 409 ACTIVE_IS_PROTECTED.
   */
  function patchActiveManifest(
    field: 'theme' | 'component',
    comp: string | null,
    fileName: string,
  ): boolean {
    const activeFile = manifestsResource.getActiveName();
    if (activeFile === 'default') return false;
    const manifestPath = manifestsResource.filePath(activeFile);
    if (!fs.existsSync(manifestPath)) return false;
    let manifest: any;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
      return false;
    }
    if (field === 'theme') {
      manifest.theme = fileName;
    } else if (field === 'component' && comp) {
      manifest.componentConfigs = manifest.componentConfigs ?? {};
      manifest.componentConfigs[comp] = fileName;
    }
    manifest.updatedAt = new Date().toISOString();
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    return true;
  }

  /** Inline structured gradient on a component alias. Mirrors the client's
   *  `AliasDiskValue` discriminant — kept inline here because the vite plugin
   *  has no clean import path into `src/editor/core/themes`. */
  type AliasDiskGradient = {
    kind: 'gradient';
    value: {
      type: 'linear' | 'radial' | 'solid' | 'none';
      angle: number;
      radius?: number;
      centerX?: number;
      aspectX?: number;
      aspectY?: number;
      stops: { position: number; color: string; opacity?: number }[];
    };
  };
  type AliasDiskValue = string | AliasDiskGradient;

  interface ComponentConfigRead {
    name?: string;
    component?: string;
    createdAt?: string;
    updatedAt?: string;
    aliases?: Record<string, AliasDiskValue>;
    config?: Record<string, unknown>;
  }

  /** Server-side mirror of `formatGradientValue` from
   *  `src/editor/core/themes/slices/gradients.ts`. Emits the same CSS the
   *  client's renderer writes into `:root`, so production overrides stay in
   *  sync with the live editor. */
  function formatAliasGradient(v: AliasDiskGradient['value']): string {
    const stopColor = (s: { color: string; opacity?: number }): string => {
      const base = s.color.startsWith('--') ? `var(${s.color})` : s.color;
      const opacity = s.opacity ?? 100;
      return opacity >= 100 ? base : `color-mix(in srgb, ${base} ${opacity}%, transparent)`;
    };
    if (v.type === 'none') return 'transparent';
    if (v.type === 'solid') {
      const first = v.stops[0];
      if (!first) return 'transparent';
      return stopColor(first);
    }
    const stops = v.stops.map((s) => `${stopColor(s)} ${s.position}%`).join(', ');
    if (v.type === 'linear') return `linear-gradient(${v.angle}deg, ${stops})`;
    const radial = v.radius && v.radius > 0
      ? `circle ${v.radius}px at center`
      : 'circle';
    return `radial-gradient(${radial}, ${stops})`;
  }

  function aliasValueToCss(v: AliasDiskValue): string {
    if (typeof v === 'string') return v.startsWith('--') ? `var(${v})` : v;
    return formatAliasGradient(v.value);
  }

  function aliasValuesEqual(a: AliasDiskValue | undefined, b: AliasDiskValue | undefined): boolean {
    if (a === undefined || b === undefined) return a === b;
    if (typeof a === 'string' && typeof b === 'string') return a === b;
    if (typeof a !== typeof b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function readComponentConfig(comp: string, name: string): ComponentConfigRead | null {
    const filePath = componentResource(comp).filePath(name);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  /** Back-compat wrapper. Component-alias overrides are now emitted as a
   * second `:root:root` block inside `tokens.generated.css`; see
   * `regenerateTokensCss`. The developer-authored `tokens.css` is never
   * written. */
  function syncComponentsToCss(): void {
    regenerateTokensCss();
  }

  // Build parameterized routes/regexes from API_BASE.
  // Escape regex metacharacters so custom apiBase values still work.
  const escapedBase = API_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const THEMES_ROUTE = `${API_BASE}/themes`;
  const THEMES_ACTIVE_ROUTE = `${API_BASE}/themes/active`;
  const THEMES_PRODUCTION_ROUTE = `${API_BASE}/themes/production`;
  const COMPONENT_CONFIGS_ROUTE = `${API_BASE}/component-configs`;
  const MANIFESTS_ROUTE = `${API_BASE}/manifests`;
  const MANIFESTS_ACTIVE_ROUTE = `${API_BASE}/manifests/active`;
  const THEME_BY_NAME_REGEX = new RegExp(`^${escapedBase}/themes/([a-z0-9\\-_]+)$`);
  const COMP_LIST_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)$`);
  const COMP_ACTIVE_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/active$`);
  const COMP_PRODUCTION_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/production$`);
  const COMP_BY_NAME_REGEX = new RegExp(`^${escapedBase}/component-configs/([a-z0-9\\-_]+)/([a-z0-9\\-_]+)$`);
  const MANIFEST_APPLY_REGEX = new RegExp(`^${escapedBase}/manifests/([a-z0-9\\-_]+)/apply$`);
  const MANIFEST_EXPORT_REGEX = new RegExp(`^${escapedBase}/manifests/([a-z0-9\\-_]+)/export$`);
  const MANIFEST_IMPORT_ROUTE = `${API_BASE}/manifests/import`;
  const MANIFEST_BY_NAME_REGEX = new RegExp(`^${escapedBase}/manifests/([a-z0-9\\-_]+)$`);

  // ── Route handlers ────────────────────────────────────────────────────────
  // Each handler can throw — the route-table dispatcher centralises the 500
  // catch. Order in the routes table matters: the active/production patterns
  // MUST appear before the catch-all `:name` patterns (the table replaces
  // the previous "warning comment" with explicit ordering).

  // ── /api/themes ──────────────────────────────────────────────────────────

  async function handleListThemes(_ctx: any) {
    const activeFile = themesResource.getActiveName();
    const files = fs
      .readdirSync(THEMES_DIR)
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .map((f) => {
        const filePath = path.join(THEMES_DIR, f);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const fileName = f.replace('.json', '');
        return {
          name: data.name || fileName,
          fileName,
          updatedAt: data.updatedAt || '',
          isActive: fileName === activeFile,
        };
      });
    jsonResponse(_ctx.res, 200, { files });
  }

  async function handleGetActiveTheme({ res }: any) {
    const activeFile = themesResource.getActiveName();
    const filePath = themesResource.filePath(activeFile);
    if (!fs.existsSync(filePath)) {
      jsonResponse(res, 404, { error: 'Active theme not found' });
      return;
    }
    const data = normalizeTheme(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
    data._fileName = activeFile;
    jsonResponse(res, 200, data);
  }

  async function handleSetActiveTheme({ req, res }: any) {
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    if (!fs.existsSync(themesResource.filePath(fileName))) {
      jsonResponse(res, 404, { error: 'Theme not found' });
      return;
    }
    themesResource.setActiveName(fileName);
    jsonResponse(res, 200, { ok: true, activeFile: fileName });
  }

  async function handleGetProductionTheme({ res }: any) {
    const prodFile = themesResource.getProductionName();
    const filePath = themesResource.filePath(prodFile);
    if (!fs.existsSync(filePath)) {
      jsonResponse(res, 200, { fileName: prodFile, name: prodFile, cssVariables: {} });
      return;
    }
    const data = normalizeTheme(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
    jsonResponse(res, 200, {
      fileName: prodFile,
      name: data.name || prodFile,
      updatedAt: data.updatedAt || '',
      cssVariables: data.cssVariables || {},
    });
  }

  async function handleSetProductionTheme({ req, res }: any) {
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    if (!fs.existsSync(themesResource.filePath(fileName))) {
      jsonResponse(res, 404, { error: 'Theme not found' });
      return;
    }
    // Reject before any destructive write if the active manifest is the
    // protected default — the client recovers by prompting Save As.
    if (manifestsResource.getActiveName() === 'default') {
      jsonResponse(res, 409, {
        error: 'Active manifest is protected. Save As first.',
        code: 'ACTIVE_IS_PROTECTED',
      });
      return;
    }
    themesResource.setProductionName(fileName);
    syncTokensToCss(fileName);
    syncFontsToCss(fileName);
    syncComponentsToCss();
    patchActiveManifest('theme', null, fileName);
    const data = JSON.parse(fs.readFileSync(themesResource.filePath(fileName), 'utf-8'));
    jsonResponse(res, 200, {
      ok: true,
      fileName,
      name: data.name || fileName,
      updatedAt: data.updatedAt || '',
    });
  }

  async function handleThemeByName({ params, req, res }: any) {
    const [fileName] = params;
    const filePath = themesResource.filePath(fileName);

    if (req.method === 'GET') {
      if (!fs.existsSync(filePath)) {
        jsonResponse(res, 404, { error: 'Not found' });
        return;
      }
      const data = normalizeTheme(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
      data._fileName = fileName;
      jsonResponse(res, 200, data);
      return;
    }

    if (req.method === 'PUT') {
      const body = JSON.parse(await readBody(req));
      body.updatedAt = new Date().toISOString();
      // Preserve createdAt from existing file
      if (fs.existsSync(filePath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (existing.createdAt) body.createdAt = existing.createdAt;
        } catch { /* use body value or set below */ }
      }
      if (!body.createdAt) body.createdAt = body.updatedAt;
      fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
      // Keep tokens.css and fonts.css in sync when the production theme is saved
      if (fileName === themesResource.getProductionName()) {
        syncTokensToCss(fileName);
        syncFontsToCss(fileName);
        syncComponentsToCss();
      }
      jsonResponse(res, 200, { ok: true, fileName });
      return;
    }

    if (req.method === 'DELETE') {
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot delete the default theme' });
        return;
      }
      // Reject deletion of the live production theme — removing it would
      // leave _production.json pointing at a missing file and break the
      // running site. The user must Adopt a different theme first.
      if (themesResource.getProductionName() === fileName) {
        jsonResponse(res, 403, {
          error: 'Cannot delete the production theme. Adopt a different theme first.',
          code: 'PRODUCTION_THEME',
        });
        return;
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        // If this was the active theme, revert to default
        if (themesResource.getActiveName() === fileName) {
          themesResource.setActiveName('default');
        }
      }
      jsonResponse(res, 200, { ok: true });
      return;
    }
  }

  // ── /api/component-configs ───────────────────────────────────────────────

  async function handleListComponents({ res }: any) {
    const components = listComponentNames().map((comp) => {
      const r = componentResource(comp);
      return {
        name: comp,
        activeFile: r.getActiveName(),
        productionFile: r.getProductionName(),
      };
    });
    jsonResponse(res, 200, { components });
  }

  async function handleGetComponentActive({ params, res }: any) {
    const [comp] = params;
    const r = componentResource(comp);
    const activeFile = r.getActiveName();
    const cfg = readComponentConfig(comp, activeFile);
    if (!cfg) {
      jsonResponse(res, 404, { error: 'Active config not found' });
      return;
    }
    jsonResponse(res, 200, { ...cfg, _fileName: activeFile });
  }

  async function handleSetComponentActive({ params, req, res }: any) {
    const [comp] = params;
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    const r = componentResource(comp);
    const configPath = r.filePath(fileName);
    if (!fs.existsSync(configPath)) {
      jsonResponse(res, 404, { error: 'Config not found' });
      return;
    }
    r.ensureDir();
    r.setActiveName(fileName);
    jsonResponse(res, 200, { ok: true, activeFile: fileName });
  }

  async function handleGetComponentProduction({ params, res }: any) {
    const [comp] = params;
    const r = componentResource(comp);
    const prodFile = r.getProductionName();
    const cfg = readComponentConfig(comp, prodFile);
    jsonResponse(res, 200, {
      fileName: prodFile,
      name: cfg?.name || prodFile,
      aliases: cfg?.aliases || {},
    });
  }

  async function handleSetComponentProduction({ params, req, res }: any) {
    const [comp] = params;
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    const r = componentResource(comp);
    const configPath = r.filePath(fileName);
    if (!fs.existsSync(configPath)) {
      jsonResponse(res, 404, { error: 'Config not found' });
      return;
    }
    if (manifestsResource.getActiveName() === 'default') {
      jsonResponse(res, 409, {
        error: 'Active manifest is protected. Save As first.',
        code: 'ACTIVE_IS_PROTECTED',
      });
      return;
    }
    r.ensureDir();
    r.setProductionName(fileName);
    syncComponentsToCss();
    patchActiveManifest('component', comp, fileName);
    const cfg = readComponentConfig(comp, fileName);
    jsonResponse(res, 200, {
      ok: true,
      fileName,
      name: cfg?.name || fileName,
      aliases: cfg?.aliases || {},
    });
  }

  async function handleComponentConfigByName({ params, req, res }: any) {
    const [comp, name] = params;
    const r = componentResource(comp);
    const configPath = r.filePath(name);

    if (req.method === 'GET') {
      if (!fs.existsSync(configPath)) {
        jsonResponse(res, 404, { error: 'Not found' });
        return;
      }
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      data._fileName = name;
      jsonResponse(res, 200, data);
      return;
    }

    if (req.method === 'PUT') {
      if (name === 'default') {
        jsonResponse(res, 403, { error: 'Cannot modify default config (regenerated from source)' });
        return;
      }
      const body = JSON.parse(await readBody(req));
      body.component = comp;
      body.name = body.name || name;
      body.updatedAt = new Date().toISOString();
      if (fs.existsSync(configPath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (existing.createdAt) body.createdAt = existing.createdAt;
        } catch { /* use body value or set below */ }
      }
      if (!body.createdAt) body.createdAt = body.updatedAt;
      r.ensureDir();
      fs.writeFileSync(configPath, JSON.stringify(body, null, 2));
      if (r.getProductionName() === name) {
        syncComponentsToCss();
      }
      jsonResponse(res, 200, { ok: true, fileName: name });
      return;
    }

    if (req.method === 'DELETE') {
      if (name === 'default') {
        jsonResponse(res, 403, { error: 'Cannot delete default config' });
        return;
      }
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
        if (r.getActiveName() === name) {
          r.setActiveName('default');
        }
        if (r.getProductionName() === name) {
          r.setProductionName('default');
          syncComponentsToCss();
        }
      }
      jsonResponse(res, 200, { ok: true });
      return;
    }
  }

  async function handleListComponentConfigs({ params, res }: any) {
    const [comp] = params;
    const r = componentResource(comp);
    if (!fs.existsSync(r.dir)) {
      jsonResponse(res, 404, { error: 'Component not found' });
      return;
    }
    const activeFile = r.getActiveName();
    const productionFile = r.getProductionName();
    const files = fs
      .readdirSync(r.dir)
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .map((f) => {
        const filePath = path.join(r.dir, f);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const fileName = f.replace('.json', '');
        return {
          name: data.name || fileName,
          fileName,
          updatedAt: data.updatedAt || '',
          isActive: fileName === activeFile,
          isProduction: fileName === productionFile,
        };
      });
    jsonResponse(res, 200, { component: comp, files, activeFile, productionFile });
  }

  // ── /api/manifests ───────────────────────────────────────────────────────

  async function handleListManifests({ res }: any) {
    const activeFile = manifestsResource.getActiveName();
    const files = fs
      .readdirSync(MANIFESTS_DIR)
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .map((f) => {
        const filePath = path.join(MANIFESTS_DIR, f);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const fileName = f.replace('.json', '');
        return {
          name: data.name || fileName,
          fileName,
          updatedAt: data.updatedAt || '',
          isActive: fileName === activeFile,
          isProtected: fileName === 'default',
        };
      });
    jsonResponse(res, 200, { files, activeFile });
  }

  async function handleGetActiveManifest({ res }: any) {
    const activeFile = manifestsResource.getActiveName();
    const filePath = manifestsResource.filePath(activeFile);
    if (!fs.existsSync(filePath)) {
      jsonResponse(res, 404, { error: 'Active manifest not found' });
      return;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data._fileName = activeFile;
    jsonResponse(res, 200, data);
  }

  async function handleSetActiveManifest({ req, res }: any) {
    const body = JSON.parse(await readBody(req));
    const fileName = sanitizeFileName(body.name || 'default');
    if (!fs.existsSync(manifestsResource.filePath(fileName))) {
      jsonResponse(res, 404, { error: 'Manifest not found' });
      return;
    }
    manifestsResource.setActiveName(fileName);
    jsonResponse(res, 200, { ok: true, activeFile: fileName });
  }

  async function handleManifestByName({ params, req, res }: any) {
    const [fileName] = params;
    const filePath = manifestsResource.filePath(fileName);

    if (req.method === 'GET') {
      if (!fs.existsSync(filePath)) {
        jsonResponse(res, 404, { error: 'Not found' });
        return;
      }
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      data._fileName = fileName;
      jsonResponse(res, 200, data);
      return;
    }

    if (req.method === 'PUT') {
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot overwrite the default manifest' });
        return;
      }
      const body = JSON.parse(await readBody(req));
      body.updatedAt = new Date().toISOString();
      if (fs.existsSync(filePath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (existing.createdAt) body.createdAt = existing.createdAt;
        } catch { /* use body value or set below */ }
      }
      if (!body.createdAt) body.createdAt = body.updatedAt;
      fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
      jsonResponse(res, 200, { ok: true, fileName });
      return;
    }

    if (req.method === 'DELETE') {
      if (fileName === 'default') {
        jsonResponse(res, 403, { error: 'Cannot delete the default manifest' });
        return;
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        if (manifestsResource.getActiveName() === fileName) {
          manifestsResource.setActiveName('default');
        }
      }
      jsonResponse(res, 200, { ok: true });
      return;
    }
  }

  /**
   * Atomically apply a manifest: validate every referenced file exists, flip
   * the theme + each component's `_active.json` and `_production.json`
   * pointers, sync tokens.css/fonts.css from the new theme, mark the manifest
   * itself active, and return the resolved theme + component configs in one
   * payload. The client follows with a full page reload. Setting production
   * here (not just active) means the running page picks up the new theme
   * without the user having to Adopt theme + every component by hand.
   */
  async function handleApplyManifest({ params, res }: any) {
    const [fileName] = params;
    const manifestPath = manifestsResource.filePath(fileName);
    if (!fs.existsSync(manifestPath)) {
      jsonResponse(res, 404, { error: 'Manifest not found' });
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    const themeName = sanitizeFileName(manifest.theme || 'default');
    const themePath = themesResource.filePath(themeName);
    if (!fs.existsSync(themePath)) {
      jsonResponse(res, 422, { error: `Manifest references missing theme: ${themeName}` });
      return;
    }

    // Validate every referenced component config exists. Components in the
    // manifest that don't exist as components get skipped (component was
    // removed since the manifest was saved); missing config files for an
    // existing component are a hard error.
    const knownComponents = new Set(listComponentNames());
    const componentConfigs = manifest.componentConfigs ?? {};
    const resolvedConfigs: Record<string, any> = {};
    const apply: Array<[string, string]> = [];
    for (const [comp, configFile] of Object.entries(componentConfigs)) {
      if (!knownComponents.has(comp)) continue;
      const sanitized = sanitizeFileName(String(configFile) || 'default');
      const r = componentResource(comp);
      const cfgPath = r.filePath(sanitized);
      if (!fs.existsSync(cfgPath)) {
        jsonResponse(res, 422, {
          error: `Manifest references missing config: ${comp}/${sanitized}`,
        });
        return;
      }
      apply.push([comp, sanitized]);
    }

    // Flip theme: active drives the editor, production drives the running page
    // (syncTokensToCss/syncFontsToCss write into tokens.css). Without setting
    // production here the user would have to re-Adopt the theme by hand.
    themesResource.setActiveName(themeName);
    themesResource.setProductionName(themeName);
    syncTokensToCss(themeName);
    syncFontsToCss(themeName);
    const themeData = normalizeTheme(JSON.parse(fs.readFileSync(themePath, 'utf-8')));
    themeData._fileName = themeName;

    for (const [comp, configFile] of apply) {
      const r = componentResource(comp);
      r.setActiveName(configFile);
      r.setProductionName(configFile);
      const cfg = readComponentConfig(comp, configFile);
      if (cfg) resolvedConfigs[comp] = { ...cfg, _fileName: configFile };
    }

    // Components on disk but not mentioned in the manifest: leave their
    // active and production pointers alone. The manifest has no opinion.
    for (const comp of knownComponents) {
      if (resolvedConfigs[comp]) continue;
      const activeName = componentResource(comp).getActiveName();
      const cfg = readComponentConfig(comp, activeName);
      if (cfg) resolvedConfigs[comp] = { ...cfg, _fileName: activeName };
    }

    // One sync after all component production pointers are flipped so the
    // tokens.css component-alias block lands in a single write.
    syncComponentsToCss();

    manifestsResource.setActiveName(fileName);

    jsonResponse(res, 200, {
      ok: true,
      manifest: { ...manifest, _fileName: fileName },
      theme: themeData,
      componentConfigs: resolvedConfigs,
    });
  }

  /**
   * Export a manifest as a self-contained `ManifestBundle` for sharing.
   * Reads the manifest, inlines the referenced theme and every non-default
   * component config, returns the bundle as JSON with a `Content-Disposition`
   * attachment header so browsers save rather than display.
   *
   * Defaults are NOT inlined — the receiver's local default.json is the
   * live-tokens package's canonical default. `liveTokensVersion` lets the
   * UI warn on compatibility drift in a future iteration.
   * See temp/manifest-robustness-plan.md §11.
   */
  async function handleExportManifest({ params, res }: any) {
    const [fileName] = params;
    const manifestPath = manifestsResource.filePath(fileName);
    if (!fs.existsSync(manifestPath)) {
      jsonResponse(res, 404, { error: 'Manifest not found' });
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const themeName = sanitizeFileName(manifest.theme || 'default');
    const themePath = themesResource.filePath(themeName);
    if (!fs.existsSync(themePath)) {
      jsonResponse(res, 422, { error: `Manifest references missing theme: ${themeName}` });
      return;
    }
    const theme = JSON.parse(fs.readFileSync(themePath, 'utf-8'));

    const knownComponents = new Set(listComponentNames());
    const componentConfigs: Record<string, any> = {};
    for (const [comp, configFile] of Object.entries(manifest.componentConfigs ?? {})) {
      if (!knownComponents.has(comp)) continue;
      const sanitized = sanitizeFileName(String(configFile) || 'default');
      if (sanitized === 'default') continue; // receiver uses their own default
      const cfgPath = componentResource(comp).filePath(sanitized);
      if (!fs.existsSync(cfgPath)) {
        jsonResponse(res, 422, {
          error: `Manifest references missing config: ${comp}/${sanitized}`,
        });
        return;
      }
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      componentConfigs[`${comp}/${sanitized}`] = cfg;
    }

    const bundle = {
      kind: 'manifest-bundle' as const,
      schemaVersion: 1 as const,
      liveTokensVersion: PKG_VERSION,
      exportedAt: new Date().toISOString(),
      manifest,
      theme,
      componentConfigs,
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}.bundle.json"`,
    );
    res.end(JSON.stringify(bundle, null, 2));
  }

  /**
   * Bind `nextAvailableName` (pure, in `./files/nameAllocator`) to a
   * resource's filesystem layout: sanitise the base and check fs.existsSync
   * for each candidate. Used by the import handler when a bundle's referenced
   * name collides with an existing file.
   */
  function nextAvailableName(
    resourceFilePath: (name: string) => string,
    baseName: string,
  ): string {
    return allocNextAvailableName(
      (n) => fs.existsSync(resourceFilePath(n)),
      sanitizeFileName(baseName),
    );
  }

  /**
   * Import a `ManifestBundle`: materialise the inlined theme + component
   * configs to disk under fresh (collision-renamed) names, rewrite the
   * manifest's pointers to match, and write the resulting manifest. Returns
   * the final manifest filename plus a rename map so the UI can surface
   * what got renamed. Does not auto-apply — user clicks Load on the new row.
   *
   * Collision policy: rename with `-2` / `-3` suffixes (see
   * temp/manifest-robustness-plan.md §11 for rationale).
   */
  async function handleImportManifest({ req, res }: any) {
    let bundle: any;
    try {
      bundle = JSON.parse(await readBody(req));
    } catch {
      jsonResponse(res, 400, { error: 'Body is not valid JSON' });
      return;
    }
    if (!bundle || bundle.kind !== 'manifest-bundle') {
      jsonResponse(res, 400, {
        error: 'Not a manifest bundle (kind discriminator missing or wrong)',
      });
      return;
    }
    if (bundle.schemaVersion !== 1) {
      jsonResponse(res, 400, {
        error: `Unsupported bundle schemaVersion: ${bundle.schemaVersion}`,
      });
      return;
    }
    if (!bundle.manifest || !bundle.theme || !bundle.componentConfigs) {
      jsonResponse(res, 400, { error: 'Bundle missing manifest / theme / componentConfigs' });
      return;
    }

    const renames: Record<string, string> = {};
    const now = new Date().toISOString();

    // Theme: write under a fresh name if the requested one is taken.
    const originalThemeName = sanitizeFileName(bundle.manifest.theme || 'default');
    const finalThemeName = nextAvailableName(
      (n) => themesResource.filePath(n),
      originalThemeName,
    );
    if (finalThemeName !== originalThemeName) {
      renames[`theme:${originalThemeName}`] = finalThemeName;
    }
    const themeBody = { ...bundle.theme };
    themeBody.updatedAt = now;
    if (!themeBody.createdAt) themeBody.createdAt = now;
    themesResource.ensureDir();
    fs.writeFileSync(themesResource.filePath(finalThemeName), JSON.stringify(themeBody, null, 2));

    // Component configs: each `${comp}/${name}` entry. Skip unknown
    // components silently — the bundle may reference one the receiver doesn't
    // ship (different live-tokens version).
    const knownComponents = new Set(listComponentNames());
    const componentRenames: Record<string, string> = {}; // `${comp}/${originalName}` → finalName
    for (const [key, cfgValue] of Object.entries(bundle.componentConfigs)) {
      const [comp, originalName] = key.split('/');
      if (!comp || !originalName) continue;
      if (!knownComponents.has(comp)) continue;
      const r = componentResource(comp);
      const finalName = nextAvailableName(
        (n) => r.filePath(n),
        originalName,
      );
      if (finalName !== originalName) {
        renames[`componentConfig:${comp}/${originalName}`] = finalName;
      }
      componentRenames[`${comp}/${originalName}`] = finalName;
      const cfgBody: any = { ...(cfgValue as any) };
      cfgBody.component = comp;
      cfgBody.name = finalName;
      cfgBody.updatedAt = now;
      if (!cfgBody.createdAt) cfgBody.createdAt = now;
      r.ensureDir();
      fs.writeFileSync(r.filePath(finalName), JSON.stringify(cfgBody, null, 2));
    }

    // Rewrite the manifest's pointers through the rename maps and write the
    // manifest under its own fresh name.
    const rewrittenManifest: Record<string, any> = {
      ...bundle.manifest,
      theme: finalThemeName,
      componentConfigs: {} as Record<string, string>,
    };
    for (const [comp, configName] of Object.entries(bundle.manifest.componentConfigs ?? {})) {
      const original = String(configName);
      if (original === 'default') {
        rewrittenManifest.componentConfigs[comp] = 'default';
        continue;
      }
      const finalName = componentRenames[`${comp}/${original}`] ?? original;
      rewrittenManifest.componentConfigs[comp] = finalName;
    }
    rewrittenManifest.updatedAt = now;
    if (!rewrittenManifest.createdAt) rewrittenManifest.createdAt = now;

    const originalManifestName = sanitizeFileName(bundle.manifest.name || 'imported');
    const finalManifestName = nextAvailableName(
      (n) => manifestsResource.filePath(n),
      originalManifestName,
    );
    if (finalManifestName !== originalManifestName) {
      renames[`manifest:${originalManifestName}`] = finalManifestName;
    }
    manifestsResource.ensureDir();
    fs.writeFileSync(
      manifestsResource.filePath(finalManifestName),
      JSON.stringify(rewrittenManifest, null, 2),
    );

    jsonResponse(res, 200, {
      ok: true,
      manifest: finalManifestName,
      renames,
    });
  }

  // ── Method-not-allowed shims ─────────────────────────────────────────────
  // Routes that match the URL pattern but were called with the wrong method
  // need to return 405 instead of falling through to next(). We register a
  // catch-all 405 route per pattern after the real handlers.

  function methodNotAllowed({ res }: any) {
    jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  // Build the route table. ORDER MATTERS:
  //   1. The active/production patterns must precede COMP_BY_NAME_REGEX so
  //      `/api/component-configs/button/active` doesn't match `:comp/:name`
  //      with `name='active'`.
  //   2. COMP_LIST_REGEX (`/api/component-configs/:comp`) must come after the
  //      :comp/:name routes because the latter is more specific.
  const routes: Route[] = [
    // Themes — list / active / production are exact strings, must run before THEME_BY_NAME_REGEX
    { method: 'GET',    pattern: THEMES_ROUTE,            handler: handleListThemes },
    { method: 'GET',    pattern: THEMES_ACTIVE_ROUTE,     handler: handleGetActiveTheme },
    { method: 'PUT',    pattern: THEMES_ACTIVE_ROUTE,     handler: handleSetActiveTheme },
    { method: 'GET',    pattern: THEMES_PRODUCTION_ROUTE, handler: handleGetProductionTheme },
    { method: 'PUT',    pattern: THEMES_PRODUCTION_ROUTE, handler: handleSetProductionTheme },

    // Component configs — list of components
    { method: 'GET',    pattern: COMPONENT_CONFIGS_ROUTE, handler: handleListComponents },

    // Component configs — :comp/active (must precede :comp/:name)
    { method: 'GET',    pattern: COMP_ACTIVE_REGEX,       handler: handleGetComponentActive },
    { method: 'PUT',    pattern: COMP_ACTIVE_REGEX,       handler: handleSetComponentActive },
    { method: 'POST',   pattern: COMP_ACTIVE_REGEX,       handler: methodNotAllowed },
    { method: 'DELETE', pattern: COMP_ACTIVE_REGEX,       handler: methodNotAllowed },

    // Component configs — :comp/production (must precede :comp/:name)
    { method: 'GET',    pattern: COMP_PRODUCTION_REGEX,   handler: handleGetComponentProduction },
    { method: 'PUT',    pattern: COMP_PRODUCTION_REGEX,   handler: handleSetComponentProduction },
    { method: 'POST',   pattern: COMP_PRODUCTION_REGEX,   handler: methodNotAllowed },
    { method: 'DELETE', pattern: COMP_PRODUCTION_REGEX,   handler: methodNotAllowed },

    // Component configs — :comp/:name (must precede :comp listing)
    { method: 'GET',    pattern: COMP_BY_NAME_REGEX,      handler: handleComponentConfigByName },
    { method: 'PUT',    pattern: COMP_BY_NAME_REGEX,      handler: handleComponentConfigByName },
    { method: 'DELETE', pattern: COMP_BY_NAME_REGEX,      handler: handleComponentConfigByName },
    { method: 'POST',   pattern: COMP_BY_NAME_REGEX,      handler: methodNotAllowed },

    // Component configs — list configs for :comp (broadest, runs last among comp routes)
    { method: 'GET',    pattern: COMP_LIST_REGEX,         handler: handleListComponentConfigs },

    // Themes — :name CRUD (broadest theme route, runs last)
    { method: 'GET',    pattern: THEME_BY_NAME_REGEX,     handler: handleThemeByName },
    { method: 'PUT',    pattern: THEME_BY_NAME_REGEX,     handler: handleThemeByName },
    { method: 'DELETE', pattern: THEME_BY_NAME_REGEX,     handler: handleThemeByName },

    // Manifests — list / active are exact strings, must run before regexes
    { method: 'GET',    pattern: MANIFESTS_ROUTE,         handler: handleListManifests },
    { method: 'GET',    pattern: MANIFESTS_ACTIVE_ROUTE,  handler: handleGetActiveManifest },
    { method: 'PUT',    pattern: MANIFESTS_ACTIVE_ROUTE,  handler: handleSetActiveManifest },

    // Manifests — exact import route runs before :name regexes
    { method: 'POST',   pattern: MANIFEST_IMPORT_ROUTE,   handler: handleImportManifest },
    { method: 'PUT',    pattern: MANIFEST_IMPORT_ROUTE,   handler: methodNotAllowed },
    { method: 'GET',    pattern: MANIFEST_IMPORT_ROUTE,   handler: methodNotAllowed },
    { method: 'DELETE', pattern: MANIFEST_IMPORT_ROUTE,   handler: methodNotAllowed },

    // Manifests — :name/apply (more specific than :name)
    { method: 'PUT',    pattern: MANIFEST_APPLY_REGEX,    handler: handleApplyManifest },
    { method: 'POST',   pattern: MANIFEST_APPLY_REGEX,    handler: methodNotAllowed },
    { method: 'GET',    pattern: MANIFEST_APPLY_REGEX,    handler: methodNotAllowed },
    { method: 'DELETE', pattern: MANIFEST_APPLY_REGEX,    handler: methodNotAllowed },

    // Manifests — :name/export (more specific than :name)
    { method: 'GET',    pattern: MANIFEST_EXPORT_REGEX,   handler: handleExportManifest },
    { method: 'PUT',    pattern: MANIFEST_EXPORT_REGEX,   handler: methodNotAllowed },
    { method: 'POST',   pattern: MANIFEST_EXPORT_REGEX,   handler: methodNotAllowed },
    { method: 'DELETE', pattern: MANIFEST_EXPORT_REGEX,   handler: methodNotAllowed },

    // Manifests — :name CRUD (broadest manifest route, runs last)
    { method: 'GET',    pattern: MANIFEST_BY_NAME_REGEX,  handler: handleManifestByName },
    { method: 'PUT',    pattern: MANIFEST_BY_NAME_REGEX,  handler: handleManifestByName },
    { method: 'DELETE', pattern: MANIFEST_BY_NAME_REGEX,  handler: handleManifestByName },
  ];

  return {
    name: 'theme-file-api',
    config() {
      // __PROJECT_ROOT__ powers the overlay's "Page Source" vscode:// links;
      // __APP_VERSION__ feeds the overlay's header version badge.
      return {
        define: {
          __PROJECT_ROOT__: JSON.stringify(process.cwd()),
          __APP_VERSION__: JSON.stringify(PKG_VERSION),
        },
      };
    },
    configureServer(server) {
      ensureThemesDir();
      ensureComponentConfigsDir();
      ensureManifestsDir();
      // Make sure the editor-owned sidecar exists and reflects current
      // production state before the first request lands. Without this, a
      // fresh checkout would import a stale (or missing) generated file.
      regenerateTokensCss();

      server.middlewares.use(async (req, res, next) => {
        const handled = await dispatch(req, res, routes);
        if (!handled) next();
      });
    },
    handleHotUpdate(ctx) {
      // When a component source file changes, regenerate its default.json.
      // The editor's componentConfigService picks up the new defaults on its
      // next fetch; a full reload is not required since runtime state owns
      // the override layer.
      const normalized = path.resolve(ctx.file);
      if (!normalized.startsWith(COMPONENTS_SRC_DIR)) return;
      if (!normalized.endsWith('.svelte')) return;
      const comp = componentNameFromFile(normalized);
      generateDefaultConfig(comp, normalized);
    },
  };
}
