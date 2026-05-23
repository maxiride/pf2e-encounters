/**
 * Client-side REST helpers for any "versioned file resource" — a class of
 * editable artifact whose lifecycle mirrors the theme files: list / load /
 * save / delete + an active pointer + a production pointer.
 *
 * `themeService.ts` and `componentConfigService.ts` previously reimplemented
 * the same fetch shape. They now both consume `versionedFileResource(...)`
 * with their resource-specific URL.
 *
 * Pure URL construction + fetch — no DOM, no filesystem, safe for any browser
 * or test harness that has a `fetch` global.
 */

export interface VersionedFileResourceClientOptions {
  /** REST endpoint root, e.g. `/api/themes` or `/api/component-configs/button`. */
  baseUrl: string;
}

export interface VersionedFileResourceClient<TItem, TMeta, TProductionInfo> {
  list(): Promise<{ files: TMeta[]; activeFile?: string; productionFile?: string }>;
  load(fileName: string): Promise<TItem>;
  save(fileName: string, data: TItem): Promise<void>;
  remove(fileName: string): Promise<void>;
  getActive(): Promise<TItem | null>;
  setActive(fileName: string): Promise<void>;
  getProductionInfo(): Promise<TProductionInfo>;
  setProduction(fileName: string): Promise<TProductionInfo & { ok: boolean }>;
}

/**
 * Build a CRUD client bound to a single resource root. All routes follow the
 * same shape:
 *   GET    {base}                         → list
 *   GET    {base}/:name                   → load
 *   PUT    {base}/:name                   → save
 *   DELETE {base}/:name                   → delete
 *   GET    {base}/active                  → load active
 *   PUT    {base}/active   {name}         → set active
 *   GET    {base}/production              → production info
 *   PUT    {base}/production {name}       → set production
 *
 * Generic over the payload types so theme & component-config can share the
 * same plumbing while keeping their own response/info shapes.
 */
export function versionedFileResource<TItem, TMeta, TProductionInfo>(
  opts: VersionedFileResourceClientOptions,
): VersionedFileResourceClient<TItem, TMeta, TProductionInfo> {
  const { baseUrl } = opts;

  async function readJsonError(res: Response, fallback: string): Promise<string> {
    const err = await res.json().catch(() => ({ error: fallback }));
    return err.error || fallback;
  }

  async function list(): Promise<{ files: TMeta[]; activeFile?: string; productionFile?: string }> {
    const res = await fetch(baseUrl);
    if (!res.ok) throw new Error(`Failed to list ${baseUrl}`);
    return res.json();
  }

  async function load(fileName: string): Promise<TItem> {
    const res = await fetch(`${baseUrl}/${encodeURIComponent(fileName)}`);
    if (!res.ok) throw new Error(`Failed to load: ${fileName}`);
    return res.json();
  }

  async function save(fileName: string, data: TItem): Promise<void> {
    const res = await fetch(`${baseUrl}/${encodeURIComponent(fileName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await readJsonError(res, 'Save failed'));
    }
  }

  async function remove(fileName: string): Promise<void> {
    const res = await fetch(`${baseUrl}/${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(await readJsonError(res, 'Delete failed'));
    }
  }

  async function getActive(): Promise<TItem | null> {
    try {
      const res = await fetch(`${baseUrl}/active`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async function setActive(fileName: string): Promise<void> {
    const res = await fetch(`${baseUrl}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fileName }),
    });
    if (!res.ok) {
      throw new Error(await readJsonError(res, 'Set active failed'));
    }
  }

  async function getProductionInfo(): Promise<TProductionInfo> {
    const res = await fetch(`${baseUrl}/production`);
    if (!res.ok) throw new Error('Failed to get production info');
    return res.json();
  }

  async function setProduction(fileName: string): Promise<TProductionInfo & { ok: boolean }> {
    const res = await fetch(`${baseUrl}/production`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fileName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.error || 'Set production failed') as Error & {
        status?: number;
        code?: string;
      };
      err.status = res.status;
      if (body.code) err.code = body.code;
      throw err;
    }
    return res.json();
  }

  return { list, load, save, remove, getActive, setActive, getProductionInfo, setProduction };
}

/** Sanitize a display name to a safe file name. Pure — no DOM, no fs. */
export function sanitizeFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'unnamed'
  );
}
