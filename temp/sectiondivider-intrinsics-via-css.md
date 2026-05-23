# SectionDivider intrinsics via CSS — audit doc

Trigger: `Section Divider · Medium` in the editor was set to `alignment: Start`, but `The Kit` divider on `/demo` rendered centered. Investigation showed the editor's per-variant *intrinsics* — alignment, hairline position, show-eyebrow, show-description, show-hairline, eyebrow-uppercase — only ever reach the editor's own preview. They never flow to a real consumer's `<SectionDivider>` instance.

This doc is for discussion before code changes. The proposal: drive these intrinsics through CSS variables, exactly the way colors / padding / fonts already work — so the host page picks them up automatically with no per-consumer wiring.

The variant *type* stays hard-coded at the call site (`<SectionDivider variant="lg" ... />`). Everything about how that variant looks is editor-controlled and cascades through `:root`.

---

## 1. Audit — does anyone else have this gap?

Searched `src/system/components/` for `import { editorState }`:

| Component | Subscribes to editor? | Has per-variant intrinsic state? | Notes |
|---|---|---|---|
| Dialog | **Yes** (`Dialog.svelte:5,42-44`) | Yes — `--dialog-confirm-variant`, `--dialog-cancel-variant` | Falls back to config when `confirm.variant` / `cancel.variant` aren't passed by the consumer. |
| SectionDivider | No | **Yes — six keys × three variants** | Config stored, but only `SectionDividerEditor.svelte` reads it. Live consumers ignore it. **This is the bug.** |
| Notification, Card, Callout, CollapsibleSection, Button, Badge, Tooltip, Table, SegmentedControl, etc. | No | No | All dynamic behavior (variant, icon, label, actions) is content passed at the call site. Nothing intrinsic is stored per-variant in the editor. |

Conclusion: this isn't "untested in other components." Only **Dialog** has ever attempted to cascade intrinsics from the editor to the live component, and it did so via direct store subscription — a one-off pattern, not a system. SectionDivider added per-variant intrinsics later but never wired the flow. There is no general mechanism for "designer changes a variant in the editor → markup updates everywhere it renders."

The closest thing we *do* have that works universally is the CSS-var → `:root` → `cssVarSync` pipeline. Colors, padding, fonts, gradients all flow through it. The intrinsics just need to join it.

---

## 2. Production / dev story comes free

The user noted: the fix should pull from production state at build time and editor state in dev. With the CSS-driven model there's no split to manage:

