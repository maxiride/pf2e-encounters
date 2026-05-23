import { get } from 'svelte/store';
import {
  isComponentPropertyLinked,
  getComponentPropertySiblings,
  editorState,
} from '../../core/store/editorStore';
import type { CssVarRef } from '../../core/store/editorTypes';
import type { Token } from './types';

function aliasKey(ref: CssVarRef | undefined): string {
  if (!ref) return '';
  return ref.kind === 'token' ? `t:${ref.name}` : `v:${ref.value}`;
}

const TYPOGRAPHY_PROP_SUFFIXES = ['font-family', 'font-size', 'font-weight', 'line-height'] as const;

/** Derive a slot-aware label from a token's groupKey when the groupKey carries
 *  a slot prefix (e.g. `title-font-family` → "title font family"). Bare
 *  typography groupKeys (`font-family`) and non-typography groupKeys keep the
 *  token's original label.
 *
 *  Disambiguates rows in the linked block when one bucket holds multiple
 *  same-shape link groups (e.g. Notification's title vs. text typography),
 *  without coupling the label to the per-variant view. */
function deriveLinkedLabel(label: string, groupKey: string | undefined): string {
  if (!groupKey) return label;
  for (const prop of TYPOGRAPHY_PROP_SUFFIXES) {
    if (groupKey === prop) return label;
    if (groupKey.endsWith('-' + prop)) {
      const slot = groupKey.slice(0, groupKey.length - prop.length - 1);
      return `${slot} ${label}`;
    }
  }
  return label;
}

/** `Token` enriched by the linked-block computation. The base fields are inherited from
    `Token`; the extra commentary on `mergeVariables` here is linked-block-specific. */
export interface LinkedToken extends Token {
  /** Other groupKey lead variables whose current alias matches this row's. The row writes
      the same alias to each of these (and their siblings) so the merged display stays in sync. */
  mergeVariables?: string[];
}

export type LinkedGroup = {
  token: LinkedToken;
  /** Full set of contexts participating in this group (linked + broken), ordered by the
      caller's `linkableContexts` insertion order so the LinkageChart row order matches the
      variant tab strip. `brokenContexts` is a subset; the difference is currently linked. */
  contexts: string[];
  /** Subset of `contexts` whose alias has been overridden out of the linked group.
      Renders as broken cells in the LinkageChart so the historical relationship stays visible. */
  brokenContexts: string[];
  variables: string[];
  linked: boolean;
  /** Reverse lookup from chart context label (e.g. "primary default") to the sibling variable
      that backs that cell. Used by LinkedBlock to swap the row's displayed variable when the
      user focuses a different variant/state, so the value and pop-bar reflect the cell the
      user is looking at — not the group's first-seen representative. */
  contextToVariable: Map<string, string>;
};

export type LinkedBlockResult = {
  groups: LinkedGroup[];
  varSet: Set<string>;
  contextsByVar: Record<string, string[]>;
  linkedOrder: Map<string, number>;
};

/**
 * Compute linked-block groups for the given component.
 * Each entry in `linkableContexts` maps a representative variable to a context label.
 * A group is formed when ≥2 sibling variables (same component, same groupKey) exist.
 *
 * Reads editor state internally via `getComponentPropertySiblings` (which `get`s the store).
 * Pass `$editorState` as the final argument so the call site subscribes and Svelte re-runs
 * the reactive statement when state changes. The argument itself is ignored:
 *
 *   $: linked = computeLinkedBlock(component, linkableContexts, allTokens, $editorState);
 */
