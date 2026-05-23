let prefix = 'lt-';

export function configureEditor(opts: { storagePrefix?: string }) {
  if (opts.storagePrefix) prefix = opts.storagePrefix;
}

export function storageKey(name: string): string {
  return `${prefix}${name}`;
}
