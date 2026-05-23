# Rename the "primary" color family to "brand"

## Context

The word **"primary" is overloaded across three concepts** in this codebase:

| Meaning | Example | Status after this refactor |
|---|---|---|
| Text emphasis tier | `--text-primary` (most-emphasized body text) | **Keep** — this is its real meaning |
| Color family name | `--surface-primary-high` (brand family, high elevation) | **Rename to `brand`** |
| Component variant name | `--button-primary-surface` (main-action button variant) | **Keep** — different namespace (component), no collision |

The collision between meanings 1 and 2 forced an ad-hoc workaround: `--text-primary-color`. Its `-color` suffix is a noise syllable that disambiguates the base of the primary color family from the neutral family's primary-emphasis text token. Two code locations in the editor (`PaletteEditor.svelte:979`, `UIPaletteSelector.svelte:116, 128`) hard-code this exception.

Renaming the color family to `brand` eliminates the collision at its source:
- `--text-brand` (base) replaces `--text-primary-color`
- `--text-brand-secondary`, `--text-brand-tertiary`, etc. follow the same pattern every other color family already uses (accent, success, warning, info, special, alternate, danger, bg → canvas)
- Component-variant "primary" (e.g., "primary button" = main CTA) is unaffected — it lives in the component namespace and has always meant "action priority," not "color"
- The three meanings end up in different namespaces and stop fighting each other

This worksheet was split out from [`theme-token-improvements.md`](./theme-token-improvements.md) because its scope and cross-cutting concerns warrant focused review. Item #5 in that worksheet (the `--text-primary-color` anomaly) is superseded by this refactor.

Related worksheet: [`prop-selector.md`](./prop-selector.md) drives the SegmentedControl component-layer refactor; the two should be sequenced so component configs aren't rewritten against tokens that are about to be renamed.

## Decision: base uses the bare family name

Every color family's base-emphasis token is named bare:

```
--text-brand       (base)
--text-brand-secondary
--text-brand-tertiary
--text-brand-muted
--text-brand-disabled
```

Not `--text-brand-primary`. This matches the existing pattern for `--text-accent`, `--text-success`, `--text-warning`, `--text-info`, etc. — the base is always bare across all color families. Consistency with the established grammar outweighs the cognitive tax of "bare means different things depending on whether the word is a family or an emphasis tier" (a tax this codebase already accepts).

An always-explicit scheme (`--text-<family>-<emphasis>`, no bare shortcuts) was considered and deferred — it would force every `--text-primary`, `--text-secondary`, etc. to become `--text-neutral-primary`, `--text-neutral-secondary`, touching far more than the primary→brand rename warrants. That migration is possible later as its own project if the bare convention causes ongoing friction.

## Scope

### Theme-layer tokens (the authoritative rename list)

All in `src/styles/tokens.css`:

**Primitive palette (10 tokens):**
```
--color-primary-100 … --color-primary-950
```

**Semantic surfaces (7 tokens):**
```
--surface-primary-lowest, --surface-primary-lower, --surface-primary-low,
--surface-primary, --surface-primary-high, --surface-primary-higher, --surface-primary-highest
```

**Semantic borders (5 tokens):**
```
--border-primary, --border-primary-faint, --border-primary-subtle,
--border-primary-medium, --border-primary-strong
```

**Semantic text (5 tokens):**
```
--text-primary-color         → --text-brand
--text-primary-secondary     → --text-brand-secondary
--text-primary-tertiary      → --text-brand-tertiary
--text-primary-muted         → --text-brand-muted
--text-primary-disabled      → --text-brand-disabled
```

**Total: 27 theme-layer declarations**

### Consumer surface

To be confirmed by a full sweep before execution. Known categories:

- `themes/*.json` (10 theme files) — every declared value that's part of the primary family needs key rename
- `component-configs/**/*.json` — any alias target containing `primary` where primary = color family (e.g., `"--surface-primary-high"`) needs rename; variant-name "primary" on the left-hand side stays
- `src/components/*.svelte` — `var(--<prefix>-primary-*)` references
- `src/styles/*.css` — same
- `src/ui/*.svelte` — palette editor UI, including the hard-coded special cases
- `src/component-editor/*` — any hard-coded references

## Disambiguation rules

The migration needs to mechanically distinguish:

