# Theme-layer token improvements

## Context

This worksheet was produced during a broader refactor effort around component-token naming, tracked separately in **[`prop-selector.md`](./prop-selector.md)** (same folder). That sibling document covers the SegmentedControl editor's UX gaps and proposes a naming convention for component tokens (`<component-prefix>-<part>[-<state>][-<element>]-<property>`) plus an explicit `groupKey` on each token to replace the current parser-derived sibling matching (which was silently grouping unrelated tokens by last-dash suffix).

As prep for that work, the theme-layer tokens in `src/styles/tokens.css` (392 custom properties) were surveyed against industry naming conventions: **GitHub Primer, IBM Carbon, Atlassian ADS, Material Design, Open Props, Radix, Tailwind, Shopify Polaris**. The verdict was that the theme layer is already mostly aligned with best practice — category-first (`--surface-*`, `--border-*`, `--text-*`, `--space-*`, `--radius-*`), scaled-role pattern (`--surface-<role>-<elevation>`), primitive color palette (`--color-<role>-<100..950>`). Clean.

This document captures the **8 exceptions** — small naming irregularities that would accumulate debt if left unchecked.

**Items #1 and #2 are prerequisites** for the SegmentedControl component-layer work: they touch font-related aliases the component config will reference, so they must land first to avoid typing names that are about to change. Items #3 and #4 are independent cleanups ready to execute. Items #5–#8 remain open for discussion.

## How to use this document

- Each entry has **Current** (what's there), **Reasoning** (why it's a problem), and **Action** (for decided items) or **Proposed** (for open items).
- **✅ Decided** = execute as specified.
- **⏳ Open** = bring back for discussion before acting.
- All renames require a consumer sweep across `src/`, `themes/*.json`, and `component-configs/**/*.json`, plus a migration function in `src/lib/editorStore.ts` that rewrites old keys → new keys on load so saved user files don't break silently.

## Status legend

- **✅ Decided** — action committed, ready to execute.
- **⏳ Open** — proposal under discussion, no decision yet.

## Summary verdict

Category-first naming is used consistently across the theme layer and matches industry best practice (GitHub Primer / IBM Carbon / Atlassian ADS). Scales, semantic tokens, and the primitive color palette are clean. The issues below are isolated naming irregularities, not a systemic problem.

---

## High priority — fix before expanding the system further

### 1. ✅ Rename font sizes to `--font-size-*`

**Current:**
```
--font-xs, --font-sm, --font-md, --font-lg, --font-xl, --font-2xl … --font-6xl   ← sizes
--font-sans, --font-serif, --font-mono, --font-display                             ← families
```

**Reasoning:** Both kinds of token share the `--font-*` prefix, which makes `--font-sans` and `--font-sm` visually adjacent but semantically unrelated. The existing `--font-weight-*` family already proves the explicit-subcategory pattern works.

**Action:** Rename sizes to `--font-size-xs` through `--font-size-6xl`. Families stay as-is — `--font-sans` is a widely recognized convention and `--font-size-sans` would be nonsense.

**Scope:** 12 declarations in `src/styles/tokens.css` plus every `var(--font-xs)`…`var(--font-6xl)` consumer across components, theme JSON files (if values are generated), and editor UI. Needs a full grep-sweep + per-file edit.

**Blocking status:** Must land before the SegmentedControl component-token refactor, since that work will reference `--font-*` aliases and we don't want to type names that are about to be renamed.

---

### 2. ✅ Evict `--btn-*` tokens from `tokens.css`

**Current:**
```
--btn-primary-bg, --btn-primary-hover,
--btn-secondary-bg, --btn-secondary-hover
```

**Reasoning:** Component-specific tokens don't belong at the theme layer; that's the whole point of the component-config system. These four predate that system. Also, the `-hover` names drop the property suffix entirely (is it the bg for hover? fg? border?) — the pattern is broken.

