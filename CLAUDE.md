# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A client-only Vue 3 + Quasar SPA for building and XP-balancing Pathfinder 2e encounters. No backend:
creature/NPC data is a static JSON snapshot refreshed monthly by CI. Live at
https://maxiride.github.io/pf2e-encounters/.

## Commands

```bash
pnpm install
pnpm dev                         # dev server on http://localhost:9000 (HMR, type-check, lint)
pnpm build                       # production SPA build -> dist/spa
pnpm lint                        # ESLint over src/
pnpm format                      # Prettier write

pnpm test                        # unit + e2e
pnpm test:unit                   # Vitest — encounter-store.ts rules logic
pnpm test:unit:watch             # Vitest watch mode
pnpm test:e2e                    # Playwright smoke suite (starts the dev server itself)

pnpm run generate:data           # refresh public/creatures.json + metadata.json (skipped if <7 days old)
pnpm run generate:data --force   # always refetch from AoN
```

Single-test invocation:
```bash
pnpm exec vitest run src/stores/encounter-store.spec.ts -t "name of test"
pnpm exec playwright test e2e/encounter-builder.spec.ts -g "name of test"
```

First Playwright run on a machine needs `pnpm exec playwright install chromium`.

## Architecture

**Data flow is one-directional and has no backend at runtime.** `tools/aon-downloader/fetch-creatures.js`
(plain Node, zero deps) is the *only* thing that ever talks to Archives of Nethys — it queries AoN's
public Elasticsearch endpoint directly (there's no official API) and writes the committed
`public/creatures.json` + `public/metadata.json`. The SPA only ever reads those static files
(`src/boot/creatures.ts` kicks off the fetch at startup into `creatures-store.ts`); filtering/search is
all client-side. A monthly GitHub Action (`update-creatures.yml`) is the only scheduled caller of the
downloader; pushes to `main` trigger `deploy.yml` which builds and publishes to `gh-pages`.

**Read `docs/adr/` before touching data fetching, deploy, analytics, or testing setup** — those
decisions (and their non-obvious constraints) are recorded there, not in code comments:
- `0001` — why Elasticsearch direct-query instead of scraping/UI-automation, and the "be a good citizen"
  constraints (7-day freshness guard, single request, no `--force` looping) baked into the downloader.
- `0002` — the two-workflow split (`update-creatures.yml` commits data to both `dev` and `main`;
  `deploy.yml` is invoked via `workflow_call` from it, since `GITHUB_TOKEN` pushes don't trigger `push`).
- `0003` — analytics event contract (see below).
- `0004` — why Vitest owns rules logic and Playwright owns UI smoke, and a known Windows-only Playwright
  worker-hang quirk (harmless, test results unaffected).

**`src/stores/encounter-store.ts` is the one place that mutates encounter state**, and encodes all GM
Core rules math (XP budgets per party size, creature XP by level delta, weak/elite level adjustments)
with rulebook links inline. `encounter-store.spec.ts` encodes the GM Core tables row by row — treat it as
the spec when changing the math. This store has a real bug history (#17 frozen reactivity, #62 silent
delta clamping at the ±4-level table edge — see `isDeltaOutOfBounds`), so changes here need the unit
tests, not just manual checking.

**Analytics (`src/utils/analytics.ts`, self-hosted Umami)** has no "encounter finished" signal — users
add/remove creatures continuously — so instead of one completion event, `encounter-store.ts` centralizes
three: `encounter-add-creature`, `encounter-change-kind` (only on actual kind changes), and
`encounter-snapshot` (debounced 8s after the last mutation, or immediate on tab-hide/`pagehide`). Any new
encounter-affecting action should emit through this same store, not from component code.

**`CreaturesTable.vue` uses Quasar's `virtual-scroll` over ~4.7k rows** — this is load-bearing, not
optional. The row-key ref must stay a stable ref (not an inline literal) or virtual-scroll's internal
state breaks; components remount per row as the scroll window moves. Do not replace virtual-scroll with
rendering all rows — that has previously frozen real (non-automation) browsers.

**Vue's version is Quasar's peer dependency to manage — never pin or hand-edit it.** A `^3.4.x` /
`^3.5.x` caret range is correct; don't hard-pin an exact version. An earlier session briefly pinned
`vue` to an exact `3.4.38`, believing Vue 3.5 broke this table's virtual-scroll — that belief was wrong
(the "zero rows" symptom was an artifact of a headless automation browser mismeasuring the scroll
viewport, not a real Vue/Quasar defect; confirmed against upstream: `quasar` core has no Vue peer
constraint at all, and `@quasar/app-vite` accepts `^3.2.29`+). The pin has been reverted. If a task seems
to call for touching Vue's version again, don't — bump Quasar/`@quasar/app-vite` instead and let its
peer range pull in whatever Vue it has validated.

**Rules are implemented rules-as-written, no house-ruling** — cite the relevant AoN rules page
(https://2e.aonprd.com/Rules.aspx?ID=2715) in any rules discussion; see issue #62 for the project's
stance on this.

## Branches

Work lands on `dev`; `main` is what production builds from, deploys to `gh-pages`, and is the target
for PRs. CI (lint + unit + e2e) runs on pushes to `dev` and on PRs to `main`.
