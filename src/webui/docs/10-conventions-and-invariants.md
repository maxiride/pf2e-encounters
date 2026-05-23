# Conventions and invariants

The contracts that span layers and are not obvious from any single
file. If you have hit something that surprised you, check here first;
it is probably a deliberate constraint.

This is also the easiest doc to keep up to date: when you find a new
"you can't do this because…", add it here.

## CSS-var fan-out (iframe)

**Rule:** Anything that writes to `:root` style must go through
`cssVarSync`.

**Why:** When the editor sits in the overlay iframe,
`cssVarSync.setCssVar` writes to *both* the iframe's document root
and the host page's parent root. That is how the editor in the iframe
repaints the surrounding host page in real time without postMessage.
Direct `documentElement.style.setProperty(...)` only updates the
iframe, and the host page goes stale.

**How to apply:**

- Use `setCssVar`, `removeCssVar`, `applyCssVariables`,
  `clearAllCssVarOverrides` from `src/editor/core/cssVarSync.ts`.
- The renderer (`editorRenderer.ts`) is the only DOM consumer of
  state and it already routes through `cssVarSync`.
- Boot-time seed paths (palette derivation, shadow seeding) also use
  `cssVarSync`.

If you find a new code path that writes `:root` style, route it
through `cssVarSync` or the editor stops repainting the host page.

## Mirror the theme-file lifecycle for new editor artifacts

**Rule:** Any new editable artifact class (component configs,
manifests, future motion presets, future icon sets, and so on) gets
the full active+production lifecycle and a file-manager UI.

**Why:** This was the original theme-files contract and it is
load-bearing for the user's workflow ("save as named file, switch
active, promote to production"). Side-loading new artifacts into the
theme JSON or into a single-file blob trades short-term simplicity
for a migration tax later.

**How to apply:**

- Use `versionedFileResourceServer`
  (`vite-plugin/files/versionedFileResourceServer.ts`) for the
  server side.
- Use `versionedFileResource`
  (`src/editor/core/storage/files/versionedFileResourceClient.ts`)
  for the client side.
- Mirror the route table ordering: active and production routes
  must come before the catch-all `:name` route.

See chapter 09 for the recipe.

## Linking is dev-declared, not user-editable

**Rule:** The set of tokens that *can* be linked together (sibling
sets) is authored by the component editor's developer via `groupKey`
+ `canBeLinked` on each token, registered with
`registerComponentSchema(componentId, tokens)`. Users toggle whether
siblings are *currently* linked, but they do not define what *can*
be linked.

**Why:** "Can these tokens be linked" is a design-system property,
not a user preference. The editor's job is to expose the topology
cleanly; the topology itself comes from how the component dev
modeled their token surface.

**How to apply:**

- Do not propose UI for users to add tokens to a sibling set or
  reshape the topology.
