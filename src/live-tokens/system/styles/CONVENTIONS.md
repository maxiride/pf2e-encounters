# Token naming conventions

This project uses a **two-layer token system**. Read this before adding or renaming a CSS custom property.

## Files in this directory

Each file plays a distinct role. Don't merge them without understanding why they were split.

| File | Scope | Tokens used | Loaded by | Notes |
|---|---|---|---|---|
| `tokens.css` | Themed pages | Defines `--color-*`, `--surface-*`, `--text-*`, `--space-*`, … | `main.ts` | **Runtime-edited.** The token editor rewrites this file via the `themeFileApi` Vite plugin. Starter content; consumers replace at will. |
| `ui-editor.css` | Editor chrome only | Defines `--ui-*` (opaque grayscale, system fonts) | JS-imported by `Editor.svelte` and `ComponentEditorPage.svelte` | Deliberately isolated from the theme system so editor surfaces stay neutral while live theme edits flow through the components being edited. Never load globally. |
| `ui-form-controls.css` | Editor chrome only | Consumes `--ui-*` only | JS-imported by `Editor.svelte` and `ComponentEditorPage.svelte` | `.ui-form-select` / `.ui-form-input` / `.ui-form-field-*` classes. Used by `ProjectFontsSection`, `FontStackEditor`, `DialogEditor`, `NotificationEditor`. Theme-immune — must not reference `--font-*`, `--surface-*`, etc. |
| `site.css` | Themed pages | Consumes theme tokens | Page-imported by `Home.svelte` | Consumer-facing starter typography for the landing page (unscoped `h1`, `p`, `a`, …). Never load on editor pages. Replaceable starter content — users edit or replace this file to style their own site. Components that take slot content (Card body, CollapsibleSection content) defend their typography aliases against these global rules via `:global(p) { font: inherit; color: inherit; }`. The demo page no longer imports it; the demo uses scoped classes and component-owned slot typography instead. |
| `fonts.css` + `fonts/` | Themed pages only | n/a (`@font-face` only) | `main.ts` | Build-special-cased: copied directly to `dist/` without processing so Vite doesn't inline woff2 files as base64. Starter content; editor's font invariant means these never affect chrome. |

### Publishing layout

The library publishes a small set of subpaths:

- `./styles/ui-editor.css` — read-only window onto the editor's `--ui-*` token contract (for theming inspection or debugging). Consumers don't *need* to import this; the editor pages auto-load it.
- `./starter/tokens.css`, `./starter/site.css`, `./starter/fonts.css` — replaceable starter content. Consumers can import as-is for a working default, or copy + edit.

`ui-form-controls.css` is editor-internal and not exported — the editor pages script-import it themselves.

### Editor font invariant

Editor chrome uses **only** the `--ui-*` font namespace (`--ui-font-sans`, `--ui-font-mono`, `--ui-font-size-*`, etc.), which `ui-editor.css` defines as a pure system stack. No editor-namespace rule may reference `var(--font-sans)`, `var(--font-serif)`, `var(--font-display)`, or `var(--font-mono)` — those are the consumer's theme fonts and must not bleed into chrome. This invariant is what closes the "editor adopts consumer brand fonts" leak.

### When to put a rule where

- It defines a `--color-*` / `--surface-*` / `--space-*` / etc. → `tokens.css`.
- It defines a `--ui-*` token → `ui-editor.css`.
- It styles a bare element selector (`h1`, `p`, `blockquote`) on themed pages → `site.css`.
- It styles editor chrome → put it in the component's own `<style>` block using `--ui-*` tokens; don't add a new global file.
- It declares an `@font-face` → `fonts.css` (and add the woff2 to `fonts/`).

## Layer 1 — theme tokens (`tokens.css`)

Theme tokens are the design system's vocabulary. They describe colors, sizes, spacing, shadows, and motion: the things a designer reasons about independent of any one component. Components consume them, and themes in `themes/*.json` recolor or re-scale them.

### Category-first naming

Every theme token starts with a **category prefix**. The category tells you what *kind* of value lives at that key:

