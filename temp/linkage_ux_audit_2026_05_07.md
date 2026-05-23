# Linkage UX audit — 2026-05-07

Working doc. Audit of the linked-property editing system end-to-end (data model, write paths, UI surfaces) against the user's stated mental model:

> A linked property edits all members of that linkage. Unlinking lets one peer drift independently.
> Each property has its own link tree — font-color can detach while font-family stays linked.
> Groups of properties should NOT share a single link.

The good news up front: **the data model already matches this mental model.** The mismatch lives in two layers above the data: (a) the *information architecture* of the linked-block surface (what gets framed as a grouping, what doesn't), and (b) the *per-control affordances* (when the dropdown is closed, when reset is hit, when one row writes across more than one group). Architecture first, affordances second — §3 decisions constrain what §4 changes are possible.

---

## 1. Data model — already per-property

Each linkable token declares its own `groupKey`. Every `groupKey` is its own independent link tree.

For Button:

| groupKey | Members | Scope |
|---|---|---|
| `border-width` | 18 vars | 6 variants × 3 states |
| `radius` | 18 vars | 6 variants × 3 states |
| `padding` | 18 vars | 6 variants × 3 states |
| `font-family` | 6 vars | 6 variants (default state only) |
| `font-size` | 6 vars | 6 variants |
| `font-weight` | 6 vars | 6 variants |
| `line-height` | 6 vars | 6 variants |

Per-property unlinking via `slice.unlinked` is per-variable. Detaching `--button-primary-padding` does not affect any other property. **Nothing in the data model couples properties together.**

→ No data-model change needed for the user's "each property needs its own link tree" requirement. That's the current state.

---

## 2. Mental model gap: where the visual framings diverge from the data

The data model has one editable unit per `groupKey`. The linked-block surface communicates groupings at three nested levels:

1. **Bucket card** (`LinkedBlock.svelte:118-133`) — groups by `(linked-contexts, broken-contexts)` signature.
2. **Type column** (`LinkedBlock.svelte:50-53`, via `extractTypeGroup`) — groups typography rows under the focused variant's slot identity (e.g. "primary").
3. **Row** — one `LinkedGroup`, the actual link.

Only the row corresponds to a real edit unit. Bucket and type column are *display* groupings that read as if they were edit groupings. Five specific failures fall out of this; the first four are architectural, the fifth is the original "bucket-by-shape" finding.

### 2.1 Visual hierarchy is inverted relative to the link

Bucket and type column read first (larger, framed, headed). The row — the actual edit unit — is the smallest visual element. The user's mental model ("the link IS the property") is buried at the deepest level of the visual nesting.

### 2.2 The type column header is variant-scoped while the link is variant-spanning

`pickFocusedVariable` picks the sibling backing the currently-focused context, then `extractTypeGroup` derives the column legend from *that variant's name*. So a column reads "primary" while the underlying link writes to all six variants. Editing in this column changes secondary, success, warning, danger, outline — and the column header actively misleads about that.

### 2.3 `collapseGeneral` does cross-group writes silently

`LinkedBlock.svelte:63-89` collapses two rows into one whenever they share `(label, alias)`. The collapsed row carries `mergeVariables`, and `TokenLayout.handleRowChange` (`TokenLayout.svelte:200-210`) mirrors writes onto every peer plus their siblings — a single UI control writing across multiple independent link groups. The user gets no signal.

If Notification's title and text font-family ever land on the same alias (easy — same default), they collapse into one row. Editing that row writes to ~12 variables across 2 link groups.

### 2.4 State-scope coupling is structural and invisible

Button geometry links across **variants × states** (18 contexts). Button typography links across **variants only** (6 contexts, default state). The chart cell count is the only place this distinction shows. A user expecting padding-link behavior to mirror font-link behavior will be surprised, and there is no surface affordance to set the expectation.

### 2.5 Bucket-by-shape coincidence reads as identity (original §2)

The bucketing logic:

```ts
const key = [
  [...g.contexts].sort().join(','), '||',
  [...g.brokenContexts].sort().join(','),
].join('');
```

Multiple groups with the same (linked-contexts, broken-contexts) signature get rendered in one card with one chart.

Today, with Button fully linked, the linked-block panel shows two cards:
- **Card A** (chart spans 18 contexts × 0 broken): `border-width`, `radius`, `padding` — three rows, one chart.
- **Card B** (chart spans 6 contexts × 0 broken): `font-family`, `font-size`, `font-weight`, `line-height` — four rows, one chart.

The chart shows context-shape, not per-property linkage. To the user it *looks like* one link governs all rows in the card, even though the data model has four independent links inside Card B.

When one property's shape diverges (user unlinks `--button-primary-padding`), the bucket key changes for that property and it splits into its own card. The bucketing self-corrects on divergence — but the user has to *cause* a divergence to discover that.

### Failure mode catalog (concrete instances driving §3)

1. **Implicit shared identity** (§2.5). A four-row card with one chart reads as "this card is one link." It's not.
2. **Editing in the linked-block doesn't show whose link is being engaged.** The lock icon is buried in each row's dropdown header. To find out "is `font-size` linked or just sharing a card with linked siblings?" the user has to open each dropdown.
3. **Hidden cross-group writes** (§2.3). Same-label same-alias rows merge into one editable row that writes across multiple groups.
4. **Type-column header lies about scope** (§2.2). "Primary" framing on a cross-variant link.
5. **Padding-block conflict in linked-block view.** `kind: 'padding-split'` with `standalone: true` wants to span all grid columns. Inside a bucket card alongside non-padding rows, the layout fights itself. Today this is moot because padding's split state diverges the bucket — padding always ends up alone — but the path for "linked group, all peers in split mode" needs a deliberate visual.
6. **The chart visualizes parent-level state only.** For split padding, two peers with identical parent aliases but different per-side aliases render as "both linked" in the chart, even though their blocks differ.
7. **Reset on linked rows isn't itself the issue — visibility is.** Reset clearing all peers is the *correct* behavior when the value is shared. The original concern was that the user wouldn't realize the row was linked. The visibility fixes (§4.1, §4.2, §4.3) address that without changing reset semantics. (See §4.4.)
8. **Two places to edit, one lock per place.** Per-variant view and linked-block view both render the same property. After the recent change (per-variant rows are editable), neither is canonical. Closed triggers don't show that an edit fans out. (See §4.2.)

---

## 3. Information architecture proposals

These are decisions about *what gets framed as a grouping at all*. They constrain what surface affordances make sense in §4, so they go first.

### 3.1 Card unit + two-layer progressive disclosure

**Settled architecture: one card per `LinkedGroup`, two layers of disclosure on top.**

The bucket-by-shape approach was rejected first because it caused cards to relocate on unlink (the bucket key includes `brokenContexts`, so a user action changed the layout). One-card-per-group is stable: the data model is the layout.

But "stable" exposed a second problem: 7 cards × identical chart treatment is visually overwhelming during routine work. The chart is decorative when uniform (its real job is showing divergence). The fix is two layers of progressive disclosure tied to actual signal:

**Section level.** The `Linked properties` section is collapsible with a stateful header:
- All in sync: `Linked properties · 7 · in sync` (subdued)
- Divergence present: `Linked properties · 7 · 2 unlinked` (amber for the broken portion)

Smart default: open when any group is broken; closed otherwise. First explicit user toggle locks the value (so subsequent state changes don't re-flip the section out from under them).

**Card level.** Each card collapses to a 3-line layout with the chart hidden behind a drill-down:

```
Border Width                            ← bold property heading on its own line
[Defa…  ⌽ 18 ▼]  2px                    ← control row (selector + resolved value)
▶ ⌽ Links                               ← drill-down (uniform state)
```

When peers diverge, the drill-down row carries the divergence info inline:

```
▶ ⌽ Links  (primary, success unlinked)  ← amber bracket
```

Names show comma-separated up to 2; ≥3 collapses to numeric (`(3 unlinked)`). Click the row to expand the chart; the bracket fades out (the chart now owns the divergence info). Whole row clickable, chevron at the front rotates on expand.

The result: the section is one line tall when nothing's wrong, the broken peers are named in plain text the moment something diverges, and the full chart matrix is a single click away when the user wants the matrix view.

→ **Why this beats the original "bucket-by-shape with row-level affordances" plan:** the original was trying to fix a visibility problem with affordances. The actual problem was *too much information by default*. Progressive disclosure inverts the question — show nothing extra by default, name the divergence inline when it exists, show the matrix only when the user asks for it.

### 3.2 Type-column legend — RESOLVED by §3.1 Option B

Moot. With one card per `LinkedGroup`, there's only ever one row per card and no column structure to label. The type-column legend was a side-effect of bucketing multiple groups into one card; that bucketing is gone.

### 3.3 Row unit: drop `collapseGeneral`

`collapseGeneral` is opportunistic — it merges based on transient value coincidence, not link relationship. The merge unwinds the moment values diverge, which is structurally fragile. Two cleaner answers:

- **Drop it.** One row per `LinkedGroup`, always. Same-label-different-group is rare in practice; when it occurs, two rows is honest.
- **Keep it but surface it.** A "this row writes to N link groups" badge when `mergeVariables.length > 0`.

→ **Recommendation: drop.** The badge fixes the symptom; removing the merge fixes the cause. If visual repetition becomes a problem in some specific component, address it there, not by silently merging editor controls across data boundaries.

### 3.4 groupKey scoping — convention is already drifting

| Editor | Typography groupKey pattern | Scope effect |
|---|---|---|
| Button | `font-family`, `font-size`… | Across 6 variants, default state only |
| RadioButton | `font-family`, … | Across 3 states (default/hover/active) |
| CollapsibleSection | `font-family`, … | Across 4 states (single label slot) |
| Notification | `title-font-family`, `text-font-family` | Across 4 variants per slot |

Each is locally correct for the slots that editor declares. There's no enforced convention. The risk: a future "Card" component author picks `font-family` for both title and body slots and silently links them together.

→ **Recommendation:** add a `CONVENTIONS.md` rule — *when a component has more than one typography slot, the slot name is part of the groupKey* (e.g. `title-font-family`, never bare `font-family`). Cheap. Add a runtime warn if `registerComponentSchema` registers a single groupKey for variables whose name-derived slots differ — closes the door for the future.

### 3.5 Linkable color — structural decision, not affordance

The user's "remove the font color while keeping all the others active" example only works if text color is in a link group to begin with. Today, `buildTypeGroupTokens.ts:43` emits `colorVariable` *without* a `groupKey` — colors are intentionally not shared.

If you want color to be linkable as its own property:

```ts
tokens.push({
  label: group.colorLabel ?? 'color',
  variable: group.colorVariable,
  canBeLinked: true,
  groupKey: 'text-color',  // or 'text-color-default' / 'text-color-hover' to scope per state
});
```

Decision needed (architectural, not visual):
- **Single `text-color` group** = all 18 button text colors link together (variants × states). Probably wrong — disabled text usually wants a different color.
- **Per-state groups** (`text-color-default`, `text-color-hover`, `text-color-disabled`) = links across variants only, mirroring `font-family`/`font-size` scope. Probably right.

→ **Recommendation:** per-state groups when the use case is concrete. Not a pre-emptive add — wait for an editor that needs it. One-line edit in `buildTypeGroupTokens.ts` once decided. Same change pattern works for `surface-color` and `border-color` if you ever want those linked too.

### 3.6 Edit anywhere — make the equivalence visible (was §3.E)

Today, every linkable property has an editable row in per-variant view AND linked-block view. Both routes write through `setComponentAliasLinked` when linked, so they're functionally equivalent. The user has to pick which to use.

→ **Recommendation: edit anywhere, document the equivalence.** Add the closed-trigger linkage badge from §4.2 so per-variant rows show their fan-out. The pop-bar already does most of the signal work; the badge closes the gap when the user is *about to click* but the dropdown isn't open yet.

---

## 4. Surface affordance proposals

Per-control changes, all subordinate to §3 decisions.

### 4.1 Per-row link affordance — REVERTED

The original plan added an always-visible inline lock per row in the linked-block. That was correct for the bucket-card layout (multiple rows in a card, each needing its own lock cue) but redundant in the new card layout (each card is one property, with a heading-as-label that doesn't have room for a lock without crowding). The closed-trigger pop-bar + chain badge + dropdown-header lock toggle cover the linked-state visibility; an inline lock just adds noise to a single-row card.

→ **Reverted in linked-block context.** Unlinking happens via the dropdown's link toggle. The trigger's pop-bar still indicates the row's link state at a glance.

### 4.2 Closed-trigger linkage badge (new)

When the dropdown is closed, the colored pop-bar is the only link-state cue. There's no icon, count, or text on the trigger itself. After per-variant rows became editable, a user opening a per-variant dropdown has no in-trigger indicator that their edit fans out to N peers.

→ **Recommendation:** small chain icon + peer count next to the chevron, **per-variant view only**. In the linked-block, the chart matrix already counts the cells, so the badge is redundant — it's hidden via CSS in `LinkedBlock.svelte`. Per-variant: keep the badge; it's the only fan-out cue there.

### 4.3 Chart caption — surfaces inside the chart drill-down

`LinkageChart.svelte:76` already renders `<span class="chart-label">{caption}</span>`. With per-card chart drill-down (§3.1), the caption lives inside the expanded chart and provides scope context ("Links across variants and states" / "Links across variants") at the moment the user has chosen to inspect.

Original repetition concern (caption per card stacking up) is moot: cards are collapsed by default, so captions only appear when the user has actively drilled down on that one property.

→ Implemented. Per-card caption inside the chart, only visible on drill-down.

### 4.4 Reset on linked rows — RESOLVED, no change needed

The original framing — "reset is silently destructive, scope it to the focused peer, add a separate reset all" — was wrong. Linked = peers share one value. "Clear" on a linked group means clear the shared override; all peers return to the upstream default together, link preserved. There is no per-peer reset that preserves the link, because the peers don't have separate values to reset. Trying to scope reset to the focused peer would *shatter* the link (one peer cleared, others not → divergence) — the opposite of helpful.

The "footgun" concern was really about *visibility* — the user might not know the row is linked when they click reset. After §4.1 (inline lock) + §4.2 (closed-trigger badge with peer count) + §4.3 (chart caption) + the existing pop-bar + lock-in-header, there are five distinct linked-state signals. The single `Reset` button is correct; the explicit signals are what was missing.

The legitimate "reset just this one peer" intent — "I want primary back to default but keep the others on their custom values" — *requires* breaking the link. That's a two-step op (unlink, then reset), and both steps deserve to be visible. Bundling them into a "Reset this" button hides the unlink decision and makes the link breakage incidental.

→ **No change.** Single `Reset` button, routes through `writeOverride(null)` → `clearComponentAliasLinked` when linked. See §6 for the related "what not to do" entry.

### 4.5 Single-row bucket chrome — RESOLVED by §3.1 Option B

Moot. With one card per `LinkedGroup`, every card is single-row by data identity, and the chrome no longer implies false grouping (it *is* the property's visual envelope). Chrome stays.

### 4.6 Padding-block chart honesty (was 3.D)

The chart treats parent-level alias as the linkage signal. For padding, the *block* (parent + four sides) is the unit. If two peers have the same parent alias but different per-side splits, they're linked-by-parent but diverged-by-block.

Two options:
1. **Show divergence in the chart.** When any peer's block differs from canonical, mark the cell broken even if the parent alias matches. (Requires `linkedBlock.ts` to compare blocks, not just parent refs.)
2. **Hide the chart when split.** When the focused peer is in split mode, render the chart as a flat list of variant×state contexts with a "split" badge instead of cells.

→ Option 1 keeps the visual language consistent. Option 2 admits the chart isn't expressive enough for compound linkage. Pick once split padding is actually used in anger; current state ("block merges work, chart doesn't show divergence") is acceptable in the meantime.

### 4.7 Mutate-message consistency (new)

`components.ts:243` writes `share ${component}/${groupKey}`, `:264` writes `clear linked …`, `:281` writes `unlink …`, `:299` writes `relink …`. Undo stack reads inconsistently. Align to `link` / `unlink` / `relink` everywhere.

→ One-line edits in `slices/components.ts`. Drive-by.

---

## 5. Suggested order

Landed (in the order shipped):

1. **§3.4** (groupKey convention + runtime warn).
2. **§4.3** (chart caption, surfaces in drill-down).
3. **§3.3** (drop `collapseGeneral`).
4. **§4.2 + §3.6** (closed-trigger badge for per-variant; edit-anywhere).
5. **§3.1 Option B** (one card per `LinkedGroup`).
6. **§3.1 progressive disclosure** (section collapse + per-card chart drill-down + named-unlinked bracket). Replaces §3.2 entirely and reverts §4.1.
7. **§4.7** (mutate-message rename).

Deferred / resolved without code change:

- **§4.1** — reverted; inline lock didn't fit the heading-as-label card layout.
- **§4.4** — single Reset stays; visibility handles the original concern.
- **§3.2** — absorbed into §3.1 (no type-column structure to suppress under one-card-per-group).
- **§3.5** (text-color linkable) — when there's a concrete use case.
- **§4.6** (padding chart honesty) — when split padding gets used in anger.
- **§4.5** (single-row chrome) — moot; chrome is the property envelope under §3.1.

---

## 6. What NOT to do

- **Don't add per-property "groups" or families to the data model.** The model is already per-property. Adding a layer of grouping above `groupKey` would re-create the very confusion this audit is trying to fix.
- **Don't surface a "link all" or "unlink all" button.** Each property is its own decision; a bulk action implies the bulk *is a thing*. It isn't.
- **Don't auto-detach a property when its peer is detached** (e.g. don't unlink `font-size` just because `font-family` was unlinked). They're independent.
- **Don't expose link *scope* (variant-only vs variant×state) as a per-property UI affordance.** Pushes link topology decisions out of the editor schema and into user hands; contradicts the dev-declared memo. Use chart caption text (§4.3) to communicate scope instead.
- **Don't add a "this row writes to N groups" badge to fix `collapseGeneral`** (§3.3). The badge papers over a hidden-write problem; remove the collapse instead.
- **Don't scope reset to the focused peer when linked.** Linked = peers share one value; clearing that value affects all peers by definition (the link is preserved at the default). A "scoped reset" while linked would silently shatter the link — exactly the kind of side-effect the audit is trying to prevent. The legitimate "reset just this one" intent is "unlink, then reset" — keep that as two visible steps.
- **Don't add a confirmation dialog to reset.** With per-row lock (§4.1), closed-trigger badge (§4.2), chart caption (§4.3), the existing pop-bar, and the lock in the dropdown header, the linked state is unambiguous before the user clicks. A modal is the wrong tool when the state is already legible.
- **Don't merge or split bucket cards based on user action.** Bucket-shape changes are a *consequence* of unlinking; making the card structure user-controllable adds a layer of abstraction the user shouldn't have to think about.
