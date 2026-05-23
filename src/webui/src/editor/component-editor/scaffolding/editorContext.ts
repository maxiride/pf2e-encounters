import { getContext, setContext } from 'svelte';
import { writable, type Writable, type Readable } from 'svelte/store';

const KEY = Symbol('editor-context');

export type VariantOption = { value: string; label: string };

export type EditorContext = {
  /** Per-variable rank for TokenLayout row alignment; null when no linked block. */
  linkedOrder: Readable<Map<string, number> | null>;
  /** Focused preview variant when siblings exist. */
  focusedVariant: Writable<string | null>;
  /** Variants for this editor; empty when single-variant. Focused VariantGroup renders the tab strip itself. */
  variants: Readable<VariantOption[]>;
  /** Cross-group state-tab hint; VariantGroups whose stateNames contain it adopt as activeTab. */
  focusedState: Writable<string | null>;
  /** Hovered variable in Properties grid or Linked block; bidirectional highlight. */
  hoveredLinkedVariable: Writable<string | null>;
  /** Copy-from "Preserve color families" toggle, scoped to this editor. Lives
      on context (not local to CopyFromMenu) so it survives VariantGroup remounts
      when the user changes which variant is focused. */
  preserveColorFamily: Writable<boolean>;
};

/** Mutable handle for ComponentEditorBase. */
export type EditorContextInternal = EditorContext & {
  _linkedOrder: Writable<Map<string, number> | null>;
  _variants: Writable<VariantOption[]>;
};

export function createEditorContext(): EditorContextInternal {
  const _linkedOrder = writable<Map<string, number> | null>(null);
  const _variants = writable<VariantOption[]>([]);
  const focusedVariant = writable<string | null>(null);
  const focusedState = writable<string | null>(null);
  const hoveredLinkedVariable = writable<string | null>(null);
  const preserveColorFamily = writable<boolean>(false);
  const ctx: EditorContextInternal = {
    linkedOrder: _linkedOrder,
    focusedVariant,
    variants: _variants,
    focusedState,
    hoveredLinkedVariable,
    preserveColorFamily,
    _linkedOrder,
    _variants,
  };
  setContext(KEY, ctx);
  return ctx;
}

export function getEditorContext(): EditorContext | undefined {
  return getContext(KEY);
}
