# pf2e-encounters

A Pathfinder 2e encounter builder — Svelte 5 + Vite, styled with a vendored
[Live Tokens](https://github.com/motion-proto/live-tokens) design system.

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

- `src/` — the encounter builder (`App.svelte`, `Home.svelte`, `main.ts`)
- `src/live-tokens/` — vendored design system (system, editor, demo)
- `scripts/scrape.mjs` — AoN Elasticsearch scraper for creature data
- `themes/`, `manifests/`, `component-configs/` — Live Tokens runtime data
- `vite-plugin/` — `themeFileApi` plugin source that backs `/api/themes/*` etc.
