---
name: live-tokens-create-component
description: Author a brand-new editable component for a @motion-proto/live-tokens project when nothing in the shipped catalogue fits. Covers the runtime Svelte file with :global(:root) tokens, the editor Svelte file with allTokens + VariantGroup, the registerComponent() call, naming conventions, state model, public-imports rule, and verification. Use when the user asks to author / create / build / extend a new tokenized component, make an existing Svelte component editable in the live-tokens editor, add a new component to the catalogue, register a custom component with the editor, or build a [Thing] component that does not exist in the shipped set. Not for placing an existing shipped component (Button, Card, etc.) on a page (see live-tokens-build-page); read live-tokens-pick-component first to confirm nothing in the catalogue fits.
---

# Authoring a component for a live-tokens project

This skill teaches you how to add a new editable component to a project that consumes `@motion-proto/live-tokens`. The end state: a runtime Svelte file, an editor Svelte file, one `registerComponent()` call, and a `/components` page entry under the **CUSTOM** group with full token editing, linked-block sharing, and persistence.

## Worked examples ship inside the package

For pattern reference, read any shipped component's source directly from the consumer's `node_modules`:

- Runtime files: `node_modules/@motion-proto/live-tokens/src/system/components/<Name>.svelte`.
  - Simplest reads (no state, no linked-block): `Card` (single variant with parts), `Badge` and `Callout` (multi-variant).
  - Multi-state (hover, disabled, focus): `Button`, `Input`.
  - Multi-part (overlay / header / body / footer): `Dialog`.
  - Multi-variant with linked siblings (`canBeLinked` + `groupKey`): `SegmentedControl`, `TabBar`.
  - Composes another shipped component: `CodeSnippet` (renders a `Tooltip` for the copy-confirmation popover).
- Editor files: `node_modules/@motion-proto/live-tokens/src/editor/component-editor/<Name>Editor.svelte`.

**File-location note.** Shipped editors live in `src/editor/component-editor/` because they're library-internal. For *your* component, **co-locate** both files in `src/system/components/` per the recipe below. Read the shipped files for pattern, ignore their location.

## 4-step recipe

1. **Runtime file** — `src/system/components/MyWidget.svelte`. Declare every editable slot as a CSS custom property inside `:global(:root)`, defaulting to a theme token (never a raw value). The plugin parses `:global(:root)` to seed `component-configs/<id>/default.json`; variables declared anywhere else can't be edited.
2. **Editor file** — `src/system/components/MyWidgetEditor.svelte`. In a `<script module>` block, declare `const component = 'mywidget'`, build a `states: Record<string, Token[]>` for each VariantGroup, and export the flat union as `allTokens: Token[]`. Components with linked siblings also build a `linkableContexts: Map<string, string>` (see the linked-siblings extension below). In the runtime `<script>` block, mount `ComponentEditorBase` with one `VariantGroup` per variant.
3. **Register** — in `src/main.ts` before `mount(App, ...)`:
   ```ts
   import { registerComponent } from '@motion-proto/live-tokens';
   import MyWidgetEditor, { allTokens as myWidgetTokens } from './system/components/MyWidgetEditor.svelte';

   registerComponent({
     id: 'mywidget',
     label: 'My Widget',
     icon: 'fas fa-magic',
     sourceFile: 'src/system/components/MyWidget.svelte',
     editorComponent: MyWidgetEditor,
     schema: myWidgetTokens,
   });
   ```
   The schema side-effect happens inside `registerComponent`, so you don't call `registerComponentSchema` separately.
4. **Tell the picker** — open `.claude/skills/live-tokens-pick-component/SKILL.md` and add your new component to the **Catalogue** line under the family it belongs to (Action / Input / Selection / Containers / Messaging / Display). If it's confusable with an existing component (a second selection control, a competing container), add a row to that family's decision table explaining the use-case it owns. Without this step, the component exists but [[live-tokens-pick-component]] can't recommend it when a user asks "which component should I use?" — the same rule applies whether the component is first-party (update the picker shipped in this package) or consumer-authored (update the local copy at `.claude/skills/live-tokens-pick-component/SKILL.md` that `setup-claude` placed in your project).
5. **Verify** — open `/components` and run the verification checklist at the bottom of this file.