**Action:**
1. Grep for usages of `--btn-primary-bg`, `--btn-primary-hover`, `--btn-secondary-bg`, `--btn-secondary-hover` across the repo.
2. For each still-referenced token: either migrate into the button component config (with a proper property suffix — `-bg-hover` or `-surface-hover` matching our chosen scheme) and update consumers, or rewrite the consumer to use theme-layer aliases directly.
3. Delete the four declarations from `tokens.css`.
4. Add a convention note at the top of `tokens.css`: *"No component-scoped tokens in this file; they belong in `component-configs/*`."*

**Blocking status:** Should land before further component-layer work for the same reason as #1.

---

### 3. ✅ Re-home or delete bare one-word orphans

**Current:**
```
--hover:   rgba(255, 255, 255, 0.1)    ← overlay tint
--overlay: rgba(20, 3, 0, 0.51)        ← modal backdrop?
--empty:   #31251c                     ← unclear; only referenced by --text-glow-stroke
--surface, --border                    ← defaults with no variant
```

**Reasoning:** A single bare word at the root tells you nothing about which category it belongs to. `--hover` is a color value but doesn't fit under any color family. `--empty` is a mystery; call sites should reveal intent. The bare `--surface` and `--border` are shadowed by the proper family tokens and ambiguous about which default they represent.

**Action — per orphan:**
1. Grep the repo for each variable.
2. If it's **load-bearing and distinct** (no existing family token covers the use case), rename with a category prefix that makes its home obvious. Candidate destinations:
   - `--hover` → `--overlay-hover` (if it's an overlay tint) or `--color-hover` (if generic hover mix)
   - `--overlay` → `--overlay-modal` or `--overlay-default`
   - `--empty` → investigate its one usage in `--text-glow-stroke` and inline or rename meaningfully
3. If it's **redundant with an existing family token**, delete and rewrite the callsite to reference the family token.
4. If it's **genuinely unused** (most likely for `--empty`), delete outright.
5. The bare `--surface` and `--border` get special scrutiny — they almost certainly duplicate `--surface-neutral` / `--border-neutral-default` or similar. Rewrite callsites to the explicit family member, then delete.

**Output:** a short changelog of each orphan's fate, to pin in the PR description.

---

## Medium priority — clarity gains, small refactors

### 4. ✅ Rename the `bg` color family to `canvas`

**Current:** A full 17-token role spanning all three semantic families — a peer color family to `neutral`, `primary`, `accent`, `success`, etc., meaning "the brand's background-tone color," usable anywhere (surface, border, text) rather than restricted to page-level use.

```
--surface-bg-lowest … --surface-bg-highest   (7 elevation steps)
--border-bg           … --border-bg-strong    (5 emphasis steps)
--text-bg             … --text-bg-disabled    (5 hierarchy steps)
```

**Reasoning:** The taxonomy is sound — `bg` is a legitimate color family like any other. The problem is the word itself. Every other family name in the system (`primary`, `accent`, `neutral`, `success`, `warning`, `info`, `special`, `alternate`, `danger`) is an intent-shaped noun that doesn't collide with any CSS property. `bg` — and its spelled-out form `background` — IS a CSS property. That creates a dual parse for new readers:

- `--text-bg-primary` could read as "primary-emphasis text from the bg family" (intended)
- or "primary text-background color" (grammatically reasonable in CSS terms)

Under the existing taxonomy, it should be pronounced the first way; the CSS-property shape of the word makes it pronounceable the second way too. Every other family reads unambiguously.

**Decision:** Rename the family to `canvas`, following GitHub Primer's precedent (`--color-canvas-default`, `--color-canvas-subtle`). `canvas` means "the surface on which everything is painted" — semantically identical to the current intent of `bg` — and is not a CSS property.

**Acknowledged collision:** `canvas` is an HTML element (`<canvas>`). This is a milder collision than `bg` vs the CSS property because HTML-tag context and CSS-variable context don't overlap in practice (you're never simultaneously parsing a Svelte template's `<canvas>` and a stylesheet's `--surface-canvas-*`). Worth noting if the editor ever adopts `<canvas>` for palette/curve widgets, but not blocking.

