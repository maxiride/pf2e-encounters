import { writable } from 'svelte/store';

export type EditorView = 'tokens' | 'components';
export type SidebarCondensed = boolean | 'auto';

const VIEW_KEY = 'lt.editorView';
const CONDENSED_KEY = 'lt.sidebarCondensed';

function readView(): EditorView {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'components' || v === 'tokens') return v;
  } catch {}
  return 'tokens';
}

function readCondensed(): SidebarCondensed {
  try {
    const v = localStorage.getItem(CONDENSED_KEY);
    if (v === 'true') return true;
    if (v === 'false') return false;
  } catch {}
  return 'auto';
}

export const editorView = writable<EditorView>(readView());
export const sidebarCondensed = writable<SidebarCondensed>(readCondensed());
export const selectedComponent = writable<string>('button');

editorView.subscribe((v) => {
  try { localStorage.setItem(VIEW_KEY, v); } catch {}
});

sidebarCondensed.subscribe((v) => {
  try { localStorage.setItem(CONDENSED_KEY, v === 'auto' ? 'auto' : String(v)); } catch {}
});

// Cross-window sync: parent and overlay iframe share localStorage but each have
// their own module state. `storage` events fire in the *other* window when one
// writes, so we mirror the new value into this window's store.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === VIEW_KEY) {
      if (e.newValue === 'tokens' || e.newValue === 'components') editorView.set(e.newValue);
    } else if (e.key === CONDENSED_KEY) {
      if (e.newValue === 'true') sidebarCondensed.set(true);
      else if (e.newValue === 'false') sidebarCondensed.set(false);
      else if (e.newValue === 'auto') sidebarCondensed.set('auto');
    }
  });
}

export function setEditorView(v: EditorView) {
  editorView.set(v);
}