## Token discipline

### Naming scheme

```
--<componentId>-<part>[-<state>][-<element>]-<property>
```

- `componentId` — the literal id passed to `registerComponent()`. Lowercase, no dashes, no abbreviations (`segmentedcontrol` not `sc`). The file id matches: `MyWidget.svelte` → id `mywidget`.
- `part` — sub-region (`bar`, `option`, `track`, `header`, `body`, `footer`, `overlay`, `value`, `label`).
- `state` (optional) — interaction or component state (`hover`, `disabled`, `selected`, `focus`). **Always before the property.**
- `element` (optional) — sub-element inside the part (`dot`, `icon`, `label`, `text`).
- `property` — theme role or CSS property. Always last.

### Suffix vocabulary

The editor picker is chosen by suffix. There is no per-token override; if a token renders with the wrong picker, rename it to one of these suffixes.

**Color and surface**

| Suffix      | Meaning                                                       |
|-------------|---------------------------------------------------------------|
| `-surface`  | Fill / background color                                        |
| `-border`   | Border color                                                  |
| `-text`     | Text color                                                    |
| `-icon`     | Icon color                                                    |
| `-label`    | Label text color                                              |
| `-fill`     | Inner fill (distinct from outer surface)                      |
| `-divider`  | Divider / separator color                                     |
| `-color`    | Generic color, when none of the above name the role           |
| `-shadow`   | Box-shadow                                                    |
| `-opacity`  | Opacity (0–1)                                                 |
| `-blur`     | Backdrop or filter blur radius                                |

**Geometry**

| Suffix          | Meaning                                                       |
|-----------------|---------------------------------------------------------------|
| `-radius`       | Corner radius                                                 |
| `-border-width` | Stroke thickness (used even when CSS uses `outline:`)         |
| `-thickness`    | Alternative to `-width` when fallback siblings would collide  |
| `-width`        | Width dimension                                               |
| `-size`         | Square / uniform dimension                                    |
| `-padding`      | Internal spacing                                              |
| `-gap`          | Spacing between sibling elements                              |

**Typography**

| Suffix             | Meaning                  |
|--------------------|--------------------------|
| `-font-family`     | Font family reference    |
| `-font-weight`     | Font weight reference    |
| `-font-size`       | Font size reference      |
| `-line-height`     | Line height              |
| `-letter-spacing`  | Letter spacing           |

The authoritative recognised list lives in `bin/check-component.mjs` (`KNOWN_SUFFIXES`). If you need a suffix that isn't listed, either rename to one that is, or open an issue against `@motion-proto/live-tokens` to add it. Don't invent suffixes; the editor falls back to a plain text input and your token won't get a real picker.

### Rules that bite

- **State before property.** `--mywidget-button-hover-surface` ✓ — `--mywidget-button-surface-hover` ✗ (breaks sibling matching).
- **Defaults reference theme tokens, never raw values.** `var(--surface-primary)` ✓ — `#6a4ce8` ✗.
- **No abbreviations.** `bg` → `surface`; `fg` → `text`; component ids are never abbreviated.
- **Text aliases.** Neutral scale is `--text-primary` / `--text-secondary` / `--text-tertiary` / `--text-muted` / `--text-disabled`. Family-tinted is `--text-primary-color`, `--text-accent`, `--text-success`. There is no `--text-neutral`.
- **Typography `groupKey` on multi-slot components must include the slot prefix.** `groupKey: 'value-font-family'` and `groupKey: 'label-font-family'` ✓ — bare `groupKey: 'font-family'` silently merges them into one link tree ✗. Single-slot components can use a bare typography `groupKey`; add the slot prefix the moment a second slot appears.

### Linked siblings

Tokens that share a `groupKey` and declare `canBeLinked: true` form a sibling set with a link toggle in the editor. Linkage is **dev-declared** — you author it when building the component. Users opt out of an existing link per-property; they never add or reshape links. Do not expose UI for users to add siblings or mark properties as linkable.

## State model

Components *can* have two state axes. Many don't: container and messaging components (Card, Badge, Callout, CollapsibleSection) have only variants, no hover/disabled. Skip the rest of this section for those.

