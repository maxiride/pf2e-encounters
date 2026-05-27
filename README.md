# pf2e-encounters

A Pathfinder 2e encounter builder, Svelte 5 + Vite, styled with the
[Live Tokens](https://github.com/motion-proto/live-tokens) design system
(`@motion-proto/live-tokens`).

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
- `src/components/` — consumer-authored components (`SelectBadge`, `ProgressBar`)
  that diverge from or aren't in the published Live Tokens catalogue
- `live-tokens-data/` — editor-managed content (themes, manifests,
  component-configs, `tokens.generated.css`); read and written by the
  `themeFileApi` Vite plugin shipped in `@motion-proto/live-tokens`
- `scripts/scrape.mjs` — AoN Elasticsearch scraper for creature data