**Rejected alternative — `backdrop`:** Zero CSS-property collision (`backdrop-filter` is niche and compound), reads closest to "background" in meaning. Passed over because `canvas` has stronger design-system precedent.

**Rejected alternative — `tertiary`:** Would collide severely with existing emphasis-tier usage (`--text-primary-tertiary`, `--text-accent-tertiary`, etc.) — renaming the family to `tertiary` would produce `--text-tertiary-tertiary` (tertiary-emphasis of tertiary family), which is ambiguous and looks like a typo.

**Scope:** 17 token declarations in `src/styles/tokens.css` plus consumers. Initial survey identified references in:
- `themes/*.json` (10 theme files — likely generate the declared values)
- `component-configs/*/default.json` (at least `sectiondivider`, `collapsiblesection`)
- `src/components/*.svelte` (at least `SectionDivider`, `CollapsibleSection`)
- `src/ui/VariablesTab.svelte`
- `src/styles/tokens.css` itself

A full sweep is needed before execution. Requires a migration function for saved theme/config JSON so old keys are rewritten on load.

---

### 5. ➡️ Superseded — see [`primary-to-brand-rename.md`](./primary-to-brand-rename.md)

Investigation revealed this isn't a one-off anomaly but a symptom of a deeper naming collision: the word "primary" is overloaded in this codebase as (a) text emphasis tier, (b) color family name, and (c) component variant name. The `-color` suffix was a localized patch for the family/emphasis collision.

The fix — renaming the "primary" color family to "brand" — is larger than the cleanup items in this worksheet and has been split into its own focused worksheet: **[`primary-to-brand-rename.md`](./primary-to-brand-rename.md)**. That covers the full scope (~27 theme-layer tokens + consumers), disambiguation rules (which "primary"s to rename and which to leave), migration strategy for saved themes/configs, and sequencing against the SegmentedControl component refactor.

After that rename lands, `--text-primary-color` ceases to exist — it gets reabsorbed into the uniform `--text-brand` base-emphasis slot that every other color family already uses.

---

### 6. ✅ Rename line-height scale to t-shirt sizing (and re-scale)

**Status:** Done. Decisions taken: hard cut with no alias layer or runtime migration (project is pre-1.0 at 0.5.0, breaking renames are in-scope); `--line-height-relaxed → --line-height-md` (value unchanged at 1.5, so Callout + form-controls render identically). Sweep covered ~33 files + the two committed theme JSON snapshots in `themes/`; 0 svelte-check errors after.

**Current:** `src/styles/tokens.css:589-593` declares density-named tokens with uneven spacing and an off-standard body default:

```
--line-height-tight:    1
--line-height-snug:     1.2
--line-height-normal:   1.4
--line-height-relaxed:  1.5
--line-height-loose:    1.75
```

Two problems:
1. **Ambiguous ordering.** `tight` vs `snug` and `relaxed` vs `loose` are near-synonyms in English — only Tailwind's convention says which is tighter, so the scale carries a memorization tax.
2. **Uneven jumps and a too-tight body default.** Steps are 0.2 / 0.2 / 0.1 / 0.25, and `normal: 1.4` is tighter than the cross-industry standard for body text (Tailwind, Material, Bootstrap all sit at 1.5).

**Reasoning:** The project already uses t-shirt sizing on parallel scales (`--radius-*`, `--size-icon-*`, `--font-size-*`). Adopting it here makes line-height consistent with the rest of the system, gives a true semantic midpoint (`md` = body default with no memorization), and eliminates the synonym-ordering tax. Five steps with even 0.25 jumps keeps each step meaningfully distinct.

