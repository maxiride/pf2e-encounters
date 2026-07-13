# PF2e Encounter Builder

Build and balance [Pathfinder 2e](https://paizo.com/pathfinder) encounters: browse every creature and
NPC from the [Archives of Nethys](https://2e.aonprd.com), filter by level, type, traits, rarity, size,
family, alignment or source, and assemble an encounter with live XP budgeting per the
[GM Core encounter rules](https://2e.aonprd.com/Rules.aspx?ID=2716) — including *Weak* and *Elite*
variant adjustments, which most similar tools overlook.

**Live site:** https://maxiride.github.io/pf2e-encounters/

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Vue 3](https://vuejs.org) + [Quasar 2](https://quasar.dev) (Vite), TypeScript strict |
| State | [Pinia](https://pinia.vuejs.org) |
| Data | Static JSON snapshot of AoN's public Elasticsearch index, refreshed monthly by CI |
| Tests | [Vitest](https://vitest.dev) (rules logic) + [Playwright](https://playwright.dev) (UI smoke) |
| Analytics | Self-hosted [Umami](https://umami.is), production builds only, no cookies |
| Hosting | GitHub Pages (`gh-pages` branch), no backend |

## Getting started

Prerequisites: Node ≥ 20 and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev          # dev server on http://localhost:9000
```

Creature data (`public/creatures.json` + `public/metadata.json`) is committed, so the app works
offline out of the box. To refresh it from AoN:

```bash
pnpm run generate:data          # skipped if data is fresher than 7 days
pnpm run generate:data --force  # always download
```

> **Please be considerate:** the Archives of Nethys is a community-run resource. The fetch script is
> deliberately a single HTTP request with a freshness guard — don't loop it. See
> [ADR 0001](docs/adr/0001-creature-data-via-aon-elasticsearch.md).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server with HMR, type checking and linting |
| `pnpm build` | Production SPA build into `dist/spa` |
| `pnpm lint` | ESLint over `src/` |
| `pnpm test` | Unit + E2E suites |
| `pnpm test:unit` | Vitest — encounter math and analytics contract |
| `pnpm test:e2e` | Playwright smoke suite (starts the dev server itself; first run needs `pnpm exec playwright install chromium`) |
| `pnpm run generate:data` | Refresh creature data from AoN |

## Repository tour

```
├── src/
│   ├── components/       # CreaturesTable, EncounterList, ThreatBar, ...
│   ├── stores/           # Pinia stores — encounter-store.ts holds ALL the rules math
│   ├── pages/ layouts/   # single-page shell
│   └── boot/             # app startup (creature data fetch)
├── public/               # committed creature data snapshot
├── tools/aon-downloader/ # data fetch script (plain Node, zero deps)
├── e2e/                  # Playwright smoke tests
├── docs/adr/             # architecture decision records — start here to understand "why"
└── .github/workflows/    # ci.yml, deploy.yml, update-creatures.yml
```

The encounter math (XP budgets, creature XP by level delta, weak/elite adjustments) lives entirely in
[`src/stores/encounter-store.ts`](src/stores/encounter-store.ts) with the relevant rulebook links
inline. If you touch it, [`encounter-store.spec.ts`](src/stores/encounter-store.spec.ts) encodes the
GM Core tables row by row.

## How it works

1. A monthly GitHub Action pulls every creature and NPC (~4.7k records) from AoN's public
   Elasticsearch endpoint in one request and commits the JSON — see
   [ADR 0001](docs/adr/0001-creature-data-via-aon-elasticsearch.md) and
   [ADR 0002](docs/adr/0002-monthly-data-refresh-and-gh-pages-deploy.md).
2. The SPA loads that JSON at startup; filtering happens client-side.
3. Pushes to `main` build and publish to the `gh-pages` branch.

## Contributing

Issues and PRs welcome.

- Read the [ADRs](docs/adr/) first — they explain the non-obvious choices and their trade-offs.
- Branch model: work lands on `development`, `v2` mirrors it for the pending v2 release PR, `main` is
  what production builds from.
- CI (lint + unit + E2E) must pass; it runs automatically on pushes and PRs.
- Rules discussions should cite the relevant [Archives of Nethys rules page](https://2e.aonprd.com/Rules.aspx?ID=2715) —
  the tool intentionally implements rules-as-written with no house rulings
  (see [#62](https://github.com/maxiride/pf2e-encounters/issues/62) for an example of that policy).

## License

Code: see [LICENSE](https://github.com/maxiride/pf2e-encounters/blob/main/LICENSE.md).
Game content is used under Paizo's [Community Use Policy](https://paizo.com/licenses/communityuse) —
full notices in [LICENSE_AON.md](LICENSE_AON.md). This tool is not published, endorsed, or approved
by Paizo or the Archives of Nethys.

## Support

Do you like my work? Every cup of coffee brings me back to the desk!

<a href="https://www.buymeacoffee.com/maxiride" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width=200px ></a>

[![Star History Chart](https://api.star-history.com/svg?repos=maxiride/pf2e-encounters&type=Date)](https://star-history.com/#maxiride/pf2e-encounters&Date)
