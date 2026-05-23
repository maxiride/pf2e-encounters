import { writable, type Readable } from 'svelte/store';
import { route } from './router';

// Parent-window route, viewable from inside the editor iframe. Mirrors the
// host page's route via postMessage from LiveEditorOverlay. When not in an
// iframe, falls through to the local route store.

const MSG_TYPE = 'lt:parent-route';

function buildStore(): Readable<string> {
  if (typeof window === 'undefined') return route;
  if (window.parent === window) return route;

  const inner = writable<string>('/');

  // Best-effort initial read (same-origin in dev).
  try {
    inner.set(window.parent.location.pathname || '/');
  } catch {
    // cross-origin or sandboxed — wait for the first postMessage instead
  }

  window.addEventListener('message', (e: MessageEvent) => {
    const data = e.data;
    if (data && typeof data === 'object' && data.type === MSG_TYPE && typeof data.path === 'string') {
      inner.set(data.path);
    }
  });

  return inner;
}

export const parentRoute: Readable<string> = buildStore();

export function postParentRoute(target: Window | null | undefined, path: string): void {
  if (!target) return;
  try {
    target.postMessage({ type: MSG_TYPE, path }, '*');
  } catch {
    // ignore — iframe may not be ready yet
  }
}