**Action:**

1. Replace `tokens.css:589-593` with:

```
--line-height-xs: 1      /* display, single-line headings */
--line-height-sm: 1.25   /* large headings */
--line-height-md: 1.5    /* body default */
--line-height-lg: 1.75   /* comfortable reading */
--line-height-xl: 2      /* airy / pull-quotes */
```

2. Sweep consumers per this mapping:

| Old | Old value | New | New value | Notes |
|---|---|---|---|---|
| `--line-height-tight` | 1 | `--line-height-xs` | 1 | exact value match |
| `--line-height-snug` | 1.2 | `--line-height-sm` | 1.25 | +0.05; intent preserved (large headings) |
| `--line-height-normal` | 1.4 | `--line-height-md` | 1.5 | +0.1; **the body-text fix** |
| `--line-height-relaxed` | 1.5 | `--line-height-md` | 1.5 | exact value; semantic shift onto body default |
| `--line-height-loose` | 1.75 | `--line-height-lg` | 1.75 | exact value match |
| (new) | — | `--line-height-xl` | 2 | new airy step, no migration |

3. Files to edit — ~33 files, ~250 references:
   - `src/styles/tokens.css` — 5 declarations + ~54 internal `var(--line-height-*)` references in component-level aliases
   - `src/styles/form-controls.css` — 2 refs (`relaxed`)
   - `src/styles/site.css` — 4 refs (`snug`, `normal`)
   - `src/ui/sections/tokenScales.ts:45–46` — update editor registry
   - `src/components/*.svelte` — 15 files, ~96 fallback refs
   - `component-configs/*/default.json` — 15 files, ~92 preset references

4. **Migration concern (open):** user-saved theme/config JSON in the wild references the old names. Two options, consistent with the migration pattern already planned for items #4 (`bg → canvas`) and #5 (`primary → brand`):
   - **(a) Runtime migration in the theme/config loader** — rewrite old keys → new on load. Same approach already planned for the other renames; piggybacking on that infrastructure is the path of least friction. **Recommended.**
   - **(b) Alias layer in `tokens.css`** for one release (declare both old + new, mark old deprecated), then drop in the following release. Friendlier to anyone hand-editing JSON, but leaves zombie tokens visible in the editor's variables tab.

