import { componentRegistry } from '../registry';

/**
 * Resolve a component id to its runtime source file path. Reads from the
 * single component registry — no parallel mapping to maintain.
 */
export function componentSourceFile(component: string): string {
  return componentRegistry[component as keyof typeof componentRegistry]?.sourceFile ?? '';
}