- If two tokens *should* be linkable but are not, that is a code
  change to the component editor's `allTokens` list (add `groupKey:
  'foo'` to both).
- Sibling fallback (last-dash inference) exists for unmigrated
  editors. It is not a feature for users to discover; it is a
  transitional safety net.

## Component states ≠ interaction states ≠ parts

Three distinct concepts, often confused:

**Component states** are `default` / `selected` / `disabled`.
Mutually exclusive. A SegmentedControl option is exactly one of
these at a time.

**Interaction states** are `default` / `hover` (sometimes `focus`,
`active`). They layer on top of component states. Apply to anything
pointer-interactive.

**Parts** are Dialog overlay/header/body/footer, Tooltip arrow,
SegmentedControl divider/option/bar. Structural decomposition of a
single component instance. *Not states.*

**Invariants:**

- **Disabled is terminal.** Selected-disabled is impossible. Once
  disabled, the element renders disabled, not "the selected
  variant's disabled style." Do not declare a
  `--button-primary-selected-disabled-*` token.
- **Hover-on-disabled is impossible.** The cursor does not get the
  hover affordance.
- **Parts are not states.** If you reintroduce a singular "State"
  label somewhere, pick the right noun for the VariantGroup:
  "Variants", "Frames", or "Parts," based on what the group is. The
  Tabs view sidesteps this by naming each tab individually.

The DialogEditor's `frameStates` keys parts as states because the
editor UI naturally renders one block per part. That is intentional
UI sugar; if a state-machine type ever gets introduced, parts and
states must be different types.

## Themes and components are orthogonal

**Rule:** Loading a different theme preserves `state.components`.
Component slices live in their own files under
`component-configs/<id>/`.

**Why:** Components are visual *contracts*. Their slot topology and
slot names are an API. Themes change colors, sizes, and spacing
globally; components map their slots to whichever theme tokens fit.
Bundling component slot configurations into the theme JSON would
couple the two and force every theme to know about every component.

**How to apply:**

- `loadFromFile(theme)` in `editorStore.ts` clones
  `state.components` onto the new state and strips component-owned
  vars from the theme's `cssVariables` bag.
- New per-component features go into
  `component-configs/<id>/*.json`, not `themes/*.json`.
- Theme migrations and component-config migrations have
  **independent version sequences**
  (`CURRENT_THEME_SCHEMA_VERSION` vs
  `CURRENT_COMPONENT_SCHEMA_VERSION`). Do not shoehorn one into the
  other.

## Module-load side effects are forbidden

**Rule:** Importing a module from `src/editor/core/` should not touch
the DOM, storage, or `window`. Side-effecting initialization goes
in an idempotent `init()` that the host calls explicitly.

**Why:** Library consumers have varied boot sequences. SSR, unit-test
harnesses, and library consumers calling `configureEditor` after
import all break when modules subscribe-and-persist or read
`window.location` on import. The side-effect-on-import pattern was
the M7 audit finding.

**How to apply:**

- New `src/editor/core/` modules that need DOM/storage access expose
  `init()` (idempotent; re-callable safely).
- `main.ts` orchestrates `init()` calls in the right order:
  1. `cssVarSync.init()` — resolves document roots
  2. `router.init()` — wires popstate
  3. `columnsOverlay.init()` — hydrates + subscribes
  4. `editorStore.init()` — runs eager hydrate
- Storage prefix resolution is **lazy per call**, not memoized at
  module load (`getPersistKey()` in `editorPersistence`,
  `prevKey()` in `router`, `getStorageKey()` in `columnsOverlay`).

## CSS-var alias vs config bucket

**Rule:** A `ComponentSlice`'s `aliases` map is for entries the CSS
cascade resolves through `var(...)`. The `config` map is for entries
the JS reads directly from `$editorState.components[id].config[key]`.

**Why:** Before the C3 audit fix, both lived in one stringly-typed
map. The renderer wrapped non-`--` values verbatim, producing junk
CSS like `--dialog-confirm-variant: primary;` that nothing consumed.
Editors then recovered type safety after the fact via
`BUTTON_VARIANTS.includes(...)`.

**How to apply:**

- If a knob is read via `var(--name)` in CSS (any cascade reference,
  including `color-mix(...)`), it is an alias.
- If a knob is read in JS as `<Component variant={config['--foo']}>`,
  it is a config entry.
- The on-load split (`splitAliasesAndConfig` in `editorStore.ts`)
  routes legacy flat-bucket files based on
  `KNOWN_COMPONENT_CONFIG_KEYS`. Add new config keys there.
- The `--button-shimmer` knob looks like config but is an alias.
  `Button.svelte` reads `display: var(--button-shimmer)` in CSS and
  `tokens.css` declares `--shimmer-on: block / --shimmer-off: none`.
  The cascade resolves it; it stays in `aliases`.

## Treat uncommitted work as the only copy

**Rule:** Do not run `git stash drop` / `reset --hard` /
`checkout --` / `clean -f` on a tree with uncommitted user work
without explicit confirmation.

**Why:** This codebase often has hand-saved theme/config files that
were written through the editor and are not committed yet (the
editor is a save tool as much as a tweak tool). A stash-drop or
reset that "cleans up" would silently delete the user's work, and
the dev plugin does not keep its own backups — git is the only
safety net.

**How to apply:**

- Surface destructive git ops to the user before running them, even
  when "the workspace is clean" looks plausible at a glance.
- For "let me run tests on the base tree" verification, use a
  worktree (`git worktree add`) instead of stash. Stashing on a
  tree with untracked files mixed with intentionally uncommitted
  edits is a hand grenade.

## Schema migrations: dated, isolated, self-bumping

**Rule:** Each migration is its own file under
`src/editor/core/themes/migrations/` named
`YYYY-MM-DD-<short-name>.ts`. The runner registers them in
`index.ts`; `CURRENT_*_SCHEMA_VERSION` derives from the registered
count.

**Why:** Pre-Wave-4, migration tables accumulated inside
`editorStore.ts` with "drop these once all on-disk … resaved"
comments that no one ever did. There was no lifecycle. Dated,
isolated files mean deletion is mechanical: delete the file, remove
the import, the constant decrements.

**How to apply:**

- New migrations go in their own dated file. Do not pile onto an
  existing one.
- Save paths stamp `theme.schemaVersion =
  CURRENT_THEME_SCHEMA_VERSION` (and the component-config
  equivalent) so resaved files skip past migrations.
- The runner gates by `fromVersion >= file.schemaVersion`, sorted
  by `toVersion`: order-independent registration.

## Never mock the database in tests

This codebase uses test files for state-shape contracts
(`editorStore.test.ts`, `componentConfig.test.ts`,
`migrations.test.ts`). They run against the real in-memory store and
the real migration runner. Do not introduce mocks of the store or
the migration registry; the tests' value is exactly that they
exercise the production code paths. Use `__resetForTests` /
`__resetCoreForTests` / `__resetComponentsForTests` to reset state
between tests; that is what they exist for.

## Comments belong to the code, not the PR

**Rule:** Do not write comments that narrate the change you are
making. No "NEW:", no "Phase 1:", no "added for issue #123." Code
review and PR descriptions are where that lives.

**Why:** These comments rot the moment they are committed. The code
is the artifact; the PR is the change record. Mixing them puts the
PR's lifecycle into the source tree.

**How to apply:**

- Default to writing no comments. Add one only when the WHY is
  non-obvious: a hidden constraint, a subtle invariant, a
  workaround for a specific bug.
- If you are tempted to write "// NEW:", that information belongs
  in the commit message instead.

## What's pending (not yet enforced)

These are known wishlist items and pending refactors. They are
documented here because future work might encounter them mid-stream.

- **Theme-layer cleanups.** Font-weight scale normalization,
  bare-word orphan audit, full `bg` → `canvas` sweep. Tracked in
  `temp/theme-token-improvements.md`.
- **Notification's flag-args accumulation.** 11+
  `actionInline`/`actionHeader`/`actionLeftVariant` booleans should
  collapse to one `actions: { header?, inline?, left?, right? }`
  config object. Flagged in the C2 audit but out-of-scope for the
  audit pass.
- **`extractGlobalRootBody` SCSS expansion.** Currently the parser
  does not pre-compile `@each` loops, so `:global(:root)` blocks
  must be flat. A parser change to expand interpolations would let
  component CSS consolidate. Out-of-scope today; documented inline
  in `Notification.svelte`.

## Summary

The contracts that matter:

1. CSS var writes go through `cssVarSync` (iframe fan-out).
2. Versioned file resource is the canonical lifecycle for editable
   artifacts.
3. Linking topology is dev-declared; users only toggle.
4. States ≠ parts. Disabled is terminal. Selected-disabled is
   impossible.
5. Themes and components are orthogonal — independent files,
   independent migrations.
6. No module-load side effects; use idempotent `init()`.
7. Aliases are for CSS cascade; config is for JS readers.
8. Do not destroy uncommitted work.
9. Migrations are dated, isolated, and self-bumping.
10. No PR-narration comments.
