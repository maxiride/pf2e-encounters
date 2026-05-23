# SectionDivider — Rich gradient editor

Trigger: SectionDivider gradients are locked to 3 stops via a bespoke `GradientCard` and seven flat per-variant CSS tokens. Goal: variable stop count, the richer `GradientEditor.svelte` UX, per-variant independence, and monochrome (single-family) discipline by default.

This doc states the implementation shape for review. No code changes yet.

---

## 1. Direction

- **Inline per-variant gradients**, not theme tokens. Each variant stores a structured `GradientToken` directly inside the SectionDivider component-config. No new entries in the shared gradient library.
- **Reuse `GradientEditor.svelte`** as the editing surface. It already does variable stops, drag, type switch, angle dial, opacity per stop. We pass it a structured value out of the component-config instead of a theme token.
- **Monochrome by default, override available**: each gradient lives within its variant's color family in the default case. A Monochrome checkbox scopes the picker to family; unchecking it opens the full palette so a designer can mix in an out-of-family pop color on one or more stops.
- **No cross-variant linking** for the gradient in this iteration. Each variant is independent. The "Copy from variant" affordance (existing `VariantGroup` feature with preserve-families) is how a designer propagates a shape from one variant to others, with non-family stops passing through verbatim.

This is the smallest model that delivers richer editing. Linking and a shared gradient library can be retrofitted later without reshaping the data: the structured value is the same whether it lives in a theme token or a component-config slot.

---

## 2. Token model

For each of the six variants (`canvas`, `neutral`, `alternate`, `primary`, `accent`, `special`), a single component-config slot holds a structured gradient value:

```jsonc
// component-configs/sectiondivider/_active.json
{
  "aliases": {
    "--sectiondivider-canvas-gradient": {
      "kind": "gradient",
      "value": {
        "type": "linear",
        "angle": 135,
        "stops": [
          { "color": "--surface-canvas-low",  "position": 0,   "opacity": 100 },
          { "color": "--surface-canvas-high", "position": 50,  "opacity": 100 },
          { "color": "--surface-canvas-low",  "position": 100, "opacity": 100 }
        ]
      }
    },
    // ... same for neutral, alternate, primary, accent, special
  }
}
```

The seven flat tokens per variant (`-gradient-angle`, `-gradient-stop-{1,2,3}-color`, `-gradient-stop-{1,2,3}-position`) disappear from the token registry and from `SectionDivider.svelte`.

The slot's Token entry sets `groupKey: 'gradient'` and `canBeLinked: false` for now. The `kind: 'gradient'` alias is a new alias shape that the editor store needs to understand alongside the existing literal/token kinds.

---

## 3. Editor surface

In `SectionDividerEditor.svelte`, per variant:

- Replace the `GradientCard` block with an inline `GradientEditor` keyed to the variant's gradient slot.
- Beside the gradient ribbon, render a **Monochrome checkbox**. Interactive. Default state on opening the editor is derived: checked when every current stop's color sits within the variant's family, unchecked when any stop is out-of-family. New/migrated gradients are all in-family so the default reads as checked.
- The stop color picker (currently `UIPaletteSelector` inside `GradientEditor`) gains a `familyFilter` prop. When the Monochrome checkbox is checked, the prop is set to the variant's family prefix (e.g. `--surface-primary-`, `--text-primary-`, `--stroke-primary-`); only matching tokens render as enabled and the rest are greyed and unselectable. When unchecked, the prop is unset and the picker shows the full palette. The `GradientEditor` callsite from SectionDivider wires the family + checkbox state through. Other callsites pass nothing and get the full palette unchanged.
- Checking or unchecking the box does not mutate existing stops; it only scopes what's pickable going forward. Out-of-family stops that already exist render normally regardless of the checkbox state.

The "Edit" expand-in-place pattern from `GradientsSection.svelte` is the right interaction model: variant row shows the gradient ribbon and a button to expand the editor inline.

---

## 4. Render path

`SectionDivider.svelte` reads the variant's gradient slot via a small derivation that serializes `GradientToken → CSS gradient string`, and applies it as an inline style:

```svelte
<div class="es-root variant-{variant}" style="background: {gradientCss};">
```

The serializer is ~15 lines (linear/radial, angle, stops with `color-mix(in srgb, var(--token) N%, transparent)` when opacity < 100). The gradient-library code already contains the equivalent; lift it into a shared util.

All variant-specific `:root`/`.variant-*` blocks that define `--sectiondivider-{v}-gradient-*` flat tokens get deleted.

---

## 5. Copy from variant — preserve color families

The existing logic in `VariantGroup.svelte:127–217` does per-token alpha-extract + base-token-swap. It needs a new branch for `kind: 'gradient'` aliases:

```ts
if (srcAlias.kind === 'gradient' || dstAlias.kind === 'gradient') {
  copyGradient(srcAlias.value, dstAlias.value, { preserveFamilies, srcFamily, dstFamily });
}
```