export function computeLinkedBlock(
  component: string,
  linkableContexts: Map<string, string>,
  allTokens: LinkedToken[],
  // Reactivity hook — see JSDoc. The runtime state is read via `get(store)` internally;
  // this parameter exists only so callers can pass `$editorState` to create the subscription.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _stateForReactivity?: unknown,
): LinkedBlockResult {
  const groups: LinkedGroup[] = [];
  const varSet = new Set<string>();
  const seen = new Set<string>();
  const seenGroupKeys = new Set<string>();
  const tokensByVar = new Map(allTokens.map((t) => [t.variable, t]));

  // Topology peers per groupKey (everything the editor declared as part of one sharing set).
  // Used to mirror writes from a row's lead onto sibling variables that aren't yet in the
  // slice, so a single user change propagates to the full declared topology.
  const topologyByGroupKey = new Map<string, string[]>();
  for (const [variable] of linkableContexts) {
    const gk = tokensByVar.get(variable)?.groupKey;
    if (!gk) continue;
    const list = topologyByGroupKey.get(gk) ?? [];
    list.push(variable);
    topologyByGroupKey.set(gk, list);
  }

  for (const [variable] of linkableContexts) {
    if (seen.has(variable)) continue;
    const rep = tokensByVar.get(variable);
    if (!rep) continue;
    if (rep.groupKey && seenGroupKeys.has(rep.groupKey)) continue;
    const siblings = getComponentPropertySiblings(component, variable);
    if (siblings.length < 2) continue;
    for (const s of siblings) seen.add(s);
    if (rep.groupKey) {
      seenGroupKeys.add(rep.groupKey);
      // Mark every other declared peer in linkableContexts as seen so they don't spawn dupe groups
      // when the slice covers only a subset of the declared topology.
      for (const peer of topologyByGroupKey.get(rep.groupKey) ?? []) seen.add(peer);
    }

    const propertyLinked = isComponentPropertyLinked(component, variable);
    const declaredPeers = rep.groupKey ? topologyByGroupKey.get(rep.groupKey) ?? [] : [];
    const mergePeers = declaredPeers.filter((v) => v !== variable && !siblings.includes(v));

    // Partition the *currently linked* siblings by alias. Explicitly unlinked
    // siblings (those in `slice.unlinked`) are tracked separately and always
    // render as broken in the chart — even when their alias happens to match
    // the canonical value — because they've opted out of sharing.
    const slice = get(editorState).components[component];
    const aliases = slice?.aliases ?? {};
    const unlinkedSet = new Set(slice?.unlinked ?? []);
    const buckets = new Map<string, string[]>();
    for (const s of siblings) {
      if (unlinkedSet.has(s)) continue;
      const k = aliasKey(aliases[s]);
      const arr = buckets.get(k) ?? [];
      arr.push(s);
      buckets.set(k, arr);
    }
    // Canonical = representative's bucket (if it's linked). Promoted to a more
    // populous *explicit-alias* bucket when one exists. The empty-key bucket
    // (peers with no saved alias) only wins canonical when the representative
    // itself has no saved alias — otherwise an unsaved peer would silently
    // outvote a peer that the user actively set.
    let canonicalKey = unlinkedSet.has(variable) ? '' : aliasKey(aliases[variable]);
    let canonicalSize = buckets.get(canonicalKey)?.length ?? 0;
    for (const [k, arr] of buckets) {
      if (k === '' && canonicalKey !== '') continue;
      if (arr.length > canonicalSize) {
        canonicalKey = k;
        canonicalSize = arr.length;
      }
    }
    const linkedSiblings = buckets.get(canonicalKey) ?? [];
    const divergedSiblings: string[] = [];
    for (const [k, arr] of buckets) {
      if (k !== canonicalKey) divergedSiblings.push(...arr);
    }
    const explicitlyUnlinked = siblings.filter((s) => unlinkedSet.has(s));

    // Build context lists in canonical (linkableContexts insertion) order so the
    // LinkageChart row order matches the variant tab strip the editor declared.
    // `contextToVariable` records which sibling backs each cell, so LinkedBlock
    // can swap the row's displayed variable to follow focusedVariant/focusedState.
    const linkedSet = new Set(linkedSiblings);
    const brokenVarSet = new Set([...divergedSiblings, ...mergePeers, ...explicitlyUnlinked]);
    const siblingSet = new Set(siblings);
    const seenAll = new Set<string>();
    const seenBroken = new Set<string>();
    const ctxs: string[] = [];
    const brokenContexts: string[] = [];
    const contextToVariable = new Map<string, string>();
    for (const [peer, ctx] of linkableContexts) {
      if (rep.groupKey && tokensByVar.get(peer)?.groupKey !== rep.groupKey) continue;
      if (siblingSet.has(peer) && !contextToVariable.has(ctx)) {
        contextToVariable.set(ctx, peer);
      }
      const isLinked = linkedSet.has(peer);
      const isBroken = brokenVarSet.has(peer);
      if (!isLinked && !isBroken) continue;
      if (!seenAll.has(ctx)) {
        seenAll.add(ctx);
        ctxs.push(ctx);
      }
      if (isBroken && !seenBroken.has(ctx)) {
        seenBroken.add(ctx);
        brokenContexts.push(ctx);
      }
    }
    const tok: LinkedToken = {
      ...rep,
      label: deriveLinkedLabel(rep.label, rep.groupKey),
      canBeLinked: true,
      ...(mergePeers.length ? { mergeVariables: mergePeers } : {}),
    };
    groups.push({ token: tok, contexts: ctxs, brokenContexts, variables: siblings, linked: propertyLinked, contextToVariable });
    // Per-variant rows for linked siblings stay directly editable — writes fan
    // out through the linked write path (`setComponentAliasLinked`) because
    // `isLinkedDisplay` resolves true. The link topology is dev-declared, so
    // we don't gate edits behind a "go use the linked block" detour; the
    // linked-block row is the topology view, not the only edit point.
  }

  const contextsByVar = Object.fromEntries(groups.map((g) => [g.token.variable, g.contexts]));
  const linkedOrder = new Map<string, number>(
    groups.flatMap((g, i) => [
      [g.token.variable, i] as const,
      ...g.variables.map((v) => [v, i] as const),
    ]),
  );

  return { groups, varSet, contextsByVar, linkedOrder };
}

/** No-op since the linked-block became a peer to per-variant editing rather
 *  than the single canonical edit point. Per-variant rows for linked properties
 *  stay fully interactive — writes route through `setComponentAliasLinked`
 *  when `isLinkedDisplay` resolves true, fanning out to all linked siblings.
 *
 *  Kept as an identity passthrough so existing editor call sites compile
 *  without churn; remove the calls (and this export) when consolidating. */
export function withLinkedDisabled<T extends { variable: string }>(tokens: T[], _linked: Set<string>): T[] {
  return tokens;
}
