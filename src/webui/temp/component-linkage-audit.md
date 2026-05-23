Let's update this markdown, the linkage tree. # Component linkage audit

Working doc for revising linked property groups across all 14 component editors. Component order matches the editor sidebar (alphabetical by registry label).

Each section gives:
1. **Linked groups (recommended)** — what each linked group should look like, in the format `` `groupKey` `` — *label* (N tokens, scope).
2. **Exposed but unlinked (intentional)** — properties surfaced in the editor but deliberately not linked.
3. **Changes needed** — concrete schema edits to get from current state to the recommendation.

## Reference pattern (from Button)

- **Link shape props** (border-width, radius, padding, similar geometry) across all variant×state cells.
- **Link typography props** (font-family, font-size, font-weight, line-height) across whatever axis varies — variants, states, parts, or both.
- **Don't link colors** — surface, border, text, fill. They're meant to vary.
- **Wrap text color + typography** in a `TypeGroupConfig` so they read as one fieldset.

## GroupKey naming convention (resolved 2026-05-07)

- **Drop component-level prefixes** (e.g. `card-`, `tab-`). Linkage is already scoped per-component slice — the prefix is redundant.
- **Keep part-level prefixes** when multiple parts coexist within a component (e.g. `title-` vs `body-` in Notification/Card; `label-` vs `value-` in Progress Bar).
- **Drop part-level prefixes when only one part exists** (e.g. `label-` in Collapsible Section, `tab-` in Tab Bar — there's only one part to refer to).

## Open cross-cutting decisions

- [ ] **Inline Edit Actions** — unify save/cancel shape into one geometry, or keep them as two separate buttons with their own linked groups?
- [ ] **Segmented Control radius pair** — link `bar-radius` and `selected-radius` as one `radius` group, or keep them distinct?
- [ ] **Tab Bar radius gap** — `--tabbar-bar-radius` exists in `TabBar.svelte:52` but is missing from the schema. Add it as an editable token.
- [ ] **Section Divider** — wire up linkage and link `radius` across 6 variants? (Editor currently doesn't import linkage infrastructure.)

---

## Button ✅ reviewed
File: `StandardButtonsEditor.svelte`

Linked groups (matches reference pattern):
- `border-width` — *border width* (18 tokens, scope: 6 variants × 3 states — primary/secondary/outline/success/danger/warning × default/hover/disabled)
- `radius` — *corner radius* (18 tokens, scope: 6 variants × 3 states)
- `padding` — *padding* (18 tokens, scope: 6 variants × 3 states)
- `font-family` — *font family* (6 tokens, scope: 6 variants)
- `font-size` — *font size* (6 tokens, scope: 6 variants)
- `font-weight` — *font weight* (6 tokens, scope: 6 variants)
- `line-height` — *line height* (6 tokens, scope: 6 variants)

Exposed but unlinked (intentional):
- Surface color, border color — vary by variant/state by definition.
- Text color — 18 tokens (per variant × state) wrapped with typography in `TypeGroupConfig` ("button text" / "button text (hover)" / "button text (disabled)").

Changes needed: none. **Reference shape.**

---

## Card 🔧 recommendation pending
File: `CardEditor.svelte`

Recommended linked groups (drop `card-` component prefix; keep `title-`/`body-` part prefixes):
- `border-width` — *border width* (2 tokens, scope: default, hover)
- `radius` — *corner radius* (2 tokens)
- `header-padding` — *header padding* (2 tokens)
- `body-padding` — *body padding* (2 tokens)
- `shadow` — *card shadow* (2 tokens)
- `blur` — *background blur* (2 tokens)
- `title-font-family`, `title-font-size`, `title-font-weight`, `title-line-height` — title typography (2 tokens each)
- `body-font-family`, `body-font-size`, `body-font-weight`, `body-line-height` — body typography (2 tokens each)

Exposed but unlinked (intentional):
- Surface color, border color — vary by state.
- Title text color, body text color — wrapped in `TypeGroupConfig` for title and body.

Changes needed: rename groupKeys to drop the `card-` prefix on shape props (6 renames). Title/body typography prefixes stay (two distinct parts).

---

## Collapsible Section 🔧 recommendation pending
File: `CollapsibleSectionEditor.svelte`

Recommended linked groups (drop `label-` typography prefix — only one text part):
- `border-width` — *border width* (3 tokens, scope: default, hover, active)
- `radius` — *corner radius* (3 tokens)
- `padding` — *padding* (3 tokens)
- `icon-size` — *icon size* (3 tokens)
- `font-family`, `font-size`, `font-weight`, `line-height` — label typography (3 tokens each)

Exposed but unlinked (intentional):
- Surface color, border color, icon color, label text color — wrapped in `TypeGroupConfig`.

Changes needed: rename 4 typography groupKeys (`label-font-family` → `font-family`, etc.).

---

## Dialog ✅ zero linkage is correct
File: `DialogEditor.svelte`

Structural parts: overlay, dialog frame, header, body, footer. Each part has fundamentally different shape needs — header padding ≠ body padding ≠ footer padding by design. No two parts share enough properties to warrant linking, no variants, no states.

Linked groups: none.

Exposed but unlinked (intentional): all part-level shape and color tokens; one `TypeGroupConfig` for the title in the header part.

Changes needed: none.

---

## Image ✅ zero linkage is correct
File: `ImageEditor.svelte`

Single state ("image"), no variants, no parts. Tokens: border, border-width, radius, shadow.

Linked groups: none. Nothing to link to.

Changes needed: none.

---

## Inline Edit Actions ⚠️ design decision needed
File: `InlineEditActionsEditor.svelte`

Two options to choose between:

### Option A — unify (one geometry across save and cancel)
Recommended linked groups (drop `save-`/`cancel-` prefixes — treat the action pair as a single geometry):
- `border-width` — *border width* (4 tokens, scope: save default, save hover, cancel default, cancel hover)
- `radius` — *corner radius* (4 tokens)
- `padding` — *padding* (4 tokens)
- `icon-size` — *icon size* (4 tokens)

Rationale: aligns with Button reference — buttons in the same control share one geometry. Save and cancel sit side-by-side.

### Option B — keep split (save and cancel are distinct buttons with their own geometry)
Linked groups (current shape, but consistent with naming convention):
- `save-border-width`, `save-radius`, `save-padding`, `save-icon-size` — save shape (2 tokens each)
- `cancel-border-width`, `cancel-radius`, `cancel-padding`, `cancel-icon-size` — cancel shape (2 tokens each)

Rationale: save and cancel are conceptually different actions; cancel is often subtler than save and may want different padding or border weight.

Exposed but unlinked (both options): surface, text, border colors per state per button.

Recommendation: **Option A** by default, since the Button reference logic ("buttons share one geometry") applies. Switch to Option B only if you actually want save and cancel to look mechanically different.

Changes needed (A): collapse 8 groupKeys to 4; merge `linkableContexts` entries.

---

## Notification ✅ reviewed
File: `NotificationEditor.svelte`

Linked groups (matches reference; `title-`/`text-` part prefixes are appropriate — two distinct parts):
- `border-width`, `radius`, `padding`, `icon-size` — shape (4 tokens each, scope: info/success/warning/danger)
- `title-font-family`, `title-font-size`, `title-font-weight`, `title-line-height` — title typography (4 tokens each)
- `text-font-family`, `text-font-size`, `text-font-weight`, `text-line-height` — body text typography (4 tokens each)

Exposed but unlinked (intentional): surface, border, icon, title text color, body text color (typography in `TypeGroupConfig`).

Changes needed: none.

---

## Progress Bar ✅ reviewed
File: `ProgressBarEditor.svelte`

Linked groups (matches reference; `track-`/`label-`/`value-` are part prefixes for distinct parts):
- `track-border-width`, `radius`, `track-height` — shape (5 tokens each, scope: primary/success/warning/danger/info)
- `label-font-family`, `label-font-size`, `label-font-weight`, `label-line-height` — label typography (5 tokens each)
- `value-font-family`, `value-font-size`, `value-font-weight`, `value-line-height` — value typography (5 tokens each)

Exposed but unlinked (intentional): surface, fill, border, text colors (per variant).

Changes needed: none.

---

## Radio Button 🔧 recommendation pending
File: `RadioButtonEditor.svelte`

*(Note: `dot-border-color` and `dot-fill` were unlinked in an earlier code change — keeping that. This recommendation also drops the now-redundant `dot-` and `label-` prefixes since RadioButton has effectively one part each for shape and typography.)*

Recommended linked groups (drop `dot-` and `label-` prefixes):
- `border-width` — *border thickness* (3 tokens, scope: default, hover, active)
- `font-family`, `font-size`, `font-weight`, `line-height` — label typography (3 tokens each)

Exposed but unlinked (intentional):
- Dot border color, dot fill, dot size — vary per state.
- Label text color — wrapped in `TypeGroupConfig`.

Changes needed: rename `dot-border-width` → `border-width`; rename 4 typography groupKeys (`label-font-family` → `font-family`, etc.).

---

## Section Divider ⚠️ wiring + linkage decision needed
File: `SectionDividerEditor.svelte`

Currently zero linkage and the editor doesn't import linkage infrastructure at all.

Recommended linked groups (after wiring up):
- `radius` — *corner radius* (6 tokens, scope: canvas, neutral, alternate, primary, accent, special)

Exposed but unlinked (intentional):
- 4 gradient stops × 6 variants — colors, intentional variation per variant.
- Text-stroke color × 6 variants — color, varies.
- Component-level singular tokens (already shared by being one var): `--sectiondivider-padding`, title typeGroup, description typeGroup.

Changes needed:
1. Add `canBeLinked: true` + `groupKey: 'radius'` to the 6 per-variant `radius` tokens in `variantTokens()`.
2. Import `computeLinkedBlock`, define a `linkableContexts` map for the 6 radius vars, wire up the `linked` prop to `ComponentEditorBase` and `withLinkedDisabled` for the per-variant rendering.

This is a slightly bigger surgery than other components. Confirm before doing the wiring work.

---

## Segmented Control ⚠️ radius pair decision pending
File: `SegmentedControlEditor.svelte`

*(Already cleaned up: 5 single-token "linked" entries had their `canBeLinked` flags removed — the engine ignored them anyway. Typography linkage across states is intact.)*

Recommended linked groups (assumes "yes link the radius pair" — adjust if you choose otherwise):
- `radius` — *corner radius* (2 tokens, scope: control bar, selected option) ← **decision point**
- `font-family`, `font-size`, `font-weight`, `line-height` — option text typography (4 tokens each, scope: default option, selected option, hover option, disabled option)

Exposed but unlinked (intentional):
- Bar surface, border, divider color, divider thickness/height, option gap, padding, selected border-width — geometry/color details that don't have natural siblings.
- Per-state text color (in `TypeGroupConfig`).

**Decision point:** link `bar-radius` and `selected-radius` as a single `radius` group? They're both "corner radius" but for different elements (the outer bar and the selected pill). If linked, editing one syncs both — natural if you want bar and pill to stay visually consistent.

Changes needed (if linking): add `canBeLinked: true` + `groupKey: 'radius'` to `--segmentedcontrol-bar-radius` and `--segmentedcontrol-selected-radius`; add both vars to `linkableContexts`.

Internal-only groupKeys:
- `bar-padding` + four hidden sub-axes (`bar-padding-top/right/bottom/left`) — structural, not linkage.

---

## Tab Bar 🔧 recommendation pending + radius gap
File: `TabBarEditor.svelte`

Recommended linked groups (drop `tab-` component prefix — only one part):
- `border-width` — *border width* (3 tokens, scope: default, hover, active)
- `padding` — *padding* (3 tokens)
- `icon-size` — *icon size* (3 tokens)
- `font-family`, `font-size`, `font-weight`, `line-height` — tab typography (3 tokens each)

Plus add the missing radius token:
- `--tabbar-bar-radius` — currently in CSS (`TabBar.svelte:52`) but absent from the schema. Add as an unlinked single-instance token in the schema.

Exposed but unlinked (intentional): surface, border, icon, text color per state; new bar-radius (single instance, nothing to link to).

Changes needed:
1. Rename 7 groupKeys to drop `tab-` prefix.
2. Add `--tabbar-bar-radius` token to the schema.

---

## Tooltip ✅ zero linkage is correct
File: `TooltipEditor.svelte`

Single object, no variants, no states. Tokens: surface, border, border-width, radius, padding, shadow + tooltip text `TypeGroupConfig`.

Linked groups: none. Nothing to link to.

Changes needed: none.

---

## Trait Badge ✅ reviewed
File: `BadgeEditor.svelte`

Linked groups (textbook reference-pattern match — bare groupKeys):
- `border-width`, `radius`, `padding`, `shadow` — shape (3 tokens each, scope: info, accent, trait)
- `font-family`, `font-size`, `font-weight`, `line-height` — typography (3 tokens each)

Exposed but unlinked (intentional): surface color, border color, text color (typography in `TypeGroupConfig`).

Changes needed: none.

---

## Summary of changes pending discussion

| Component | Change | Risk |
|---|---|---|
| Card | rename 6 shape groupKeys (drop `card-`) | low |
| Collapsible Section | rename 4 typography groupKeys (drop `label-`) | low |
| Inline Edit Actions | choose split vs unified; if unified, collapse 8 → 4 groupKeys | medium (design call) |
| Radio Button | rename 5 groupKeys (drop `dot-`/`label-`) | low |
| Section Divider | wire up linkage; link radius across 6 variants | medium (touches more code) |
| Segmented Control | link `bar-radius` + `selected-radius` as one group | low if yes; nothing if no |
| Tab Bar | rename 7 groupKeys (drop `tab-`); add `--tabbar-bar-radius` to schema | low |

Already applied (in code):
- Radio Button: removed `canBeLinked`/`groupKey` from `dot-border-color` and `dot-fill`
- Segmented Control: removed `canBeLinked`/`groupKey` from 5 single-token entries
