import { undo, redo } from './editorStore';

/**
 * Install Cmd/Ctrl+Z → undo and Cmd/Ctrl+Shift+Z → redo.
 *
 * Native browser text-undo inside inputs / textareas / contenteditable is
 * left intact: those targets are passed through untouched. Editor undo fires
 * only when focus is outside editable elements.
 *
 * Scope this installer to the pages where the editor is actually mounted
 * (Editor.svelte) so Cmd+Z on the landing / component-editor pages isn't hijacked.
 *
 * Returns a cleanup function (use in Svelte's onMount return).
 */
export function installEditorKeybindings(): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('keydown', handleKeydown);
  return () => window.removeEventListener('keydown', handleKeydown);
}

function handleKeydown(e: KeyboardEvent): void {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return;
  if (e.key !== 'z' && e.key !== 'Z') return;

  const target = e.target as HTMLElement | null;
  if (target && isEditable(target)) return;

  e.preventDefault();
  if (e.shiftKey) redo();
  else undo();
}

// Input types whose native Cmd+Z editing we want to preserve. Everything
// else (range, checkbox, radio, button, color, etc.) has no meaningful
// native undo — passing the event through would mean editor undo silently
// does nothing whenever a slider or checkbox has focus.
const TEXT_INPUT_TYPES = new Set([
  'text', 'search', 'email', 'url', 'tel', 'password', 'number',
  'date', 'datetime-local', 'month', 'time', 'week',
]);

function isEditable(el: HTMLElement): boolean {
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
    return TEXT_INPUT_TYPES.has(type);
  }
  return el.isContentEditable;
}