**Open questions:**
- Confirm migration approach (recommend (a), bundled with items #4 and #5).
- Confirm `relaxed → md` is the right landing for Callout (8 refs) and form-controls (2 refs). Both contexts are body-text-ish, so `md` semantically fits and the rendered value is unchanged at 1.5. Alternative would be routing those uses to `lg (1.75)` to preserve the "looser than body" intent, but that visibly changes spacing — a real design decision, not just a token rename.

**Note:** font-weight values also drift between `tokens.css` and `VariablesTab.svelte` (`semibold: 400` vs `500`, `bold: 600` vs `800`), and neither matches standard CSS font-weight conventions. Out of scope for this item; tracked separately in item #10.

---

### 9. ✅ Replace `VariablesTab.svelte` hard-coded scales with runtime reads

**Current:** `src/ui/VariablesTab.svelte:57-108` carries a hand-authored list of display values for every scale it shows (spaces, radii, font sizes, font weights, line heights). The values are copies of what `tokens.css` was assumed to contain — not reads of the live stylesheet.

**Reasoning:** This hard-coded duplication is the structural root cause of the drift that surfaced in #6. Concrete drift detected in the current codebase:
- **Line heights:** all 5 values differ between `tokens.css` and the editor's list (being fixed in #6 by normalizing `tokens.css` to the saner scale).
- **Font weights:** `semibold` and `bold` differ (`400 / 600` in `tokens.css` vs `500 / 800` in the editor list).
- **Responsive font sizes:** `tokens.css:574-593` overrides `--font-xs` through `--font-6xl` at tablet and mobile breakpoints; the editor shows only desktop values. A user viewing the app at a narrower viewport sees values in the editor that don't match what's rendered.

Patching each drifted value is a one-time fix; the pattern itself is drift-prone. The editor should display what the stylesheet actually contains at runtime, so it stays accurate by construction.

**Action:**
1. Replace the hard-coded `value:` fields in `VariablesTab.svelte` with runtime reads:
   ```ts
   const readVar = (name: string) =>
     getComputedStyle(document.documentElement).getPropertyValue(name).trim();
   ```
   Keep the variable names in the component as the source of *which* tokens to display; pull values live.
2. Compute any value-hint strings (e.g., `0.5rem (8px)`) from the raw value at read time instead of storing them.
3. Add a `matchMedia` listener (or `ResizeObserver` on `document.documentElement`) so the display refreshes when the viewport crosses the tablet/mobile breakpoints declared in `tokens.css:570` and `585`.
4. On component mount, ensure the stylesheet is loaded before reading (typical Svelte `onMount` timing).

**Scope:** Single file (`src/ui/VariablesTab.svelte`). No stylesheet changes, no consumer sweep, no migration function — `tokens.css` becomes the sole source of truth after this change.

**Side effect:** The font-weight drift (`semibold 400 vs 500`, `bold 600 vs 800`) disappears automatically once the editor reads live values. It'll display whatever `tokens.css` says. That leaves a separate, still-open design question — whether the named-to-numeric mapping in `tokens.css` itself should be normalized to standard CSS conventions (`400=normal, 600=semibold, 700=bold, 800=extrabold`) — but that's its own discussion and not blocked by #9.

---

## Low priority — stylistic, optional

### 7. ✅ Consolidate to one elevation scale; introduce a `ring-focus` scale

**Current:**
```
Elevation scale:   --shadow-sm, -md, -lg, -xl, -2xl   (sm, md in active use)
Semantic overlay:  --shadow-overlay                    (used by Dialog)
Unused:            --shadow-card, --shadow-app, --shadow-glow-green, --shadow-focus
```

**Reasoning:** 7 of 10 shadow tokens are unused in components. `--shadow-card` is named ironically — Card uses `--shadow-md`, not `--shadow-card`. `--shadow-overlay` is the only non-elevation shadow that's actively consumed (by Dialog), but it carries a soft-ambient aesthetic that's out of step with the dramatic-directional sized scale used elsewhere. Collapsing Dialog onto `--shadow-2xl` gives the whole system one shadow aesthetic. `--shadow-focus` is unused but the *concept* (focus rings) is load-bearing for accessibility — it just wants its own namespace (`--ring-*`) so it doesn't masquerade as a shadow, and its own scale (sm/md/lg) for different emphasis levels.

**Action:**

*Deletions (no current consumers):*
1. Delete `--shadow-card` — 0 consumers; duplicates `--shadow-overlay`'s intent.
2. Delete `--shadow-app` — 0 consumers; purpose unclear.
3. Delete `--shadow-glow-green` — 0 consumers; overly specific.

*Dialog migration, then delete `--shadow-overlay`:*
4. In `src/components/Dialog.svelte:159`, change `box-shadow: var(--shadow-overlay)` to `box-shadow: var(--shadow-2xl)`. **This is a visual change** — Dialog's shadow shifts from soft/ambient/straight-down to dramatic/directional/diagonal, matching the rest of the component library. Confirmed intentional.
5. Once Dialog is migrated, delete `--shadow-overlay`.

*Introduce `--ring-focus-*` scale, replacing `--shadow-focus`:*
6. Delete `--shadow-focus`.
7. Add a new namespace `--ring-focus-sm`, `--ring-focus-md`, `--ring-focus-lg`. Values follow the box-shadow-as-outline pattern (no X/Y offset, no blur; only spread, color, alpha). Suggested progression — spread thickens across the scale:
   ```
   --ring-focus-sm: 0 0 0 2px hsla(<accent>, <alpha-sm>);
   --ring-focus-md: 0 0 0 3px hsla(<accent>, <alpha-md>);
   --ring-focus-lg: 0 0 0 4px hsla(<accent>, <alpha-lg>);
   ```
   Default color/alpha carries over from the current `--shadow-focus` value (`hsla(0, 78%, 60%, 0.1)`). Each theme can override these in its JSON.

*Theme JSON updates:*
8. In every `themes/*.json`, drop the removed keys (`--shadow-card`, `--shadow-overlay`, `--shadow-app`, `--shadow-glow-green`, `--shadow-focus`) and add the three `--ring-focus-*` keys. Migration function in `editorStore.ts` handles old theme files on load.

*Editor store / UI updates:*
9. In `src/lib/editorStore.ts:197`, update the shadow token list: drop the five deleted tokens, keep the 5 elevation shadows (`--shadow-sm/-md/-lg/-xl/-2xl`), and add the new `--ring-focus-*` namespace as a separate group.
10. Add editor controls for the `--ring-focus-*` namespace — similar to the existing shadow editor used for `--shadow-sm`…`--shadow-2xl`, but with a reduced property set: **spread, color, alpha only** (no X/Y offset, no blur). Label the group as "Focus rings" or similar to distinguish from shadows.

**Scope:**
- `src/styles/tokens.css` — delete 5 declarations, add 3.
- `src/components/Dialog.svelte` — one-line change.
- `themes/*.json` — 8 theme files, key migration (5 drops + 3 adds).
- `src/lib/editorStore.ts` — shadow token list + ring token list.
- Editor UI — new controls for the ring namespace.

**Blocking status:** None. Can land anytime, independent of other worksheet items.

---

### 8. ✅ Delete unused text-effect tokens

**Current:** Three effect-shaped tokens living in the otherwise color-only `--text-*` namespace:

```
--text-glow-stroke:  12px color-mix(in srgb, var(--empty) 80%, transparent)
--text-shadow-sm:    1px 1px 2px hsla(0, 0%, 0%, 0.5)
--text-shadow-md:    2px 2px 4px hsla(0, 0%, 0%, 0.3)
```

**Reasoning:** All three have zero component consumers. They appear only in `tokens.css` (declarations) and `VariablesTab.svelte:576-577` (hard-coded display entries). The "move to `--effect-*` if the list grows" theory doesn't hold up — the list isn't growing, these are just dead weight. Additionally, `--text-glow-stroke` is the sole consumer of `--empty` (one of the bare-word orphans targeted by item #3), so dropping it simplifies #3 too.

**Action:**
1. Delete `--text-glow-stroke`, `--text-shadow-sm`, `--text-shadow-md` from `src/styles/tokens.css`.
2. Remove the two hard-coded entries from `src/ui/VariablesTab.svelte:576-577` (becomes a no-op once #9 lands, since that refactor drops hard-coded lists entirely — but still needs cleaning if #9 hasn't shipped yet).
3. Drop these keys from all `themes/*.json` files (likely generated or mirrored).
4. Drop from `editorStore.ts` shadow/effect token lists if referenced there.

**Linked cleanup:** Deleting `--text-glow-stroke` removes the last consumer of `--empty`, turning it into a clean delete for item #3.

**If text-effect tokens are genuinely wanted later:** reintroduce them under `--effect-text-*` (or whatever namespace emerges) rather than squatting inside `--text-*`. Don't bring them back into the color namespace.

---

### 10. ✅ Normalize font-weight scale to CSS standard naming

**Current:** Five tokens with names that don't match CSS-standard mappings for their numeric values:

```
--font-weight-thin:      100   (correctly named)
--font-weight-light:     200   (actually Extra Light per CSS standard)
--font-weight-medium:    300   (actually Light)
--font-weight-semibold:  400   (actually Regular / Normal)
--font-weight-bold:      600   (actually Semi Bold)
```

Every non-`thin` token is named a step heavier than what it actually renders at. A Figma "Bold" (700) implemented with `var(--font-weight-bold)` gets Semi Bold (600) on the web — a visible spec/implementation mismatch.

The editor's own chrome (`src/styles/ui-editor.css:135-137`, the `--ui-font-weight-*` namespace) already uses standard values (500/600/700), so the codebase knows the convention but only the theme layer deviates.

**Reasoning:** Align token names with CSS-standard numeric values (OpenType spec) so `--font-weight-bold` means CSS Bold (700), `--font-weight-semibold` means Semi Bold (600), etc. Preserves every current rendering (consumers keep their current visual weight by renaming, not re-valuing), gains a complete and predictable scale, and makes the system legible to any contributor familiar with CSS standards.

**Action:**

*Rename existing tokens in `src/styles/tokens.css` to match their actual values:*

```
--font-weight-light:     200  →  --font-weight-extralight:  200
--font-weight-medium:    300  →  --font-weight-light:       300
--font-weight-semibold:  400  →  --font-weight-normal:      400
--font-weight-bold:      600  →  --font-weight-semibold:    600
--font-weight-thin:      100      (unchanged)
```

*Add the four missing standard tiers:*

```
--font-weight-medium:     500    (new)
--font-weight-bold:       700    (new)
--font-weight-extrabold:  800    (new)
--font-weight-black:      900    (new)
```

Final scale: nine tokens, one per CSS-standard value, all correctly named.

**Decision on `--font-weight-thin`:** retained despite having zero current consumers. Keeping the full 100–900 scale makes the vocabulary complete and predictable; a future designer reaching for ultra-thin display type gets a ready slot without needing to add a token. Cost is one declaration line.

*Consumer sweep — substitute old names with renamed equivalents so nothing visually changes:*

```
var(--font-weight-light)     →  var(--font-weight-extralight)     (2 sites: Notification)
var(--font-weight-medium)    →  var(--font-weight-light)          (7 sites: Button, TabBar, Badge, ProgressBar, Dialog, form-controls, SegmentedControl)
var(--font-weight-semibold)  →  var(--font-weight-normal)         (~15 sites: Card, Button, Dialog, Notification titles, Badge, site headings, …)
var(--font-weight-bold)      →  var(--font-weight-semibold)       (~8 sites: Button label, RadioButton, SegmentedControl selected, Notification hover, site.css h1/h2, Badge)
```

Best executed as a single commit so every call site moves together — any missed reference will silently render at the wrong weight.

*Theme JSON migration:*
1. Drop the four renamed keys (`--font-weight-light`, `-medium`, `-semibold`, `-bold`) from all `themes/*.json`.
2. Add the five new keys (`--font-weight-extralight`, `-light`, `-normal`, `-semibold`, and the four additions: `-medium 500`, `-bold 700`, `-extrabold 800`, `-black 900`).
3. Migration function in `editorStore.ts` handles saved user themes on load — maps old keys to their renamed new positions.

*Editor UI:*
- `VariablesTab.svelte` hard-coded font-weight list becomes outdated; fix it here or rely on #9's runtime-reads refactor to eliminate the problem (whichever lands first).

**Scope:**
- `src/styles/tokens.css` — 4 rename + 4 add = 9 declarations total.
- `src/components/*.svelte`, `src/styles/*.css` — ~32 consumer sites need substitution.
- `themes/*.json` — 8 theme files, key migration.
- `src/lib/editorStore.ts` — migration function addition.
- `src/ui/VariablesTab.svelte` — display list update.

**What doesn't change:**
- `--ui-font-weight-*` in `editor.css` — already aligned with CSS standards; not touched.
- Any rendered weight at any existing call site — every substitution preserves the current visual output.

**Side effect:** `--font-weight-bold` going forward means actual CSS bold (700), one step heavier than it used to be. Any *new* code writing `var(--font-weight-bold)` — or any existing heading/emphasis that a designer decides should truly render at bold — can now do so without creating a new token. This is the primary capability gain.

**Sequencing note:** Best landed with or before item #9 (VariablesTab runtime reads), since #9's success depends on `tokens.css` being the canonical source; an in-progress font-weight rename during #9's landing creates transient confusion.

---

## What I would NOT change

- **Emphasis scales differ between surface / border / text** (7-step elevation vs 4-step emphasis vs 5-step hierarchy). Each scale is fit for its purpose; forcing them to parallel each other would be worse than leaving them differentiated.
- **Bare default names** like `--border-accent` (with `-faint/-subtle/-medium/-strong` as emphasis steps). Industry practice is split 50/50 on bare-vs-explicit-default; bare is shorter and already established here.
- **T-shirt radius scale** (`--radius-sm/md/lg/xl/2xl/3xl/4xl/full/none`). Industry-standard.
- **Pixel-value space naming** (`--space-4`, `--space-8`, `--space-16`…). Intuitive, reads fast, the value is encoded in the name.
- **Everything in the `--surface-*` / `--border-*` / `--text-*` / `--color-*` / `--z-*` / `--opacity-*` / `--transition-*` families.** Clean already.

---

## Execution sequencing

### Decided (ready to execute)

1. **#1 — Font-size rename** — must land before any component-layer work (SegmentedControl config will reference these aliases).
2. **#2 — Evict `--btn-*`** — must land before any component-layer work, same reason.
3. **#3 — Orphan audit** — independent; can run in parallel with #1/#2. Includes a small investigation step to resolve `--empty`.
4. **#4 — `bg` → `canvas` rename** — independent; can run anytime. Larger consumer surface than #1–#3, so worth scheduling its own focused pass with a JSON migration function for saved theme/config files.
5. **#6 — Line-height scale fix** — one-line values change in `tokens.css`. Fastest item on the list.
6. **#9 — `VariablesTab` runtime reads** — single-file refactor that retires the drift pattern discovered during #6. Touches `src/ui/VariablesTab.svelte` only; no consumer sweep.

7. **#7 — Shadow cleanup + `--ring-focus-*` scale** — delete 5 unused/redundant shadow tokens, migrate Dialog to `--shadow-2xl`, introduce a new `--ring-focus-sm/-md/-lg` namespace with its own (offset-free) editor. Small code surface; requires a Dialog visual change (confirmed intentional) and a new editor-UI component for ring tokens.
8. **#8 — Delete unused text-effect tokens** — 3 tokens with zero consumers. Linked to #3 (removes the sole consumer of `--empty`). Tiny change.
9. **#10 — Font-weight scale normalization** — rename 4 tokens to match CSS-standard values, add 4 missing standard tiers. ~32 consumer sites substituted to preserve current rendering. No visual changes; makes the scale predictable and complete.

Natural PR shape: **#1 + #2 together** (same file, same motivation, both block component-layer work), then **#3 + #8 together** (both are deletion-only cleanups; #8's removal of `--text-glow-stroke` turns #3's handling of `--empty` into a clean delete), then **#6 + #9 + #10 together** (all three touch the same text/value story — #6 fixes line-height values, #9 eliminates the drift pattern, #10 normalizes the font-weight scale — landing them together avoids re-touching `VariablesTab.svelte` and theme JSONs in back-to-back PRs), then **#7** on its own (visual change to Dialog + new editor component), then **#4** on its own. #4 is the biggest and benefits from not being mixed with other renames in the same commit for review clarity.

### Superseded

- **#5 — `--text-primary-color` anomaly** — investigation revealed the deeper overload of "primary" and moved to [`primary-to-brand-rename.md`](./primary-to-brand-rename.md).

### Open (still under discussion)

*None — all items are either decided or superseded.*
