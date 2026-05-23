# SectionDivider refactor — implementation plan

Working directory: `/Users/mark/Documents/repos/runegoblin/live-tokens`. A fresh Claude can execute this end-to-end after reading this file. The proposal was worked out in `/tmp/section-divider-explorations.html` (visual mockup of the target model) and `temp/divider props` (Mark's note on prop shape).

The goal: one `SectionDivider` component, with the rule and the interleaf rebuilt as compositions of primitives, not separate surfaces. Per-variant tokens collapse from ~22 to ~8 — color decisions only. Typography, sizes, spacing become project-global. The editor's per-variant view gets dramatically shorter as a consequence.

UX details are intentionally left loose. We refine once we can see it.

---

## 1. The new component model

### Props
| Prop | Values | Notes |
|---|---|---|
| `variant` | `canvas \| neutral \| alternate \| primary \| accent \| special` | Unchanged. Picks the color family. |
| `align` | `start \| center` | Title/eyebrow/description alignment. |
| `spacing` | `lg \| md \| sm` | Container padding only. |
| `eyebrow?` | `string` | Optional small-caps kicker above title. Absent → no eyebrow row. |
| `description?` | `string` | Optional italic line below title. Absent → no description row. |
| `titleSize` | `lg \| md \| sm` | Default `lg`. |
| `descriptionSize` | `lg \| md \| sm` | Default `md`. |
| `eyebrowSize` | `lg \| md \| sm` | Default `md`. |
| `hairline?` | `{ position, thickness?, gradient? }` | Optional. `position`: see below. |

Required prop unchanged: `title: string`.

### Hairline positions
Six values: `above-label`, `through-label`, `below-label`, `above-description`, `through-description`, `below-description`. Position values that reference description are only meaningful when `description` is set; the editor should hide them otherwise.

### What's gone
- No `surface` prop. The bar is the only structural surface; whether it looks like a panel, a flat card, or pure type is decided by the background token value (gradient / solid / transparent).
- No separate `rule` / `centeredRule` components or surfaces. They are `hairline: { position: 'through-label' }` + alignment + typography choices.

---

## 2. Token shape: old → new

### Per-variant tokens (`--sectiondivider-{v}-*`)

**Keep** (one set per variant):
- `background` — the structured token. Can be `{kind:'gradient', value:…}`, a solid color alias, or `transparent`. **Renamed from `gradient`.**
- `title` (color), `description` (color), `eyebrow` (color, NEW)
- `border`, `border-width`, `shadow`, `radius`
- `title-outline-width`, `title-outline-color` — **renamed from `title-border-width` / `title-stroke-color`** for naming consistency with the prop concept ("outline" not "border")
- `hairline-color` (NEW)

**Remove** from per-variant — these become project-global:
- `padding`
- `title-font-family`, `title-font-size`, `title-font-weight`, `title-line-height`, `title-letter-spacing`
- `description-font-family`, `description-font-size`, `description-font-weight`, `description-line-height`

Per-variant token count drops from ~22 to ~8.

### Project-global tokens (NEW namespace)

Three size sets for text + one for spacing. Naming follows the existing scale token pattern (`--font-size-lg` etc.) so consumers immediately recognise it.

```
--sectiondivider-title-font-family
--sectiondivider-title-font-weight
--sectiondivider-title-line-height
--sectiondivider-title-letter-spacing
--sectiondivider-title-size-lg     /* font-size */
--sectiondivider-title-size-md
--sectiondivider-title-size-sm

--sectiondivider-description-font-family
--sectiondivider-description-font-weight
--sectiondivider-description-line-height
--sectiondivider-description-size-lg
--sectiondivider-description-size-md
--sectiondivider-description-size-sm

--sectiondivider-eyebrow-font-family
--sectiondivider-eyebrow-font-weight
--sectiondivider-eyebrow-letter-spacing
--sectiondivider-eyebrow-text-transform   /* uppercase by default; allow override */
--sectiondivider-eyebrow-size-lg
--sectiondivider-eyebrow-size-md
--sectiondivider-eyebrow-size-sm

--sectiondivider-spacing-lg              /* container padding-block; inline derives via multiplier or separate token */
--sectiondivider-spacing-md
--sectiondivider-spacing-sm

--sectiondivider-hairline-thickness      /* default; per-instance overridable */
```

**Open question (defer to implementation):** is `padding-inline` independent of `padding-block`, or derived (`× 1.5` like today)? Defer — start with independent tokens, collapse if the editor ends up showing them as one knob.

### Component config files
`component-configs/sectiondivider/my-section-divider.json` has per-variant alias entries for every old token. Migration rewrites:
- `*-gradient` → `*-background` (key rename only; value structure stays)
- `*-title-border-width` → `*-title-outline-width`
- `*-title-stroke-color` → `*-title-outline-color`
- Drops `*-padding` (now project-global)
- Drops all `*-{title,description}-font-*` (now project-global)
- Adds defaults for the new project-global tokens

### Theme file
`themes/my-theme.json` may carry overrides for these tokens too. Same migration applies — check and rewrite in lockstep.

---

## 3. File-by-file punch list

### A. Component
- [ ] `src/system/components/SectionDivider.svelte` — full rewrite around the new props + token shape.
  - Replace the per-variant `.variant-{v}` blocks with one structural layout that reads `--_divider-bg`, `--_divider-padding-block`, `--_divider-padding-inline`, etc. internal vars.
  - Class composition on the root: `variant-{v}`, `align-{start|center}`, `spacing-{lg|md|sm}`, `has-eyebrow`, `has-description`, `has-outline` (when title outline width > 0), `has-hairline`, `hairline-pos-{position}`.
  - Title still rendered via SVG + feMorphology filter when `has-outline` is on (the merged-outline trick stays — neighbour glyphs need to merge, can't be done with `-webkit-text-stroke`). When the outline is off, render the title as a regular `<h2>` for accessibility + selectability.
  - Hairline is a single `<span class="sd-hairline">` positioned via CSS based on `hairline-pos-{position}` class. No JS measurement needed.
  - Eyebrow is `<span class="sd-eye">` rendered conditionally.
  - All title-size / desc-size / eyebrow-size decisions resolve to size-class on the relevant element which reads the corresponding project-global token.

### B. Tokens
- [ ] `src/system/styles/tokens.generated.css` — if this is generated, regenerate from source. Find the generator and add the new project-global tokens. If it's hand-edited, add the new tokens directly.
- [ ] Add a baseline `:global(:root)` block in `SectionDivider.svelte` for all the new project-global tokens (matches today's pattern).

### C. Migration
- [ ] `src/editor/core/themes/migrations/2026-MM-DD-sectiondivider-slim-variants.ts` — new file.
  - Bump schemaVersion (current is 8, new is 9).
  - For each per-variant slot in every component-config + theme file:
    - Rename `*-gradient` → `*-background`
    - Rename `*-title-border-width` → `*-title-outline-width`
    - Rename `*-title-stroke-color` → `*-title-outline-color`
    - Drop `*-padding`, `*-{title,description}-font-*`
  - Inject defaults for the new project-global tokens at the theme level (the values currently in the per-variant blocks become the project-global defaults — pick canvas's values as the canonical default).
  - Mirror the patterns in `2026-05-19-sectiondivider-rich-gradient.ts` for shape.

### D. Editor
- [ ] `src/editor/component-editor/SectionDividerEditor.svelte` — rewrite.
  - Per-variant token list shrinks dramatically. The new `frameTokens(v)` returns roughly: `background` (structured), `border`, `border-width`, `shadow`, `radius`, `hairline-color`, `title-outline-width`, `title-outline-color`.
  - Per-variant `variantTypeGroupTokens` shrinks to just colors: `title`, `description`, `eyebrow`.
  - Project-global token block: new section above/beside the variant cards for the global typography + sizes + spacing. Probably needs a new pattern in the `ComponentEditorBase` scaffolding — flagging this as the riskiest piece (see §5).
  - Canvas toolbar additions: `align`, `spacing`, `titleSize`, `descriptionSize`, `eyebrow text + size + on/off`, `description text + size + on/off`, `hairline on/off + position + thickness`. The current canvas toolbar already has `Test title` and `Show description` — extend that pattern.
  - `LINKED_GROUP_KEYS` shrinks. With typography and padding gone from per-variant, the only colors-and-shape-left-to-link are `border`, `border-width`, `shadow`, `radius`, `title-outline-width`, `title-outline-color`, `hairline-color`. Title/description/eyebrow text colors stay unlinked (per the project's linking rules — colors vary).
  - Hairline color: structured token like the background. Either solid or gradient. Reuse GradientEditor pattern; gate it on "is currently gradient" detection.

### E. Demo consumers
- [ ] `src/demo/Section.svelte` — currently passes `title`, `description`, `variant`. Add sensible defaults for the new props (`spacing="lg"`, `align="center"`, `titleSize="lg"`, etc.) or let the component defaults handle them.
- [ ] `src/demo/Demo.svelte` — sweep for any inline `SectionDivider` usage; update.
- [ ] `src/demo/sections/SectionHero.svelte` — doesn't use SectionDivider, but confirm no other demo section does without our knowledge.

### F. Component-config + theme files
- [ ] `component-configs/sectiondivider/my-section-divider.json` — manual rewrite (or let migration handle it on next load; verify the result reads correctly).
- [ ] `themes/my-theme.json` — same.
- [ ] `manifests/my-manifest.json` — check if it references any SectionDivider tokens; update if so.

---

## 4. Phasing

A four-pass approach. Each pass leaves the app in a working state.

### Pass 1 — new token shape + component, demo working
Goal: SectionDivider renders correctly via the new prop API with all the new tokens defined.
- Section A (component) + Section B (tokens) + Section E (demo).
- At end of pass: open the dev server, the demo page renders all six color variants in their current visual state via the new component API.

### Pass 2 — migration
Goal: existing `my-section-divider.json` + theme file load cleanly through the migration.
- Section C (migration).
- Section F (manual rewrite OR let migration run; verify).
- At end of pass: editor loads the existing file without errors. Visual output still matches.

### Pass 3 — editor rewrite
Goal: editor exposes the new prop and token surface.
- Section D (editor).
- At end of pass: full edit cycle works — open editor, change tokens, change canvas-toolbar props, save, reload.

### Pass 4 — polish + cleanup
- Remove any dead CSS rules from the component.
- Remove any unused token references in scaffolding.
- Run typecheck + tests.
- Visual diff against today's output for the `canvas` variant baseline. If anything has drifted unintentionally, fix.
- UX refinements identified during testing — Mark will call these out as we go.

---

## 5. Risks + open questions

### Risk: project-global tokens in the editor
The editor today is built around per-variant tokens via `VariantGroup`. There's no precedent for "tokens that live above the variants" — typography that's not part of any one variant. We'll need either:
1. A new top-level section in `ComponentEditorBase` for project-global tokens, OR
2. To repeat the same project-global tokens inside each variant's UI (visually redundant but reuses existing scaffolding).

(1) is cleaner. (2) is faster to ship. Decide after seeing Pass 3 land — start with (2) if it gets us moving, refactor to (1) if it's awkward.

### Risk: hairline rendering edge cases
- Through-label with a long title that overflows: the hairline still has to look continuous behind the title. CSS approach: position the hairline absolutely behind the title and give the title a matching background-color (canvas-low) so it visually breaks the line. Won't work cleanly on a transparent surface without a backdrop. Acceptable limitation — document it.
- Through-description with `align: start` and a short description: the hairline trails off into empty space. Probably fine, but worth eyeballing.

### Open question: title outline mechanics
Current implementation uses SVG + feMorphology because `-webkit-text-stroke` strokes each glyph individually (CQ, AC become double-stroked). The mockup uses `-webkit-text-stroke` for simplicity; the real implementation should keep the SVG approach. Don't downgrade the rendering.

### Open question: hairline color = gradient
A hairline gradient is a nice touch but introduces a structured token like the background. Two options:
1. Just a solid color (keep it simple).
2. Structured `{kind: 'gradient' | 'color'}` token like background.

Recommend (1) for the first pass. Add gradient support in a follow-up if anyone reaches for it.

### Open question: variant default tokens
When the migration drops `*-padding` and `*-{title,description}-font-*`, what values seed the new project-global tokens? Today canvas has `padding: --space-12` (overridden from default 16 in the component) and `title-font-size: --font-size-5xl`. Use canvas as the canonical default. Other variants' overrides of those tokens are lost — but they were almost certainly identical to canvas given the project pattern. Verify by grepping `my-section-divider.json` for divergent values; flag for Mark if any are surprising.

### Open question: `description` color
Today there's a per-variant `--sectiondivider-{v}-description` token (text color). Should it stay per-variant or become project-global? Argument for per-variant: brand variant might want primary-colored description. Argument for global: consistency across variants is usually desired. **Keep per-variant.** Color is the one thing variants should own.

---

## 6. Definition of done

- [ ] `src/demo/Section.svelte` renders all six color variants on the demo page, visually identical to today's output for the default `align: center, spacing: lg, titleSize: lg, descriptionSize: md` configuration.
- [ ] The hairline + eyebrow + size dials all work end-to-end via canvas-toolbar controls.
- [ ] `my-section-divider.json` round-trips through the editor (load → tweak → save) without data loss.
- [ ] `npm run check` and the test suite pass.
- [ ] Per-variant token count in `SectionDividerEditor.svelte` is ≤8 (down from ~22).
- [ ] The rule and the interleaf treatments can be reproduced by setting `hairline.position` to `through-label` with appropriate alignment.
