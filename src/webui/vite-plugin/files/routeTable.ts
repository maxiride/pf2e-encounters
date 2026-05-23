/**
 * Tiny route-table dispatcher for the dev-server middleware.
 *
 * Replaces ~14 inline `if (url === X && req.method === Y) { try { … } catch
 * (err) { 500 } return; }` blocks with a single ordered table:
 *
 *   [
 *     { method: 'GET',    pattern: '/api/themes',        handler: ... },
 *     { method: 'PUT',    pattern: COMP_ACTIVE_REGEX,    handler: ... },
 *     // … COMP_ACTIVE_REGEX must come before COMP_BY_NAME_REGEX —
 *     // explicit table ordering, not a comment-warning.
 *   ]
 *
 * `dispatch` walks the table, runs the first match, and centralises the
 * 500-on-throw catch in one place. Handlers can throw; they don't all need
 * their own try/catch.
 */

export type Method = 'GET' | 'PUT' | 'POST' | 'DELETE';

export interface RouteContext {
  /** The matched URL — equal to `req.url`. */
  url: string;
  /** Capture groups when `pattern` is a RegExp; empty array for string patterns. */
  params: string[];
  req: any;
  res: any;
}

export type RouteHandler = (ctx: RouteContext) => void | Promise<void>;

export interface Route {
  method: Method;
  /** String for exact-match (`url === pattern`) or RegExp tested with `url.match(pattern)`. */
  pattern: string | RegExp;
  handler: RouteHandler;
}

/**
 * Walk `routes` in order; run the first method+pattern match. Returns `true`
 * if a route handled the request (and the caller should NOT call `next()`),
 * `false` if no route matched.
 *
 * Throws are converted to a JSON 500 with `err.message`. This centralises the
 * cargo-cult per-handler try/catch.
 */
export async function dispatch(req: any, res: any, routes: Route[]): Promise<boolean> {
  const url: string = req.url || '';
  const method: string = req.method || 'GET';

  for (const route of routes) {
    if (route.method !== method) continue;

    let params: string[] = [];
    if (typeof route.pattern === 'string') {
      if (url !== route.pattern) continue;
    } else {
      const m = url.match(route.pattern);
      if (!m) continue;
      // m[0] is the full match — handlers want the capture groups.
      params = m.slice(1);
    }

    try {
      await route.handler({ url, params, req, res });
    } catch (err: any) {
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err?.message ?? 'Internal error' }));
      }
    }
    return true;
  }

  return false;
}
