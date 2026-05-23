import type { ComponentSection } from './componentSectionType';
import { componentRegistryEntries } from '../registry';

/**
 * Default editor sections — derived from the single component registry. Each
 * section's `id` is the canonical lowercase component id (matches the runtime
 * filename, server scan, and `setComponentAlias` key); `label` is the
 * display string; `component` is the editor Svelte component.
 *
 * To add or reorder sections, edit `src/component-editor/registry.ts`.
 */
export const defaultSections: ComponentSection[] = componentRegistryEntries.map((entry) => ({
  id: entry.id,
  label: entry.label,
  component: entry.editorComponent,
}));
