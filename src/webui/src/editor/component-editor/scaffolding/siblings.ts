import type { Token, TypeGroupConfig } from './types';

export type Sibling = {
  name: string;
  label: string;
  states: Record<string, Token[]>;
  typeGroups?: Record<string, TypeGroupConfig[]>;
};

/** Build the `siblings` list a VariantGroup needs for its "Copy from" menu.
    Given the full variant list and per-variant state-map builders, returns
    every variant *except* `toVariant` shaped as a Sibling.

    `variantStates(v)` and `variantTypeGroups(v)` return the same shape the
    parent VariantGroup gets for its own `states` / `typeGroups` props — a map
    keyed by state name. For single-state-per-variant editors (Badge, Notification,
    ProgressBar), wrap the single-state builders inline:
      `(v) => ({ [v]: variantTokens(v) })`. */
export function buildSiblings<V extends string>(
  variants: readonly V[],
  toVariant: V,
  variantStates: (v: V) => Record<string, Token[]>,
  variantTypeGroups?: (v: V) => Record<string, TypeGroupConfig[]>,
): Sibling[] {
  return variants
    .filter((v) => v !== toVariant)
    .map((v) => ({
      name: v,
      label: v.charAt(0).toUpperCase() + v.slice(1),
      states: variantStates(v),
      typeGroups: variantTypeGroups ? variantTypeGroups(v) : undefined,
    }));
}