When a component does have states, don't mix the two axes:

- **Component states** — mutually exclusive top-level fieldsets: `default`, `selected`, `disabled` (names vary by component). One fieldset per component state.
- **Interaction states** — a select *inside* each component-state fieldset: `default`, `hover`. Add `focus`/`active` later if needed.

Rules:

- **Disabled is terminal.** A disabled component can't be hovered or focused. The `disabled` fieldset is flat — no interaction selector.
- **`selected-disabled` is impossible.** Don't author tokens or fieldsets for it.
- **Parts ≠ states.** Dialog's `overlay | header | body | footer` are *parts* (all present simultaneously), not states. The VariantGroup tab strip defaults its label to "Element" (neutral). If you label tabs anywhere, use **part** for structure and **state** for runtime conditions. Never call a footer a state.
- **Don't call interaction states "option states" or "selected states"** in the UI. `selected` is a *component* state.

Token naming consequence:

```
--mywidget-disabled-surface          ✓  component-state-level
--mywidget-option-disabled-surface   ✗  implies disabled is an interaction state
--mywidget-option-hover-surface      ✓  default-component-state, hover-interaction
--mywidget-selected-hover-surface    ✓  selected-component-state, hover-interaction
--mywidget-selected-disabled-text    ✗  selected-disabled doesn't exist
```

## User-facing copy

Strings you author for the editor UI use periods and commas, never em-dashes. Em-dashes read as an AI tell. This applies to `title=` and `description=` on `ComponentEditorBase`, token row labels, info popovers, and any text inside `previewActions` / `canvasToolbarExtras` snippets. Code comments are unaffected.

If you add custom chrome inside an editor snippet (rare — `ComponentEditorBase` and `VariantGroup` carry the standard chrome), keep it greyscale (no accent colors) and reference heading sizes via `--ui-font-size-md` / `-lg` / `-2xl` rather than pixel literals.

## Public imports only

Imports in your runtime, editor, and `main.ts` come from exactly two paths:

```ts
import { registerComponent, editorState } from '@motion-proto/live-tokens';
import {
  ComponentEditorBase, VariantGroup,
  computeLinkedBlock, withLinkedDisabled, buildSiblings,
} from '@motion-proto/live-tokens/component-editor';
import type { Token } from '@motion-proto/live-tokens/component-editor';
```

That covers everything the worked examples use. Additional primitives (`LinkedBlock`, `TypeEditor`, `TokenLayout`, `buildTypeGroupTokens`, more types) are exported from the same paths for advanced cases.

**Never deep-import `node_modules/@motion-proto/live-tokens/src/...`.** Reading those files for pattern reference is fine; importing them at runtime is not. If you need something not exported, file an issue rather than reaching in.

## Worked example: shipped Toggle, end-to-end

Toggle ships in the package and exercises every rule above. For your own component, copy this pattern and substitute your id; just don't reuse `toggle` itself (registrations against a built-in id win with a console warning, but the right call is a unique id).

### Runtime: `src/system/components/Toggle.svelte`

