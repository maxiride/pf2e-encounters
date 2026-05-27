---
name: live-tokens-build-page
description: Apply the @motion-proto/live-tokens project conventions when building a page: use shipped components from the catalogue, reference theme tokens (never hex/pixel literals), mount routes dynamically, register pageSources, and import site.css per-page. Use when the user asks to build / create / lay out a page, route, hero, marketing page, landing page, dashboard, settings screen, or pricing page; add a route; place / drop / use an existing component on a page; or assemble a screen from the live-tokens catalogue. For component-choice decisions, see live-tokens-pick-component. For authoring a brand-new component, see live-tokens-create-component.
---

# Building pages in a live-tokens project

Two rules above all else:

1. **Use a shipped component if one fits.** Import from `@motion-proto/live-tokens/components/<Name>.svelte`. See [[live-tokens-pick-component]] for the catalogue and the confusing-pair decisions. Author custom markup only when nothing fits, and then consider [[live-tokens-create-component]] so the new piece is editable too.
2. **Use theme tokens for every value.** Every color, spacing, radius, font-size, and font-family in page CSS is a `var(--token-*)`. No hex literals. No pixel literals. A change in `/editor` should repaint your page.

## Layout

Pages sit inside the column grid via `--columns-count`, `--columns-gutter`, `--columns-max-width`. Toggle `ColumnsOverlay` (Cmd+G in dev) to visualise it while placing content.

To place children at specific page-column positions, span the parent grid (`grid-column: 1 / -1`), redeclare `repeat(var(--columns-count), 1fr)` with `--columns-gutter`, then refer to children by real page-column numbers. Never fabricate a local `repeat(N, 1fr)` with a hardcoded count: the widths drift from the page grid and the numbers stop matching `ColumnsOverlay`.

## Wiring

- Mount routes dynamically in `App.svelte` with `$derived.by(() => import(...))`. Static top-level imports evaluate every page module at boot and leak page CSS into editor routes.
- Register each route in `<LiveEditorOverlay pageSources={...} />` so the "Page Source" button opens the file in VS Code.
- Import `site.css` from each page's `<script>` block, never from `main.ts` (would leak into editor routes).

## Avoid

- Hex or pixel literals in page CSS.
- Hardcoded column counts (`repeat(10, 1fr)`). Use `repeat(var(--columns-count), 1fr)`.
- Utility classes overriding shipped components. Extend via the `/components` editor instead.
- Deep imports from `node_modules/@motion-proto/live-tokens/src/...`. Use public entry points only.
- Mounting `Editor` or `ComponentEditorPage` outside their dedicated routes.

## Verify

In dev: change a colour in `/editor` and confirm your page repaints (proves token usage). The overlay's "Page Source" button on the new route opens the page in VS Code (proves the `pageSources` entry). `ColumnsOverlay` (Cmd+G) shows content sitting inside `--columns-max-width`.
