# CollapsibleSection — Token arrangement audit

Trigger: editor screenshot showed frame's "surface color" set to `color-danger-400` rendering as a salmon **ring** around the dark header (not a fill). Two concerns raised:

1. Mislabel: the field reads "surface color" but the user perceives the visual it produces as a border.
2. Surface property is scattered across many places in the Container variant.

This doc states findings and proposes a re-arrangement for discussion. No code changes yet.

---

## 1. The "mislabel" is a layering artifact, not a wiring bug

The labels in `CollapsibleSectionEditor.svelte` map 1:1 to the underlying CSS vars, and the component's CSS uses each var correctly:

```scss
.es-root.variant-container {
   background:    var(--collapsiblesection-container-frame-surface);    /* surface  */
   border:        var(--collapsiblesection-container-frame-border-width)
                  solid var(--collapsiblesection-container-frame-border); /* border   */
   border-radius: var(--collapsiblesection-container-frame-radius);     /* radius   */
}
```

What produces the visual confusion:

- `frame-surface` paints the **whole** container background.
- `frame-border` is **transparent** by default, but the border zone still occupies `frame-border-width` (3px) of space.
- `.section-header` sits **inside** the border zone with its own `container-default-surface` (also `surface-canvas`-ish by default).

So when the user pushes `frame-surface` to a contrasting color while leaving `frame-border` transparent, the only visible region of `frame-surface` is the 3px-wide strip behind the transparent border. Reads as a ring. Label is correct in CSS terms. Mental model is broken.

### Why this lands as a perceived bug

`frame-surface` only ever shows when:
- the border is non-zero AND transparent (rare and weird), OR
- the section-header surface is transparent and the user wants `frame` to fill the gaps.

Both are advanced cases. The 99% case is: the user wants the visible chrome (the colored ring) to be controlled by **border color**, and the visible fill to be controlled by **default/hover/active surface**.

### Recommendation

Drop `frame-surface` from the Frame state entirely. Frame becomes pure chrome:

- `border color`
- `border width`
- `corner radius`

To do this safely we also need to:
- Remove `--collapsiblesection-container-frame-surface` from the component CSS (the `background` rule on `.es-root.variant-container`).
- Let `.section-header` and `.section-content` paint everything visible.
- Migrate `runegoblin.json` / `_active.json` / `_production.json` to drop that alias.

Result: no more salmon-ring trap, and Frame only owns properties whose names match what the user sees.

---

## 2. Surface is scattered across five places (Container variant)

For Container only:

| State     | surface var                                            | What it paints                |
|-----------|--------------------------------------------------------|-------------------------------|
| Frame     | `--collapsiblesection-container-frame-surface`         | whole container background    |
| Default   | `--collapsiblesection-container-default-surface`       | header strip, collapsed       |
| Hover     | `--collapsiblesection-container-hover-surface`         | header strip on hover         |
| Active    | `--collapsiblesection-container-active-surface`        | header strip when expanded    |
| Expanded  | `--collapsiblesection-container-expanded-surface`      | content area when expanded    |

Removing `frame-surface` (per §1) drops the count to 4 and aligns surface 1:1 with the four "real" visible regions: header at rest, header hover, header active, content area.

Each of those four genuinely needs to be per-state (different paint per interaction), so they should stay in the per-state panels. Surface is not actually "scattered" in a problematic way once `frame` is out of the surface business — it's one row per state, which matches how `label color`, `icon color`, etc. are already organized.

### What this looks like in the editor after the change

```
Element:  Frame | Default | Hover | Active | Expanded

Frame
  border color
  border width
  corner radius

Default / Hover / Active           ← header strip
  surface color
  padding
  icon color
  icon size
  (label typography group)

Expanded                           ← content area
  surface color
  padding
```

Frame becomes the chrome-only tab. Every other tab owns exactly one surface. No fan-out.

---

## 3. Order within the Frame state

In the screenshot, with surface still present, TokenLayout's sort puts the row order as:

  surface → border-width → border → (gap) → corner radius

…because TokenLayout sorts by `orderRank` and groups linked rows first. With surface removed, Frame would render as:

  border color → border width → corner radius

Which reads naturally (chrome from outside in: color → width → radius), no gap.

---

## Proposed change set (for approval)

1. **CSS**: remove `background: var(--collapsiblesection-container-frame-surface)` from `.es-root.variant-container` in `src/system/components/CollapsibleSection.svelte`. Drop the `:root` default for that var.
2. **Editor**: remove the `surface color` entry from `frameTokens` in `CollapsibleSectionEditor.svelte`.
3. **Configs**: remove `--collapsiblesection-container-frame-surface` from `rg-collapsiblesection.json`, `default.json`, and (if present) any saved variants.
4. **Theme**: no change (theme tokens are unaffected; this is a per-component alias removal).
5. **Tests**: `editorTokens.test.ts` and `groupKeySnapshot.test.ts` may have a snapshot to refresh.

If you want to keep the option of "container with a transparent header that shows the frame underneath", we'd leave `frame-surface` in CSS but hide it from the editor by default. I'd argue against — the mental model penalty is steep, and a future user who needs that pattern can author it in a theme-level override.

---

## Status — CollapsibleSection fix implemented (2026-05-19)

