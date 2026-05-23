import { writable } from 'svelte/store';
import { storageKey } from '../core/store/editorConfig';
import { quietGet, quietSet } from '../core/storage/storage';

function getStorageKey(): string {
  return storageKey('columns-visible');
}

export const columnsVisible = writable<boolean>(false);

export function toggleColumns() {
  columnsVisible.update((v) => !v);
}

let initialised = false;

/**
 * Idempotent host hook — call once during boot to hydrate the column-visibility
 * store from localStorage and start persisting future writes. Importing the
 * module no longer subscribes-then-persists, so SSR / test harnesses can pull
 * `columnsVisible` without DOM/storage access.
 */
export function init(): void {
  if (initialised) return;
  initialised = true;
  columnsVisible.set(quietGet(getStorageKey()) === '1');
  columnsVisible.subscribe((v) => {
    quietSet(getStorageKey(), v ? '1' : '0');
  });
}
