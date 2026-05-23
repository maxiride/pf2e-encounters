/**
 * Central CSS custom-property writer.
 *
 * Writes to document.documentElement and — when running inside a same-origin
 * iframe (the live-preview overlay) — also writes to
 * window.parent.document.documentElement. This lets the overlay editor at
 * /editor drive the host site's :root in real time without any message-passing
 * infrastructure.
 *
 * When the editor runs standalone at /editor (not inside the overlay iframe),
 * parentRoot is null and every call is a plain single-root write.
 *
 * Roots are resolved lazily — `init()` (or any setter call) populates them on
 * first use so importing this module does not touch the DOM. This keeps the
 * library importable from SSR / test harnesses and decouples consumers from
 * module-load ordering.
 */

let selfRoot: HTMLElement | null = null;
let parentRoot: HTMLElement | null = null;
let resolved = false;

function resolveParentRoot(): HTMLElement | null {
  if (typeof window === 'undefined') return null;
  try {
    if (window.parent !== window && window.parent?.document) {
      return window.parent.document.documentElement;
    }
  } catch {
    // Cross-origin parent — not expected in dev, but be defensive.
  }
  return null;
}

function ensureResolved(): void {
  if (resolved) return;
  resolved = true;
  selfRoot = typeof document !== 'undefined' ? document.documentElement : null;
  parentRoot = resolveParentRoot();
}

/**
 * Idempotent host hook — call once during boot to eagerly resolve the self
 * and parent document roots. Optional in practice (any setter call resolves
 * lazily), but explicit init makes ordering legible.
 */
export function init(): void {
  ensureResolved();
}

/**
 * Return the self and parent document heads as a tuple, with parent omitted
 * when not in an iframe. Consumers that need to mirror node injection (not
 * just style properties) can iterate this list.
 */
export function getSyncedDocuments(): Document[] {
  ensureResolved();
  if (typeof document === 'undefined') return [];
  const docs: Document[] = [document];
  if (parentRoot && parentRoot.ownerDocument && parentRoot.ownerDocument !== document) {
    docs.push(parentRoot.ownerDocument);
  }
  return docs;
}

export const CSS_VAR_CHANGE_EVENT = 'cssvar:change';

function notifyChange(name: string): void {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new CustomEvent(CSS_VAR_CHANGE_EVENT, { detail: { name } }));
}

export function setCssVar(name: string, value: string): void {
  ensureResolved();
  selfRoot?.style.setProperty(name, value);
  parentRoot?.style.setProperty(name, value);
  notifyChange(name);
}

export function removeCssVar(name: string): void {
  ensureResolved();
  selfRoot?.style.removeProperty(name);
  parentRoot?.style.removeProperty(name);
  notifyChange(name);
}

/** Apply a map of CSS variables to :root (and the parent :root when in an iframe). */
export function applyCssVariables(variables: Record<string, string>): void {
  for (const [name, value] of Object.entries(variables)) {
    setCssVar(name, value);
  }
}

/** Remove all inline CSS custom properties from :root on both self and parent. */
export function clearAllCssVarOverrides(): void {
  ensureResolved();
  if (selfRoot) clearRoot(selfRoot);
  if (parentRoot) clearRoot(parentRoot);
}

function clearRoot(el: HTMLElement): void {
  const style = el.style;
  const names: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const name = style[i];
    if (name.startsWith('--')) names.push(name);
  }
  for (const name of names) style.removeProperty(name);
}

/** Scrape all inline CSS custom properties currently on self :root. */
export function scrapeCssVariables(): Record<string, string> {
  ensureResolved();
  if (!selfRoot) return {};
  const style = selfRoot.style;
  const variables: Record<string, string> = {};
  for (let i = 0; i < style.length; i++) {
    const name = style[i];
    if (name.startsWith('--')) {
      variables[name] = style.getPropertyValue(name).trim();
    }
  }
  return variables;
}