The gradient copy:

1. Start from a clone of source: type, angle, stop count, positions, opacities all verbatim.
2. For each stop, decide per stop:
   - **Position and opacity**: source values, verbatim.
   - **Color**: inspect the source stop's color token. If it matches the source variant's family prefix (e.g. `--surface-success-low` in the success variant), swap the family segment to the destination family (`--surface-success-low` → `--surface-accent-low`). If it does *not* match the source family (a special / pop color the user mixed in), copy the color verbatim. So a polychrome source gradient transfers its family stops to the destination's family while preserving any out-of-family pops as literal references.
3. Write the resulting `GradientToken` to the destination slot.

Worked example: success variant has stops `[--surface-success-low, --surface-success-high, --color-special-mauve]`. Copy to accent with preserve-families on. Destination becomes `[--surface-accent-low, --surface-accent-high, --color-special-mauve]`. The first two stops shift family; the third is preserved verbatim because it's not a family token.

Stop-count mismatch is a non-issue under this model: source dictates the count, destination's prior state is replaced wholesale.

The "preserve color families" checkbox in `CopyFromMenu.svelte` keeps its current meaning. When unchecked, the destination receives a verbatim clone of source colors including the in-family ones (which then render out-of-family on the destination, which is the explicit user intent).

Because there's no linking for the gradient in this iteration, the clone-on-write guard from the previous draft is not needed yet. When linking is added later, we apply the same rule used elsewhere [[feedback_linked_op_invariants]].

---

## 6. Migration

One-time migration of existing `_active.json` and `_production.json` per variant:

1. Read the seven flat tokens.
2. Construct a `GradientToken`:
   - `type: 'linear'`
   - `angle`: parsed from the angle token
   - `stops`: three entries (`color`, `position`, `opacity`) extracted from the existing tokens. Opacity defaults to 100; if the existing color is `color-mix(in srgb, var(--token) N%, transparent)`, opacity is N and color is the unwrapped token.
3. Write a single `kind: 'gradient'` alias entry at `--sectiondivider-{variant}-gradient`.
4. Delete the seven flat alias entries.

Same migration applies to `themes/my-theme.json` and `manifests/my-manifest.json` if they override any of the divider tokens. Backups capture pre-migration state via the standard file lifecycle.

---

## 7. Open questions

1. **Stop count cap.** GradientEditor has none. Leaving uncapped is fine; if the ribbon gets crowded we can revisit.
   OK
2. **Radial allowed?** GradientEditor supports linear and radial. Leaving radial available costs nothing. Default: allow.
   Yes
3. **Family detection.** The picker needs to know each variant's family prefix. Simplest: declare `family: 'canvas' | 'neutral' | …` on each VariantGroup entry in SectionDividerEditor's variant list and pass it to `GradientEditor` via the new `familyFilter` prop. Confirm this is the right place.
   Yes

---

## 8. Risks and tradeoffs

- **Lost per-stop CSS var addressability.** Tokens like `--sectiondivider-primary-gradient-stop-2-color` no longer exist. Grep the starter and `runegoblin-bundle.py` to verify nothing external consumes them before removing.
- **Inline style on SectionDivider.** New pattern in this codebase. ~15 lines for the serializer. Acceptable.
- **New `kind: 'gradient'` alias shape.** Touches the alias-resolution code paths in the editor store. Modest surface area but worth audit-grade testing.
- **Monochrome is a picker scope, not a stored flag.** The data carries no "is monochrome" bit; it's derived from current stop colors on open. This keeps the model simple but means rapidly toggling the checkbox can re-derive the default state in surprising ways if interleaved with edits. Acceptable.
  

---

## 9. Order of work

1. Write the migration: script form first, run against `_active`, `_production`, and any user-authored themes. Verify rendered dividers are pixel-identical to the current bar.
2. Update `SectionDivider.svelte`: drop the seven flat vars, add the inline `style="background: ..."` binding, lift the gradient-token-to-CSS serializer into a shared util.
3. Update `tokens.ts` for SectionDivider: one `Gradient` token per variant with `groupKey: 'gradient'`.
4. Teach the editor store about `kind: 'gradient'` aliases (read, write, resolve).
5. Swap `GradientCard` for `GradientEditor` in `SectionDividerEditor.svelte`. Add the locked Monochrome checkbox beside the ribbon. Pass the variant family to the picker via a new `familyFilter` prop on `GradientEditor` / `UIPaletteSelector`.
6. Add the `gradient` branch to `pickCopySource` in `VariantGroup.svelte` with the family-swap helper.
7. Remove `GradientCard.svelte` if no other component consumes it (grep first).
8. Smoke-test all six variants in the demo page; confirm the bar renders correctly and Copy-from-variant + preserve-families still produces the expected family-substituted result.
