/**
 * Allocate a name that doesn't collide with an existing one. Tries `baseName`,
 * then `baseName-2`, `baseName-3`, etc. Caller supplies the existence predicate
 * (fs.existsSync wrapped against a specific resource's filePath, in practice).
 *
 * Used by the manifest-import path to materialise bundle files without
 * overwriting the receiver's local theme / component configs / manifest.
 * See temp/manifest-robustness-plan.md §11.
 */
export function nextAvailableName(
  exists: (name: string) => boolean,
  baseName: string,
  maxAttempts = 1000,
): string {
  if (!exists(baseName)) return baseName;
  for (let i = 2; i < maxAttempts; i++) {
    const candidate = `${baseName}-${i}`;
    if (!exists(candidate)) return candidate;
  }
  throw new Error(`Could not allocate a non-colliding name for "${baseName}"`);
}