| Category       | What it holds                                                   |
|----------------|-----------------------------------------------------------------|
| `--color-*`    | Primitive color palette (e.g. `--color-accent-500`)             |
| `--surface-*`  | Fill/background colors, with elevation tiers                    |
| `--border-*`   | Border colors, with emphasis tiers                              |
| `--text-*`     | Text colors, with hierarchy tiers                               |
| `--font-*`     | Font families and weights                                       |
| `--font-size-*`| Font sizes (explicit subcategory to avoid colliding with families) |
| `--space-*`    | Spacing scale, values encoded in the name (`--space-8` = 8px)   |
| `--radius-*`   | Border radii (t-shirt scale)                                    |
| `--shadow-*`   | Elevation shadows                                               |
| `--ring-*`     | Focus rings (separate namespace from shadows)                   |
| `--border-width-*` | Stroke widths                                               |
| `--transition-*`, `--opacity-*`, `--z-*` | Animation, opacity, z-index scales    |
| `--overlay-*`, `--hover-*` | Semantic overlay tints                                |
| `--gradient-*` | Named gradients                                                 |
| `--columns-*`, `--page-*` | Page-level layout primitives                         |

**Rule: a bare one-word token belongs to *some* category.** If you find yourself writing `--overlay` or `--border`, make sure the category is obvious and it's the canonical default. Otherwise pick a longer name that slots it into its family (e.g. `--border-neutral`).

### Families within a category

Color categories (`--surface-*`, `--border-*`, `--text-*`) partition into **families**: `neutral`, `canvas`, `primary` (*→ brand, rename pending*), `accent`, `success`, `warning`, `danger`, `info`, `special`, `alternate`. Each family carries its own emphasis/elevation scale suited to its role: 7-step elevation for surfaces, 4-step emphasis for borders, 5-step hierarchy for text. They differ on purpose.

### Scales

Two shapes appear:

- **T-shirt scale** (`-xs / -sm / -md / -lg / -xl / -2xl …`). Used for `--radius-*`, `--font-size-*`, `--shadow-*`, `--ring-focus-*`.
- **Numeric scale.** `--color-*-100` through `--color-*-950` for palettes; `--space-4 / -8 / -16 / …` (value encoded in the name).

Don't invent a third scale shape for a new category.

## Layer 2 — component tokens (`component-configs/*/default.json` + component Svelte files)

Component tokens *reference* theme tokens. They're how a component names its own slots: "my bar's surface color", "my selected option's border width". The config file records which theme alias is currently assigned to each slot.

### The naming scheme

```
--<componentId>-<part>[-<state>][-<element>]-<property>
```