- CSS: `.es-root.variant-container` no longer paints `background` from `frame-surface`; the var is dropped from the component's `:root` defaults and from `src/system/styles/tokens.css` (both seed blocks).
- Editor: `frameTokens` in `CollapsibleSectionEditor.svelte` is chrome-only (border color, border width, corner radius). Order in the rendered Frame panel: border color → border width → corner radius.
- Configs: `rg-collapsiblesection.json` had the alias removed; `default.json` never had it.
- Migration: new `2026-05-19-collapsiblesection-drop-frame-surface.ts` (v6→v7) drops the alias from any older saved config.
- Tests: migration tests updated (frame-surface now expected `toBeUndefined`); groupKey snapshot regenerated. Full suite 2323/2323 green; svelte-check 0 errors.

Chromeless and Divider were unaffected — they never had a frame layer; Divider paints a single bottom border directly on the header, no surface peek-through.

---

## Part 2 — Cross-component audit (other components)

Findings verified by reading the cited code. Three real issues; two findings from the audit agent were over-called and are flagged below.

### 1. Notification — action-button backdrop ignores variant surface

`src/system/components/Notification.svelte:271–275`

```scss
.action-button-backdrop {
   background: var(--surface-neutral-lowest);
   border-radius: var(--radius-md);
}
```

Notification has per-variant surface tokens (`--notification-{info|warning|danger|success}-surface`), but the backdrop behind header actions hardcodes `--surface-neutral-lowest`. Variants drift visually for any user theming the variant surfaces away from a neutral base.

**Proposal**: introduce `--notification-{variant}-action-surface` (or a single `--notification-action-surface` if we don't want per-variant), default to the current neutral-lowest, expose in the editor. One-line CSS change plus tokens.css seed plus editor tokens entry per variant.

### 2. Button — outline variant's :active state is a hardcoded rgba

`src/system/components/Button.svelte:386–388`

```scss
&:active:not(:disabled) {
   background: rgba(255, 255, 255, 0.08);
}
```

Every other button state and variant uses tokens; this one breaks the pattern, so users theming Button can't reach this paint without forking CSS. Also unsafe in light-themed contexts (white tint on white).

**Proposal**: add `--button-outline-active-surface`, default to a neutral-translucent token (or one of the existing overlay tokens), wire through the editor like all the other active-state surfaces.

### 3. Table — Default state owns four surfaces; three default to transparent

`component-configs/table/default.json` (and `TableEditor.svelte` token map)

Default-state tokens for Table: `--table-default-surface`, `--table-default-header-surface`, `--table-default-row-surface`, `--table-default-row-stripe-surface`. Three default to `--color-transparent`. They exist for theming extensibility, but the editor surfaces them as four equal rows, which reads as "four important surfaces" when in practice only one is paint-bearing in the default theme.

This is a real complaint about editor noise, but the underlying token shape is sensible (each maps to a distinct visible region). Best handled with editor-side grouping (e.g., a "Surfaces" subgroup that collapses when all are transparent), not by deleting tokens.

**Proposal**: defer. Park as a future "noise reduction" pass once we have a real user pain point. Tokens are correctly scoped today.

### NOT actual issues — flagged by agent, dismissed on verification

- **SegmentedControl icon-size duplication across states** (`SegmentedControl.svelte:83, 92, 103`). The agent called this redundancy. It's not — these are per-state tokens that *can* be linked via the editor's link-group machinery (the project's standard "shared value" pattern from `feedback_linked_op_invariants`). The defaults happen to share a value, which is the linked-state default. Removing the per-state tokens would block users who want hover/selected icons sized differently.

- **TabBar padding/icon-size repetition across states** (`TabBar.svelte:80, 96, 112, 125`). Same shape as SegmentedControl — per-state tokens, intentionally linkable, defaults happen to match. Not a bug.

---

## Variant-consistency check (your "same structure across variants")

Within CollapsibleSection specifically, after the fix:

| State    | Chromeless | Divider | Container |
|----------|-----------|---------|-----------|
| Frame    | —         | —       | border, border-width, radius |
| Default  | surface, padding, label*, icon, icon-size | + border (divider), border-width | surface, padding, label*, icon, icon-size |
| Hover    | same      | + border, border-width | same |
| Active   | same      | + border, border-width | same |
| Expanded | padding   | padding | surface, padding |

The asymmetries are all load-bearing: Frame is container-only because only container has outer chrome; Divider's per-state borders paint the bottom rule; Expanded surface is container-only because the other variants have no separate content surface. So variant structure is justified, not arbitrary.

Across other components: spot-checked Card, Dialog — both use the `outer-surface + inner-region-surface` pattern but without the layering-trap (the outer surface is meaningfully visible as a body fill, not a ring). No further CollapsibleSection-style cleanups warranted.

---

## Proposed next steps

1. (recommended) Tokenize Notification's action-button backdrop. Small, high payoff, fixes a visible inconsistency.
2. (recommended) Tokenize Button outline's active state. Tiny diff, closes a tokenization gap.
3. (defer) Table surface-row consolidation — needs UX design, not pure cleanup.
4. (skip) SegmentedControl / TabBar per-state token "redundancy" — by design.

Let me know which of 1–2 you'd like me to land. I'll write a focused mini-plan per component before touching code.