```svelte
<script lang="ts">
  interface Props {
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    /** Editor preview hook. Paints hover tokens without a real pointer. */
    class?: string;
    onchange?: (checked: boolean) => void;
  }
  let {
    checked = false, disabled = false, label = '',
    class: className = '', onchange,
  }: Props = $props();
  function toggle() {
    if (disabled) return;
    onchange?.(!checked);
  }
</script>

<button
  type="button" role="switch" aria-checked={checked}
  class="toggle {className}" class:on={checked}
  {disabled} onclick={toggle}
>
  <span class="track"><span class="thumb"></span></span>
  {#if label}<span class="label">{label}</span>{/if}
</button>

<style>
  :global(:root) {
    /* Default (off resting). Carries geometry + label typography for every state. */
    --toggle-track-surface: var(--surface-neutral);
    --toggle-track-border: var(--border-neutral);
    --toggle-track-border-width: var(--border-width-1);
    --toggle-track-radius: var(--radius-full);
    --toggle-track-width: var(--space-32);
    --toggle-track-thickness: var(--space-16);
    --toggle-thumb-surface: var(--surface-neutral-highest);
    --toggle-thumb-border: var(--border-neutral-strong);
    --toggle-thumb-size: var(--space-12);
    --toggle-label-text: var(--text-primary);
    --toggle-label-font-family: var(--font-sans);
    --toggle-label-font-size: var(--font-size-sm);
    --toggle-label-font-weight: var(--font-weight-normal);
    --toggle-gap: var(--space-8);

    /* Hover (default + hover interaction). */
    --toggle-hover-track-surface: var(--surface-neutral-high);
    --toggle-hover-thumb-surface: var(--text-primary);

    /* On (component state). */
    --toggle-on-track-surface: var(--surface-brand-high);
    --toggle-on-track-border: var(--border-brand);
    --toggle-on-thumb-surface: var(--text-primary);
    --toggle-on-thumb-border: var(--border-brand-strong);

    /* On + hover. */
    --toggle-on-hover-track-surface: var(--surface-brand-higher);
    --toggle-on-hover-thumb-surface: var(--text-primary);

    /* Disabled (terminal, applies regardless of on/off). */
    --toggle-disabled-track-surface: var(--surface-neutral-lower);
    --toggle-disabled-thumb-surface: var(--surface-neutral);
    --toggle-disabled-label-text: var(--text-disabled);
  }

  .toggle { display: inline-flex; align-items: center; gap: var(--toggle-gap); }
  .track {
    width: var(--toggle-track-width); height: var(--toggle-track-thickness);
    background: var(--toggle-track-surface);
    border: var(--toggle-track-border-width) solid var(--toggle-track-border);
    border-radius: var(--toggle-track-radius);
  }
  .thumb {
    width: var(--toggle-thumb-size); height: var(--toggle-thumb-size);
    background: var(--toggle-thumb-surface);
    border: var(--toggle-track-border-width) solid var(--toggle-thumb-border);
  }
  .label {
    color: var(--toggle-label-text);
    font-family: var(--toggle-label-font-family);
    font-size: var(--toggle-label-font-size);
    font-weight: var(--toggle-label-font-weight);
  }

  .toggle:hover:not(:disabled) .track,
  .toggle.force-hover:not(:disabled) .track { background: var(--toggle-hover-track-surface); }
  .toggle:hover:not(:disabled) .thumb,
  .toggle.force-hover:not(:disabled) .thumb { background: var(--toggle-hover-thumb-surface); }

  .toggle.on .track {
    background: var(--toggle-on-track-surface);
    border-color: var(--toggle-on-track-border);
  }
  .toggle.on .thumb {
    background: var(--toggle-on-thumb-surface);
    border-color: var(--toggle-on-thumb-border);
  }

  .toggle.on:hover:not(:disabled) .track,
  .toggle.on.force-hover:not(:disabled) .track { background: var(--toggle-on-hover-track-surface); }
  .toggle.on:hover:not(:disabled) .thumb,
  .toggle.on.force-hover:not(:disabled) .thumb { background: var(--toggle-on-hover-thumb-surface); }

  .toggle:disabled .track { background: var(--toggle-disabled-track-surface); }
  .toggle:disabled .thumb { background: var(--toggle-disabled-thumb-surface); }
  .toggle:disabled .label { color: var(--toggle-disabled-label-text); }
</style>
```

What to notice:

- The `:global(:root)` block declares every editable variable. Variables in scoped selectors don't get edited; the plugin only parses `:global(:root)`.
- Every default references a theme token; no raw values.
- Component states (`on`, `disabled`) name themselves in the token: `--toggle-on-*`, `--toggle-disabled-*`.
- Interaction states layer on top: `--toggle-hover-*` for default+hover, `--toggle-on-hover-*` for on+hover.
- Disabled is terminal: no `--toggle-disabled-hover-*`, no `--toggle-on-disabled-*`.
- The `force-hover` class pairs with the editor's preview hook so hover tokens paint without a real pointer. Each `:hover` selector has a matching `.force-hover` sibling.

### Editor: `src/system/components/ToggleEditor.svelte`

