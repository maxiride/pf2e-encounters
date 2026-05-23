import { writable } from 'svelte/store';

/** The file name of the currently active token file. */
export const activeFileName = writable<string>('default');
