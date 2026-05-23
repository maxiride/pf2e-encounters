import type {
  FontFamily,
  FontSource,
  FontStack,
  FontStackSlot,
  FontStackVariable,
  SystemCascadePreset,
} from '../themes/themeTypes';
import { setCssVar, getSyncedDocuments } from '../cssVarSync';

export const SYSTEM_CASCADES: Record<SystemCascadePreset, string> = {
  'system-ui-sans':
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  'system-ui-serif': 'Georgia, "Times New Roman", serif',
  'system-ui-mono': 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

const LINK_ATTR = 'data-font-source-id';
const STYLE_ATTR = 'data-font-source-id';

function syncedHeads(): HTMLHeadElement[] {
  return getSyncedDocuments().map((d) => d.head);
}

function findExistingNode(head: HTMLHeadElement, sourceId: string): Element | null {
  return head.querySelector(`[${LINK_ATTR}="${CSS.escape(sourceId)}"]`);
}

function buildNodeFor(source: FontSource, doc: Document): Element | null {
  if (source.kind === 'font-face') {
    if (!source.cssText) return null;
    const style = doc.createElement('style');
    style.setAttribute(STYLE_ATTR, source.id);
    style.textContent = source.cssText;
    return style;
  }
  if (!source.url) return null;
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = source.url;
  link.setAttribute(LINK_ATTR, source.id);
  return link;
}

/**
 * Inject/update <link>/<style> elements in <head> (and parent <head> when in
 * an iframe) to match the given sources. Existing nodes are diffed by id so
 * repeated calls don't thrash the DOM. Sources present in the DOM but absent
 * from the list are removed.
 */
export function applyFontSources(sources: FontSource[]): void {
  const wanted = new Map(sources.map((s) => [s.id, s]));
  for (const head of syncedHeads()) {
    const existing = head.querySelectorAll(`[${LINK_ATTR}]`);
    const seen = new Set<string>();
    existing.forEach((node) => {
      const id = node.getAttribute(LINK_ATTR);
      if (!id) return;
      const next = wanted.get(id);
      if (!next) {
        node.remove();
        return;
      }
      seen.add(id);
      if (next.kind === 'font-face') {
        if (node.tagName !== 'STYLE' || node.textContent !== (next.cssText ?? '')) {
          node.remove();
          const replacement = buildNodeFor(next, head.ownerDocument!);
          if (replacement) head.appendChild(replacement);
        }
      } else {
        if (node.tagName !== 'LINK' || (node as HTMLLinkElement).href !== (next.url ?? '')) {
          node.remove();
          const replacement = buildNodeFor(next, head.ownerDocument!);
          if (replacement) head.appendChild(replacement);
        }
      }
    });
    for (const [id, source] of wanted) {
      if (seen.has(id)) continue;
      const node = buildNodeFor(source, head.ownerDocument!);
      if (node) head.appendChild(node);
    }
  }
}

function resolveSlot(slot: FontStackSlot, familyById: Map<string, FontFamily>): string | null {
  if (slot.kind === 'project') {
    const fam = familyById.get(slot.familyId);
    return fam ? fam.cssName : null;
  }
  if (slot.kind === 'system') return SYSTEM_CASCADES[slot.preset];
  return slot.value;
}

/**
 * Resolve a fontStacks list to a flat var-name → css-value map. Exported so
 * callers (e.g. the stack editor) can preview composed values without writing.
 */
export function resolveFontStackValues(
  stacks: FontStack[],
  sources: FontSource[],
): Record<FontStackVariable, string> {
  const familyById = new Map<string, FontFamily>();
  for (const src of sources) {
    for (const f of src.families) familyById.set(f.id, f);
  }
  const out: Partial<Record<FontStackVariable, string>> = {};
  for (const stack of stacks) {
    const parts: string[] = [];
    for (const slot of stack.slots) {
      const v = resolveSlot(slot, familyById);
      if (v) parts.push(v);
    }
    if (parts.length > 0) out[stack.variable] = parts.join(', ');
  }
  return out as Record<FontStackVariable, string>;
}

/**
 * Compose each stack into its resolved "family1, family2, ..." string and
 * write it to the matching --font-* variable on :root (and parent :root when
 * in an iframe) via the same pipeline used for color variables.
 */
export function applyFontStacks(stacks: FontStack[], sources: FontSource[]): void {
  const resolved = resolveFontStackValues(stacks, sources);
  for (const [name, value] of Object.entries(resolved)) {
    setCssVar(name, value);
  }
}
