# pf2e-encounters

A Pathfinder 2e encounter builder, Svelte 5 + Vite, styled with the
[Live Tokens](https://github.com/motionproto/live-tokens) design system
(`@motion-proto/live-tokens`).

This project doubles as the canonical reference implementation for a
live-tokens consumer — see `src/main.ts` and `src/App.svelte` for the
minimum-boilerplate integration pattern.

## Development

```bash
npm install
npm run dev      # vite dev server
npm run build    # production build to dist/
npm run check    # svelte-check
npm test         # vitest
npm run scrape   # regenerate public/creatures.json from Archives of Nethys
```

## Layout

```
src/
├─ main.ts              ← bootLiveTokens entry point
├─ App.svelte           ← <LiveTokensRouter> shell
├─ app/                 ← application code (encounter builder)
│   ├─ Home.svelte
│   ├─ EncounterBudget.svelte, EncounterList.svelte
│   ├─ CreatureTable.svelte, CreatureFilters.svelte
│   ├─ ProgressBar.svelte         ← encounter-stage wrapper
│   ├─ encounter.ts               ← types + budget math
│   ├─ AddButton.svelte, IconAction.svelte, OpenInNewButton.svelte
│   ├─ RuneGoblinBadge.svelte
│   ├─ site.css
│   └─ assets/
├─ components/          ← token-aware components added to the lt catalogue
│   ├─ SelectBadge.svelte
│   └─ SelectBadge.editor.svelte
└─ live-tokens/
    └─ data/            ← editor-managed (themes, manifests, component-configs,
                           tokens.generated.css). Read/written by the
                           `themeFileApi` Vite plugin shipped with the package.
```

The `live-tokens/data/` folder is the only path with a live-tokens-namespaced
name; everything else under `src/` is regular consumer code. Both `main.ts`
and `App.svelte` are deliberately thin — the heavy lifting (init
orchestration, overlay mount, editor route dispatch) lives in the library.

## Scripts

- `scripts/scrape.mjs` — AoN Elasticsearch scraper for creature data
- `scripts/check-no-style-imports.mjs`, `scripts/check-editor-font-isolation.mjs`,
  `scripts/smoke-install.sh` — live-tokens CI utilities, kept here from the
  initial scaffold for reference