- **Dev:** `cssVarSync` puts the editor's live values on the host page's `:root` (and the iframe's `:root`). The component reads `var(--sectiondivider-md-align)` and reacts.
- **Production:** the editor's saved component config gets serialized to the built component CSS file. Same vars on `:root`. The component reads them the same way. No editor present.

Same code path either way. This is why colors already work.

The only thing that needs to change is the *encoding* — today the intrinsics live in `editorState.components.sectiondivider.config` as plain key/value pairs (`'--sectiondivider-md-align': 'start'`). They never get written to `:root` because `KNOWN_COMPONENT_CONFIG_KEYS` (componentConfigKeys.ts:16) marks them as "config, not cascade." We need to flip them to cascade.

---

## 3. Mapping each intrinsic to CSS

Every one of SectionDivider's six intrinsics has a pure-CSS expression. The component renders the markup unconditionally and CSS does the hiding/aligning per variant.

### 3.1 Alignment
Today: `align: 'start' | 'center'` → component branches on `class:align-start` / `class:align-center` → sets `align-items`, `text-align`, `--_divider-justify`.

CSS form: one var per variant carrying the keyword. Both `align-items` and `text-align` accept `start | center` directly in modern CSS, so one var feeds both.

```css
.variant-md {
  --_divider-align: var(--sectiondivider-md-align, center);
}
.section-divider {
  align-items: var(--_divider-align);
  text-align: var(--_divider-align);
  --_divider-justify: var(--_divider-align); /* used by the hairline-side flex layout */
}
```

Editor writes: `--sectiondivider-md-align: start` or `--sectiondivider-md-align: center`.

### 3.2 Eyebrow visibility + uppercase
Today: `{#if eyebrow}` branches; `eyebrowUppercase` prop toggles `class:uppercase`.

CSS form: the eyebrow markup is always rendered when the consumer passes content; the variant decides whether it displays and whether it's uppercased.

```css
.section-divider.variant-md .divider-eyebrow {
  display: var(--sectiondivider-md-eyebrow-display, block);
  text-transform: var(--sectiondivider-md-eyebrow-text-transform, none);
}
```

Editor writes:
- `--sectiondivider-md-eyebrow-display: none | block`
- `--sectiondivider-md-eyebrow-text-transform: none | uppercase`

Open question: what if the consumer doesn't pass `eyebrow` content at all? Then there's nothing to render and nothing to hide — same as today. The variant's `display: block` only "shows" if content exists.

### 3.3 Description visibility
Same shape as eyebrow.

```css
.section-divider.variant-md .description-row {
  display: var(--sectiondivider-md-description-display, flex);
}
```

Editor writes: `--sectiondivider-md-description-display: none | flex`.

### 3.4 Hairline visibility + position
The trickiest one. Today: one prop `hairline?: { position }` controls both whether a hairline shows and where. Position is one of six mutually exclusive values.

**Recommended encoding:** a single var that carries `none | above-label | through-label | below-label | above-description | through-description | below-description`. "none" means hairline is off; any position means it's on at that position.

```css
/* Render all six positions in the DOM, hide all by default. */
.section-divider .sd-hairline { display: none; }

/* Activate one via style query. Requires the divider element to declare
   container-type so style() queries resolve inside it. */
.section-divider { container-name: sd; container-type: style; }

@container sd style(--sectiondivider-md-hairline: above-label) {
  .variant-md .sd-hairline-above-label { display: block; }
}
@container sd style(--sectiondivider-md-hairline: through-label) {
  .variant-md .sd-hairline-through-label { display: block; }
}
/* ...etc for the other 4 positions */
```

Editor writes: `--sectiondivider-md-hairline: above-label` (or `none`).

**Alternative if container style queries are off the table** (browser support concerns, etc.): use six separate display vars per variant. Verbose at the editor's serialization layer, but the component CSS stays simple. The editor handles "set active = block, others = none" bookkeeping.

```css
.variant-md .sd-hairline-above-label    { display: var(--sectiondivider-md-hairline-above-label-display, none); }
.variant-md .sd-hairline-through-label  { display: var(--sectiondivider-md-hairline-through-label-display, none); }
/* ...etc */
```

**Decision:** container style queries. One var per variant is much cleaner than six, and they're supported in all evergreen browsers as of 2026. If a browser-support problem appears later, the encoding can be switched without changing the consumer surface.

### 3.5 Description-targeted hairline + description hidden
Today `SectionDividerEditor.svelte:314-321` snaps the position back to a title-targeted choice if description is turned off mid-edit. With CSS-driven visibility, no snap is needed at runtime — if `.description-row` is `display: none` and the hairline is `above-description`, the hairline element is positioned in the gap but the description above/below it is invisible, so visually it lands where `below-label` would. We can make this exact by:

**Decision:** `display: none` on `.description-row` also suppresses description-targeted hairlines via a second container style query. No editor-side snap logic needed at runtime.

```css
@container sd style(--sectiondivider-md-description-display: none) {
  .variant-md .sd-hairline-above-description,
  .variant-md .sd-hairline-through-description,
  .variant-md .sd-hairline-below-description { display: none; }
}
```

---

## 4. Migration

Old config keys (in `KNOWN_COMPONENT_CONFIG_KEYS`):

| Old key | Old value | New key | New value |
|---|---|---|---|
| `--sectiondivider-{v}-align` | `start \| center` | same | same (lucky — keyword identical) |
| `--sectiondivider-{v}-show-eyebrow` | `'1' \| ''` | `--sectiondivider-{v}-eyebrow-display` | `block \| none` |
| `--sectiondivider-{v}-show-description` | `'1' \| ''` | `--sectiondivider-{v}-description-display` | `flex \| none` |
| `--sectiondivider-{v}-show-hairline` + `--sectiondivider-{v}-hairline` | `'1' \| ''` + position | `--sectiondivider-{v}-hairline` | `none \| <position>` (merged) |
| `--sectiondivider-{v}-eyebrow-uppercase` | `'1' \| ''` | `--sectiondivider-{v}-eyebrow-text-transform` | `uppercase \| none` |
| `--sectiondivider-{v}-color-family` | family name | same | same (still config, doesn't cascade — drives editor's family swap) |

`color-family` stays in the config bucket. It's editor metadata, not a runtime value — the family swap rewrites aliases at edit time and then the rewritten aliases cascade through the normal token path.

New migration file: `src/editor/core/themes/migrations/2026-05-22-sectiondivider-intrinsics-to-css.ts`.

After migration, `KNOWN_COMPONENT_CONFIG_KEYS` loses every SectionDivider entry except `--sectiondivider-{v}-color-family`. The other keys become cascading CSS vars handled by the normal alias / component-token pipeline.

---

## 5. What changes in the component file

- Drop the `align` / `hairline` / `eyebrowUppercase` props. Variant alone fully determines them.
- Drop the conditional `{#if eyebrow}` / `{#if description !== undefined}` blocks — render the markup if content is non-empty, let CSS hide it.
- Drop the `aboveLabel / throughLabel / belowLabel / aboveDesc / throughDesc / belowDesc` derived booleans and the conditional hairline rendering. Render all six hairlines as siblings; CSS picks one (or none) via the container style query.
- Add the per-variant CSS-var declarations in section 3 above. Defaults sit on `:root` so an un-edited install renders sanely.
- Drop the `hairlineStyle()` helper and the `hairline.thickness` / `hairline.gradient` per-instance override path entirely. Variants are the single source of truth for hairline visuals.

---

## 6. What changes at consumer sites

`Section.svelte`: adds an `eyebrow?: string` prop that passes through to `<SectionDivider>`. Still passes `{title}`, `{description}`, `{variant}` unchanged.

Demo sections: at least one section passes an `eyebrow` value so the editor's show-eyebrow toggle has visible effect on `/demo`. The others stay eyebrow-less and use the existing call shape.

---

## 7. Dialog

Dialog uses the same anti-pattern (component imports `editorState` to resolve intrinsics). Its case is harder to CSS-ify because `confirm.variant` is a Button class, not a CSS property. Worth its own audit; out of scope for this fix. Until then, Dialog stays as-is — it works because someone wired the subscription manually, which is exactly the magic we're trying to retire.

---

## 8. Decisions settled

1. **Hairline position encoding:** container style queries. One var per variant (`--sectiondivider-{v}-hairline: above-label | through-label | below-label | above-description | through-description | below-description | none`), `@container` style rules activate the matching span. Six-display-vars approach mentioned in section 3.4 is unused.
2. **Per-instance overrides:** dropped. Variant is the contract; consumers cannot pass `hairline.thickness` / `hairline.gradient` to override the variant's defaults. The `hairline` prop on the component is removed entirely — the variant's CSS vars on `:root` are the sole source.
3. **Content suppression:** silent. No console warning when a consumer passes content (e.g. `eyebrow="Foo"`) that the active variant has set to `display: none`. The variant's visibility decision is final.
4. **Demo wiring:** `Section.svelte` gains an `eyebrow` prop. At least one demo section passes an eyebrow so the editor's show-eyebrow toggle has visible effect on `/demo`.
5. **Migration:** bundled with the component refactor in a single PR. The migration converts old config keys to new CSS-var keys atomically with the component and editor changes.

Implementation is a single PR touching: `SectionDivider.svelte` (markup + CSS rewrite), `SectionDividerEditor.svelte` (`setCfg` calls write new keys, `getShow*` readers translate to display strings), `componentConfigKeys.ts` (remove cascading keys, keep `color-family`), `Section.svelte` (add `eyebrow` prop), one demo section file (pass an eyebrow), and a new migration `2026-05-22-sectiondivider-intrinsics-to-css.ts`.