```svelte
<script module lang="ts">
  import type { Token } from '@motion-proto/live-tokens/component-editor';
  export const component = 'toggle';

  const states: Record<string, Token[]> = {
    default: [
      { label: 'track surface',      variable: '--toggle-track-surface' },
      { label: 'track border',       variable: '--toggle-track-border' },
      { label: 'track border width', variable: '--toggle-track-border-width' },
      { label: 'track radius',       variable: '--toggle-track-radius' },
      { label: 'track width',        variable: '--toggle-track-width' },
      { label: 'track thickness',    variable: '--toggle-track-thickness' },
      { label: 'thumb surface',      variable: '--toggle-thumb-surface' },
      { label: 'thumb border',       variable: '--toggle-thumb-border' },
      { label: 'thumb size',         variable: '--toggle-thumb-size' },
      { label: 'label text',         variable: '--toggle-label-text' },
      { label: 'label font family',  variable: '--toggle-label-font-family' },
      { label: 'label font size',    variable: '--toggle-label-font-size' },
      { label: 'label font weight',  variable: '--toggle-label-font-weight' },
      { label: 'label gap',          variable: '--toggle-gap' },
    ],
    hover: [
      { label: 'track surface', variable: '--toggle-hover-track-surface' },
      { label: 'thumb surface', variable: '--toggle-hover-thumb-surface' },
    ],
    on: [
      { label: 'track surface', variable: '--toggle-on-track-surface' },
      { label: 'track border',  variable: '--toggle-on-track-border' },
      { label: 'thumb surface', variable: '--toggle-on-thumb-surface' },
      { label: 'thumb border',  variable: '--toggle-on-thumb-border' },
    ],
    'on hover': [
      { label: 'track surface', variable: '--toggle-on-hover-track-surface' },
      { label: 'thumb surface', variable: '--toggle-on-hover-thumb-surface' },
    ],
    disabled: [
      { label: 'track surface', variable: '--toggle-disabled-track-surface' },
      { label: 'thumb surface', variable: '--toggle-disabled-thumb-surface' },
      { label: 'label text',    variable: '--toggle-disabled-label-text' },
    ],
  };
  export const allTokens: Token[] = Object.values(states).flat();
</script>

<script lang="ts">
  import Toggle from './Toggle.svelte';
  import {
    VariantGroup, ComponentEditorBase,
  } from '@motion-proto/live-tokens/component-editor';

  function previewProps(state: string) {
    return {
      checked: state === 'on' || state === 'on hover',
      disabled: state === 'disabled',
      forceClass: state === 'hover' || state === 'on hover' ? 'force-hover' : '',
    };
  }
</script>

<ComponentEditorBase
  {component}
  title="Toggle"
  description="On/off switch with sliding thumb."
  tokens={allTokens}
>
  <VariantGroup name="toggle" title="Toggle" {states} {component}>
    {#snippet children({ activeState })}
      {@const p = previewProps(activeState)}
      <Toggle checked={p.checked} disabled={p.disabled} class={p.forceClass} label="Enable feature" />
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>
```

What to notice:

- `component` is the string id; must match `registerComponent({ id })` exactly.
- `states` keys become the VariantGroup tab labels the user sees. Multi-word keys (`'on hover'`) need quoting.
- `allTokens` is a flat union of every state's tokens. The editor store needs it for reset-to-default and sibling resolution.
- `previewProps` translates the active editor tab into runtime props (`checked`, `disabled`, `force-hover` class).
- No `groupKey`, no `canBeLinked`: Toggle has no linked siblings. For components that share base properties across variants, see the linked-siblings extension below.

### Register: `src/main.ts`

```ts
import { registerComponent } from '@motion-proto/live-tokens';
import ToggleEditor, { allTokens as toggleTokens } from './system/components/ToggleEditor.svelte';

registerComponent({
  id: 'mytoggle',                                // unique id; don't reuse 'toggle'
  label: 'My Toggle',
  icon: 'fas fa-toggle-on',
  sourceFile: 'src/system/components/Toggle.svelte',
  editorComponent: ToggleEditor,
  schema: toggleTokens,
});

// then mount(App, ...)
```

If you do this with `id: 'toggle'`, the consumer's component wins over the built-in (with a console warning). The collision rule protects you, but for a fresh component pick an id that doesn't collide.

