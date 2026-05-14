# PF2e Encounter Builder

A browser-based tool for building and balancing encounters for **Pathfinder 2e**. Browse the full creature catalog (4,600+ entries, including remaster content), filter by level, traits, alignment, size, rarity, and more, then drop creatures into a party to see the XP budget and difficulty rating. Each creature in the encounter can be toggled to its **Weak** or **Elite** variant — a rule that's easy to overlook but very useful for fine-tuning encounter power.

This is a fork of the original project by **[Maxiride](https://github.com/maxiride)** — see the upstream repository at **[maxiride/pf2e-encounters](https://github.com/maxiride/pf2e-encounters)**. All credit for the original design and implementation goes to him.

## What's in this fork

- **New Node.js scraper** (`src/scraper-node/`) that pulls creature data directly from the Archives of Nethys Elasticsearch endpoint. Replaces the older Go-based per-page HTML scraper and runs in seconds with zero dependencies.
- **Refreshed creature data** — `creatures.json` regenerated from current AoN data, now including all post-CRB material through the remaster (4,684 creatures vs. the original 2,437).
- **Encounter-cost fix** for weak/elite level adjustments at level boundaries.

## Repository layout

```
src/
├── webui/          Quasar (Vue 2) single-page app — the encounter builder UI
└── scraper-node/   Node 18+ scraper that builds creatures.json from AoN
```

## Getting started

### Prerequisites

- **Node.js** ≥ 18 (the scraper uses the built-in `fetch`)
- **Yarn** ≥ 1.21

### Run the web UI locally

```bash
cd src/webui
yarn install
yarn quasar dev
```

The dev server starts with hot reload at `http://localhost:8080` (or whichever port Quasar picks — check the terminal output).

If `quasar` isn't on your `PATH`, you can also run it via `npx quasar dev` or install the CLI globally with `yarn global add @quasar/cli`.

### Build for production

```bash
cd src/webui
yarn quasar build
```

Static output lands in `src/webui/dist/spa/` — deployable to any static host.

### Lint

```bash
cd src/webui
yarn lint
```

### Refresh the creature data

```bash
cd src/scraper-node
node scrape.mjs
```

This writes a fresh `src/webui/public/creatures.json` from the live Archives of Nethys Elasticsearch index. No dependencies, no install step.

## License

Licensed under GPL-3.0 — see [LICENSE.md](LICENSE.md).
