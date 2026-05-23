/**
 * Server-side filesystem helpers for any "versioned file resource" — a
 * directory of `.json` files with a paired `_active.json` and
 * `_production.json` pointer. Both `themes/` and `component-configs/{comp}/`
 * follow this exact shape; they previously had separate copies of the same
 * code.
 *
 * Pure Node (`fs`, `path`) — no Vite or Svelte coupling, so the tsup
 * ESM+CJS build bundles it cleanly.
 */
import fs from 'fs';
import path from 'path';

export interface VersionedFileResourceServerOptions {
  /** Absolute path to the directory holding the resource's `.json` files. */
  dir: string;
  /** Default name when `_active.json` / `_production.json` are missing. */
  defaultName?: string;
}

export interface VersionedFileResourceServer {
  readonly dir: string;
  readonly activePath: string;
  readonly productionPath: string;

  /** Create the directory (and pointer files) if missing. Pointer files default
   * to `defaultName`. */
  ensureDir(): void;
  /** Create the `_active.json` and `_production.json` pointer files if missing. */
  ensureMeta(): void;
  /** Resolve the path of a named file (`{name}.json`) inside `dir`. */
  filePath(name: string): string;
  /** Read the active-file pointer, or `defaultName` if missing/corrupt. */
  getActiveName(): string;
  /** Read the production-file pointer, or `defaultName` if missing/corrupt. */
  getProductionName(): string;
  /** Atomically write the active-file pointer. */
  setActiveName(name: string): void;
  /** Atomically write the production-file pointer. */
  setProductionName(name: string): void;
}

/**
 * Bind the helpers above to a single resource directory. The constructor is
 * pure — no filesystem touched until you call a method.
 */
export function versionedFileResourceServer(
  opts: VersionedFileResourceServerOptions,
): VersionedFileResourceServer {
  const dir = opts.dir;
  const activePath = path.join(dir, '_active.json');
  const productionPath = path.join(dir, '_production.json');
  const defaultName = opts.defaultName ?? 'default';

  function ensureDir(): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  function ensureMeta(): void {
    if (!fs.existsSync(activePath)) {
      fs.writeFileSync(activePath, JSON.stringify({ activeFile: defaultName }));
    }
    if (!fs.existsSync(productionPath)) {
      fs.writeFileSync(productionPath, JSON.stringify({ productionFile: defaultName }));
    }
  }

  function filePath(name: string): string {
    return path.join(dir, `${name}.json`);
  }

  function getActiveName(): string {
    try {
      const data = JSON.parse(fs.readFileSync(activePath, 'utf-8'));
      return data.activeFile || defaultName;
    } catch {
      return defaultName;
    }
  }

  function getProductionName(): string {
    try {
      const data = JSON.parse(fs.readFileSync(productionPath, 'utf-8'));
      return data.productionFile || defaultName;
    } catch {
      return defaultName;
    }
  }

  function setActiveName(name: string): void {
    fs.writeFileSync(activePath, JSON.stringify({ activeFile: name }));
  }

  function setProductionName(name: string): void {
    fs.writeFileSync(productionPath, JSON.stringify({ productionFile: name }));
  }

  return {
    dir,
    activePath,
    productionPath,
    ensureDir,
    ensureMeta,
    filePath,
    getActiveName,
    getProductionName,
    setActiveName,
    setProductionName,
  };
}
