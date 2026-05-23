/**
 * Helpers for operations that are *intentionally* allowed to fail silently:
 * boot-time storage reads, debounced storage writes, and dev-server fetches.
 *
 * Naming the silence ("quietGet", "quietSet", "safeFetch") communicates intent
 * better than scattered `try { ... } catch {}` blocks, where the empty catch
 * leaves it ambiguous whether the author considered the failure mode or just
 * copied a nearby pattern.
 */

interface QuietGetOptions {
  /** When true, the stored string is parsed as JSON. Parse failures return null. */
  parse?: boolean;
}

/**
 * Read a value from `localStorage`. Returns `null` on:
 * - Missing key
 * - Storage unavailable (private/incognito mode, quota, browser disabled)
 * - JSON parse failure (when `parse: true`)
 *
 * Boot-time hydrate paths can call this without a try/catch and trust that
 * a fresh-boot fallback will be used when storage isn't reachable.
 */
export function quietGet<T = string>(
  key: string,
  opts?: QuietGetOptions,
): T | string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    if (opts?.parse) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    }
    return raw;
  } catch {
    return null;
  }
}

/**
 * Write a value to `localStorage`. Returns `true` on success, `false` if
 * storage was unavailable or the write failed (quota, security errors).
 *
 * Callers that want to know whether the write landed can branch on the
 * return value; callers that don't care can ignore it.
 */
export function quietSet(key: string, value: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch a JSON resource. Returns `null` on:
 * - Network failure (offline, dev-server not running)
 * - Non-2xx response
 * - JSON parse failure
 *
 * Used for boot-time API calls where the editor must continue working even
 * if the dev-server's themeFileApi (or component-config endpoints) is not
 * available — the caller falls through to defaults.
 */
export async function safeFetch<T = unknown>(
  url: string,
  opts?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}