**✅ Rename (primary = color family):**
- Token starts with `--color-primary-`, `--surface-primary`, `--border-primary`, or `--text-primary-<emphasis>` where `<emphasis>` is one of `secondary`, `tertiary`, `muted`, `disabled`, or the special `-color` suffix.

**❌ Don't rename:**
- `--text-primary` (without further suffix) = neutral family, primary emphasis. Stays.
- `--<component>-primary-*` in component configs = variant-name primary (main CTA button, etc.). Stays.
- Any string "primary" in UI labels / human-facing text that refers to a button variant or action priority.

A regex like `^--(color|surface|border)-primary(-|$)|^--text-primary-(color|secondary|tertiary|muted|disabled)$` captures the correct set. Must be validated against the actual corpus before rollout.

## Migration plan

1. **Theme JSON migration function in `src/lib/editorStore.ts`.** When a theme file is loaded, rewrite old keys to new keys: `--color-primary-*` → `--color-brand-*`, `--surface-primary-*` → `--surface-brand-*`, etc. Same for component-config files that alias to any renamed token. Apply on first load after upgrade; users' saved work doesn't break.
2. **Rename declarations in `tokens.css`.** Straightforward find-and-replace, limited to tokens matching the disambiguation regex.
3. **Rename in theme JSON source files** (`themes/*.json`). These likely generate the values declared in `tokens.css`, so they must match.
4. **Sweep consumers:** grep for `--color-primary-`, `--surface-primary`, `--border-primary`, and the specific `--text-primary-<suffix>` tokens across the codebase. Update every reference.
5. **Update hard-coded special cases:** `PaletteEditor.svelte:979` and `UIPaletteSelector.svelte:116, 128` currently special-case `family === 'primary' && step === 'primary'` to produce `--text-primary-color`. After rename these branches become unnecessary — the pattern is uniform across all families. Delete them.
6. **Update UI strings** in palette editors, config editors, and any labels that say "Primary" for the color family (distinct from "Primary" for the button variant, which stays).

## Side effects

**Gained:**
- `--text-primary-color` hack disappears; nothing needs the `-color` disambiguator anymore.
- Two code branches in the palette editor are retired (`PaletteEditor.svelte`, `UIPaletteSelector.svelte`).
- Every color family follows the same naming pattern. No exceptions.
- The word "primary" in `tokens.css` now has exactly one meaning: text emphasis tier. No more mental disambiguation.
- Component-variant "primary" (button variant) is decoupled from the color family it happens to use — if a future theme wanted the primary button to use a different family, that's a config-level change, not a naming conflict.

**Not gained:**
- Compound ambiguity of the form `--text-<family>-<emphasis>` where `<emphasis>` is itself an ordinal word (primary, secondary, tertiary) still exists. `--text-brand-tertiary` still requires reading as `<family>-<emphasis>`. Fixing that would require renaming the emphasis scale to descriptors (strong/medium/soft/muted/disabled) — a separate architectural question, not addressed here.

## Sequencing

**Prerequisites:** None internal to this worksheet. Can land independently.

**Blocks:** The SegmentedControl component refactor ([`prop-selector.md`](./prop-selector.md)) should happen *after* this rename so its component-config work doesn't reference `primary` tokens that are about to be renamed. The theme-layer cleanup items #1 and #2 from [`theme-token-improvements.md`](./theme-token-improvements.md) can land before or alongside this rename (they touch different namespaces).

**PR shape recommendation:** One focused PR for this rename. Don't mix with other cleanups — the diff will be large enough on its own, and a focused review is more valuable than a bundled one when the refactor includes a migration function.

## Open questions

1. **Should `--color-primary-*` primitives also rename to `--color-brand-*`?** Arguments for: full consistency across layers, easier to understand the relationship between primitive palette and semantic tokens. Arguments against: primitive palettes in many systems use raw color-role names without brand association. Recommend: yes, rename for consistency, since the semantic tokens alias to them and naming should match.
2. **Palette editor UI terminology.** Does the palette editor currently display the color family as "Primary" to users? If so, that user-facing label needs to change to "Brand" (or whatever display-string decision we make — the variable name and the display name can differ but should be coordinated).
3. **Migration function placement.** Should the rename-old-keys logic live in `editorStore.ts` (where loads happen) or in a standalone `migrations/` module? Lean standalone so it's discoverable and testable, but follow whatever pattern existing migrations use (check first).
