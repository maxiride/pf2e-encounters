import type { Token, TypeGroupConfig } from './types';

/** The four font-shape properties on a TypeGroupConfig that share-block sharing
    targets. Order is the canonical render order and the groupKey order. */
export const TYPE_FONT_PROPS = [
  { key: 'familyVariable', label: 'font family', defaultGroupKey: 'font-family' },
  { key: 'sizeVariable', label: 'font size', defaultGroupKey: 'font-size' },
  { key: 'weightVariable', label: 'font weight', defaultGroupKey: 'font-weight' },
  { key: 'lineHeightVariable', label: 'line height', defaultGroupKey: 'line-height' },
  { key: 'letterSpacingVariable', label: 'letter spacing', defaultGroupKey: 'letter-spacing' },
] as const satisfies ReadonlyArray<{
  key: keyof TypeGroupConfig;
  label: string;
  defaultGroupKey: string;
}>;

export type TypeFontProp = typeof TYPE_FONT_PROPS[number];

export type BuildTypeGroupTokensOptions = {
  /** Override the default groupKey per property. Receives the prop descriptor and the
      type-group config it came from. Return a stable string — siblings sharing the same
      groupKey are linked in the linked block. */
  groupKeyFor?: (prop: TypeFontProp, group: TypeGroupConfig) => string;
};

/** Derive the Token[] schema entries for every TypeGroupConfig in `typeGroups`. Each
    group emits one `colorVariable` token plus up to 4 font-shape tokens (family/size/
    weight/line-height) for whichever of those are declared on the group. Font-shape
    tokens carry `canBeLinked: true` and a stable `groupKey` so the linked-block linkage
    sees them; the color token is emitted plain (no groupKey, not shareable) so it stays
    out of the linked block while still appearing in the editor's full token surface
    (used by the reset-button and the design-token resolution test).

    Mirrors the `flatMap`/loop pattern in StandardButtonsEditor and RadioButtonEditor so
    editors don't have to hand-list 16+ near-identical Token entries. */
export function buildTypeGroupTokens(
  typeGroups: Record<string, TypeGroupConfig[]>,
  options: BuildTypeGroupTokensOptions = {},
): Token[] {
  const { groupKeyFor } = options;
  const tokens: Token[] = [];
  for (const groups of Object.values(typeGroups)) {
    for (const group of groups) {
      tokens.push({ label: group.colorLabel ?? 'color', variable: group.colorVariable });
      for (const prop of TYPE_FONT_PROPS) {
        const variable = group[prop.key];
        if (!variable) continue;
        const groupKey = groupKeyFor ? groupKeyFor(prop, group) : prop.defaultGroupKey;
        tokens.push({ label: prop.label, canBeLinked: true, groupKey, variable });
      }
    }
  }
  return tokens;
}

/** Color-only counterpart for editors that hand-roll their font-shape tokens (because
    they use a custom groupKey scheme) but still want their `colorVariable`s in
    `allTokens` — needed so the reset-button and the design-token resolution test see
    them. Accepts either the full `Record` shape or a flat group array, so it slots
    cleanly into both `Object.values(typeGroups).flat()` chains and per-variant
    `flatMap` constructions.

    Each color token gets a groupKey derived from the colorVariable's last-dash
    suffix (e.g. `--badge-primary-text` → `text`) so that all variants/states of
    the same slot are siblings and can be linked in the editor. They start out
    divergent (one value per variant) and the user can opt in to a single shared
    value via the link UI. */
export function buildTypeGroupColorTokens(
  typeGroups: Record<string, TypeGroupConfig[]> | TypeGroupConfig[],
): Token[] {
  const groups: TypeGroupConfig[] = Array.isArray(typeGroups)
    ? typeGroups
    : Object.values(typeGroups).flat();
  return groups.map((g) => {
    const lastDash = g.colorVariable.lastIndexOf('-');
    const groupKey = lastDash >= 0 ? g.colorVariable.slice(lastDash + 1) : g.colorVariable;
    return { label: g.colorLabel ?? 'color', variable: g.colorVariable, groupKey };
  });
}

/** Companion helper: derive a `linkableContexts` map mapping every typography variable in
    `typeGroups` to its state name. Use to build the linked-block context map without
    spelling out 16+ entries; merge with non-typography entries via spread. */
export function buildTypeGroupShareableContexts(
  typeGroups: Record<string, TypeGroupConfig[]>,
): Array<readonly [string, string]> {
  const entries: Array<readonly [string, string]> = [];
  for (const [stateName, groups] of Object.entries(typeGroups)) {
    for (const group of groups) {
      for (const prop of TYPE_FONT_PROPS) {
        const variable = group[prop.key];
        if (!variable) continue;
        entries.push([variable, stateName] as const);
      }
    }
  }
  return entries;
}
