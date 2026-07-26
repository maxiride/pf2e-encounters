# ADR 0002 — Monthly data refresh and GitHub Pages deploy

- **Status**: accepted
- **Date**: 2026-07-11

## Context

The creature data (ADR 0001) goes stale as Paizo publishes new books. The site
is a static SPA served from GitHub Pages and must stay that way — no backend.
Refreshing data must not require anyone to remember to run a script, and must
not hit AoN more often than necessary.

## Decision

Two GitHub Actions workflows:

- [`update-creatures.yml`](../../.github/workflows/update-creatures.yml) —
  scheduled for the **1st of every month** (plus manual dispatch). Runs the
  fetch script with `--force`, commits the refreshed
  `public/creatures.json` + `public/metadata.json` to `dev` **and**
  `main` (both branches stay usable for development), then calls the deploy
  workflow. One AoN request per month, total.
- [`deploy.yml`](../../.github/workflows/deploy.yml) — builds the Quasar SPA
  (`publicPath: /pf2e-encounters/`) and publishes `dist/spa` to the dedicated
  `gh-pages` branch on every push to `main`. The data files live in `public/`
  so they ship inside the build.

The deploy is invoked via `workflow_call` from the update job because pushes
made with `GITHUB_TOKEN` deliberately don't trigger other workflows' `push`
events.

## Consequences

- Data freshness is bounded at one month without human intervention; a manual
  `workflow_dispatch` covers "a new Bestiary just dropped" moments.
- The committed JSON is the single source of truth: local dev, CI and
  production all read the same files, and a broken AoN endpoint can never take
  the site down — worst case the data ages until fixed.
- `git blame`/history on `creatures.json` doubles as a data changelog.