## Extension: linked siblings

Toggle's tokens are flat per state. Most multi-variant components (Badge, Card, SegmentedControl) share base properties across variants and surface that equality via a *linked block*: one edit propagates to every variant, while per-variant properties stay independent. Five additions to the Toggle pattern; see `BadgeEditor.svelte` in `node_modules` for the full file.

1. **Mark linkable tokens** with `canBeLinked: true` + a `groupKey`. Peers sharing a `groupKey` form a link set across variants.

   ```ts
   function variantBaseTokens(v: Variant): Token[] {
     return [
       { label: 'padding',       canBeLinked: true, groupKey: 'padding', variable: `--badge-${v}-padding` },
       { label: 'corner radius', canBeLinked: true, groupKey: 'radius',  variable: `--badge-${v}-radius` },
     ];
   }
   // Colors omit canBeLinked. Per-variant by design.
   function variantColorTokens(v: Variant): Token[] {
     return [
       { label: 'surface color', groupKey: 'surface', variable: `--badge-${v}-surface` },
       { label: 'text color',    groupKey: 'text',    variable: `--badge-${v}-text` },
     ];
   }
   ```

2. **Build a `linkableContexts: Map<variable, contextLabel>`** in `<script module>`. The label (e.g. `"success base"`) is how the LinkageChart row identifies this variable. Plain literal Map, no helper needed.

   ```ts
   const linkableContexts = new Map<string, string>(
     variants.flatMap((v) =>
       variantBaseTokens(v)
         .filter((t) => t.canBeLinked)
         .map((t) => [t.variable, `${v} base`] as [string, string]),
     ),
   );
   ```

3. **Compute `linked` and mask currently-linked rows** out of per-state lists, so they render once inside the LinkedBlock instead of twice.

   ```ts
   import { editorState } from '@motion-proto/live-tokens';
   import { computeLinkedBlock, withLinkedDisabled, buildSiblings }
     from '@motion-proto/live-tokens/component-editor';

   let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
   let visibleVariantStates = $derived((v: Variant) => Object.fromEntries(
     Object.entries(variantStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
   ));
   ```

4. **Pass `{linked}` to `ComponentEditorBase`** so the LinkedBlock renders above the variant groups.

5. **Multi-variant editors iterate VariantGroups** with `buildSiblings` so cross-variant link rows resolve to their peers.

   ```svelte
   <ComponentEditorBase {component} title="Badge" tokens={allTokens} {linked} variants={variantOptions}>
     {#each variants as v}
       <VariantGroup
         name={v}
         title={v}
         states={visibleVariantStates(v)}
         {component}
         siblings={buildSiblings(variants, v, variantStates)}
       >
         ...preview snippet
       </VariantGroup>
     {/each}
   </ComponentEditorBase>
   ```

Single-variant components with multi-state linked tokens still set `canBeLinked` + `linkableContexts`, but skip `buildSiblings` and the `{#each}` loop. Components with no linked tokens (Toggle, SectionDivider) skip all five steps — `ComponentEditorBase` renders fine without a `{linked}` prop.

## Verification checklist

After saving, run the static validator first:

```bash
npx live-tokens check-component <id>
# or: npx @motion-proto/live-tokens check-component <id>
```

It enforces the file layout, the `:global(:root)` block, token-suffix vocabulary, state-before-property rule, theme-token defaults (no raw colour literals), public-imports rule, and the `registerComponent({ id })` call. Exit code 0 means the static contract is met.

Then navigate to `/components` and confirm the runtime behaviours the static check can't see:

- [ ] The new component appears in the nav rail under the **CUSTOM** group (system entries above, custom below the labeled divider).
- [ ] Token rows render. Color pickers, radius selectors, font selectors all work.
- [ ] Linked-block (if your component has linked siblings): shared rows appear with the link toggle. Changing the linked value broadcasts across every variant.
- [ ] First save creates `component-configs/<id>/default.json`. Subsequent saves write `_active.json` plus any named files.
- [ ] Reset returns each variable to its `:global(:root)` default.
- [ ] Boot validation is clean (no warnings about the component being missing from the server scan, or about disk-vs-registry drift).