- **`componentId`.** The literal component ID. No abbreviations. The ID itself has no dashes (it's the file-system-safe form: `segmentedcontrol`, not `segmented-control`).
- **`part`.** Which part of the component this slot belongs to: `bar`, `divider`, `option`, `selected`, `track`, `save`, `cancel`, etc.
- **`state`.** Optional. The interaction state if more than default: `hover`, `disabled`, `active`, `focus`. States come **before** the property, never after.
- **`element`.** Optional. A sub-element within the part: `dot`, `icon`, `label`, `text`.
- **`property`.** Always last. Either a **theme role** (`surface`, `border`, `text`, `icon`, `label`, `fill`) or a **CSS property name** (`radius`, `border-width`, `font-weight`, `font-family`, `font-size`).

### No abbreviations

- `bg` → `surface` (matches the theme role name and the theme layer's full-word vocabulary).
- `fg` → `text`.
- Component IDs are never abbreviated. Use `--segmentedcontrol-*`, not `--segment-*` or `--sc-*`.

### Property suffix vocabulary

| Suffix         | Meaning                                                      |
|----------------|--------------------------------------------------------------|
| `-surface`     | Fill/background color                                        |
| `-border`      | Border color                                                 |
| `-text`        | Text color                                                   |
| `-icon`        | Icon color                                                   |
| `-label`       | Label text color                                             |
| `-fill`        | Inner fill (distinct from outer surface)                     |
| `-radius`      | Corner radius                                                |
| `-border-width`| Stroke thickness                                             |
| `-font-family` | Font family reference                                        |
| `-font-weight` | Font weight reference                                        |
| `-font-size`   | Font size reference                                          |
| `-thickness`   | Alternative stroke dimension (used where `-width` would alias another token under name-based fallback grouping) |
| `-height`      | Explicit height when `-width`'s sibling would collide under name-based fallback grouping |
| `-color`       | Generic color when none of the role words fits (rare)        |

**Why `thickness` and `height` sometimes stand in for `width`:** when an editor declares no explicit `groupKey` for a token, sibling grouping falls back to matching the final `-<property>` segment. If two unrelated slots both end in `-width` and neither has a `groupKey`, they get auto-linked. Either declare a `groupKey` per token in the editor (preferred) or use an alternative property word. The divider in SegmentedControl uses `--segmentedcontrol-divider-thickness` for legacy parity with the fallback rule, but it now also has `groupKey: 'divider-thickness'` declared in the editor. The `groupKey` is the source of truth.

### State order matters

State comes **before** the property, not after:

```
--inlineeditactions-save-hover-surface    ✓  state before property; siblings on `-surface`
--inlineeditactions-save-surface-hover    ✗  breaks sibling matching and reads oddly
```

### Linked siblings (the link toggle)

Tokens that share a `groupKey` form a **sibling set**. A property declared `canBeLinked: true` in the editor shows a link toggle that lets the user broadcast one value across every sibling. So in SegmentedControl:

- `--segmentedcontrol-bar-border-width` and `--segmentedcontrol-selected-border-width` share `groupKey: 'border-width'`.
- `--segmentedcontrol-option-text-font-weight`, `--segmentedcontrol-option-disabled-text-font-weight`, and `--segmentedcontrol-selected-text-font-weight` share `groupKey: 'font-weight'`.

Editor authors declare `groupKey` per token in the editor's token list (and call `registerComponentSchema(component, tokens)` once at module load). The store consults the schema first; for unmigrated editors with no schema entry, it falls back to matching the last `-<property>` segment. Tokens with neither a `groupKey` nor a colliding name suffix are solo.

Linkage is **dev-declared** — the editor schema is the source of truth for which variables share a `groupKey`. Users only choose whether to opt out of an existing link (per-property), never to add or reshape one.

The `unlinked` array on a `ComponentSlice` stores the variable names the user has explicitly detached. The remaining declared siblings stay linked to each other; an unlinked variable rejoins via `setComponentAliasLinked` or `relinkComponentProperty`.

### Typography slot scoping

When a component declares more than one typography slot — e.g. a notification with separate `title` and `text` slots — every typography `groupKey` (`font-family`, `font-size`, `font-weight`, `line-height`) **must** include the slot name as a prefix:

```
groupKey: 'title-font-family', 'text-font-family'   ✓  one link tree per slot
groupKey: 'font-family'                              ✗  silently links title and text together
```

A bare typography `groupKey` like `'font-family'` is fine when the component has only one typography slot (Button has only `text`; RadioButton only `label`; CollapsibleSection only `label`). Add a slot prefix the moment the component grows a second slot.

`registerComponentSchema` emits a console warning at runtime if a single `groupKey` covers variables whose name-derived slots differ. Treat that warning as a build-time error.

### When the last-dash fallback surprises you

For tokens without an explicit `groupKey`, the store derives one by splitting on the last dash:

- `--segmentedcontrol-option-text-font-weight` → fallback groupKey `weight`.

So the fallback property is always the literal last segment. If you don't want a token to participate in the fallback grouping, declare an explicit `groupKey` (or omit `canBeLinked`).

## Checklist for adding a new component token

1. Does the value belong at the **theme layer**? (It's a color or scale that multiple components could reuse.) → Add it to `tokens.css` under the correct category, not here.
2. Pick a **componentId** matching the one used in `component-configs/` and the editor's `const component = '...'` literal.
3. Build the name as `--<componentId>-<part>[-<state>]-<property>`.
4. Use **full words**: no `bg`, no shortened component IDs.
5. Declare the slot in both the component's Svelte `<style>` (`--tok: var(--theme-alias);`) and the config JSON (`"--tok": "--theme-alias"`).
6. If the slot should link across variants, add `canBeLinked: true` and `groupKey: '<your-key>'` in the editor's token list. Siblings are tokens that share the same `groupKey`. Pick a `groupKey` that names the kind of property (`radius`, `border-width`, `font-weight`, `font-family`, etc.); a unique key isolates a token from any other. For typography on multi-slot components, prefix the slot name (see "Typography slot scoping").
7. Make sure the editor calls `registerComponentSchema(component, tokens)` once at module load so the store sees the explicit groupKeys.

## What's still pending

- **`primary` → `brand` rename.** Disambiguates the emphasis-tier, color-family, and component-variant uses of "primary." Tracked in `temp/primary-to-brand-rename.md`.
- **Theme-layer cleanups** tracked in `temp/theme-token-improvements.md`: font-weight scale normalization, bare-word orphan audit, full `bg` → `canvas` sweep.
