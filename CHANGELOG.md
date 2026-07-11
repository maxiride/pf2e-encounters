# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project does not adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html), the versioning follows a personal opinionated flow.



## [Unreleased] — v2.0.0

Full rewrite: Vue 3 + Quasar 2 + TypeScript + Pinia, new data pipeline, redesigned UI. Tracks [#61](https://github.com/maxiride/pf2e-encounters/issues/61) and [#70](https://github.com/maxiride/pf2e-encounters/issues/70).

### Data pipeline
- Replaced the Playwright-driven scraper (`Creatures.aspx` UI automation, headless Chromium) with a single direct query to AoN's public Elasticsearch endpoint (`elasticsearch.aonprd.com`). One HTTP request instead of a full page load + button clicks; no browser binary to install.
- Old approach silently excluded NPCs (UI export only) and broke outright when AoN added a cookie-consent overlay. New script pulls monsters **and** NPCs together (917 NPCs previously missing entirely, closes [#46](https://github.com/maxiride/pf2e-encounters/issues/46)) and fails loudly instead of hanging on UI changes.
- Added a 7-day freshness guard (`--force` to override) so routine `pnpm install`/dev runs never hit AoN's servers; data only refreshes on explicit request or the monthly scheduled job.
- Extended schema: `alignment` (present on ~58% of pre-Remaster statblocks) and `family` restored to the dataset and exposed as filters (closes part of [#1](https://github.com/maxiride/pf2e-encounters/issues/1)); `level`/`hp`/`ac` are now numeric, `traits`/`size`/`sources` are arrays instead of joined strings.
- `metadata.json` now includes `families`, `alignments`, and a `levels` min/max range alongside the existing `traits`/`rarities`/`sizes`/`sources`.

### Frontend
- `CreaturesTable`: name search, monster/NPC toggle, level range slider, and a collapsible advanced panel (rarity, size, alignment, family, traits, source — all searchable on long lists).
- `EncounterList`: fully implemented (was ~80% placeholder) — per-creature weak/base/elite toggle, count stepper, per-creature and total XP display, clear-encounter action, AoN link per creature.
- `ThreatBar`: rebuilt with a CSS-only track/fill instead of manually computed absolute-position badges; scale compresses gracefully instead of overflowing when cost exceeds the extreme budget.
- Fixed a latent Pinia reactivity bug: `IndexPage` was destructuring computed refs directly off the setup-store (`const xpCost = encounterStore.xpCost`), freezing their value at mount instead of tracking party-level/size changes. Now sourced via `storeToRefs` throughout. Closes [#17](https://github.com/maxiride/pf2e-encounters/issues/17) (milestone: v2).
- Removed dead code: unused `axios` boot/dependency, `example-store.ts`, stub `user-store.ts`, duplicate Pinia `stores/index.js`, debug `console.log`s and debug CSS outlines.
- License dialog now renders real Paizo Community Use Policy text and links `LICENSE_AON.md` instead of a commented-out `q-markdown` block. Closes [#68](https://github.com/maxiride/pf2e-encounters/issues/68).
- Header/menu links wired to real destinations (release notes, bug report, discussions, repository) instead of dead `v-close-popup`-only items.

### Infrastructure
- `update-creatures.yml`: scheduled GitHub Action (1st of every month) refreshes creature data and commits it to `development` and `main`, then triggers the deploy workflow.
- `deploy.yml`: builds the Quasar SPA and publishes `dist/spa` (data included) to `gh-pages` on push to `main`.
- Removed two stale, non-functional workflow files (`yarn`-based, targeting a `src/webui` layout that no longer exists).

### Known limitations (not addressed in this release)
- Encounter cost vs. delta level beyond ±4 is still clamped to the ±4 table value instead of being flagged as out-of-bounds — relates to [#62](https://github.com/maxiride/pf2e-encounters/issues/62), not fixed here.
- No separate "XP to award players" figure (rules-as-written: player rewards are always computed for a party of 4, independent of the size-scaled budget) — [#43](https://github.com/maxiride/pf2e-encounters/issues/43) remains open.
- No dark mode, saved/shareable encounters, or random-encounter generator — [#25](https://github.com/maxiride/pf2e-encounters/issues/25), [#52](https://github.com/maxiride/pf2e-encounters/issues/52), [#51](https://github.com/maxiride/pf2e-encounters/issues/51), [#18](https://github.com/maxiride/pf2e-encounters/issues/18) remain open.

## [v0.5.0] - 2025-08-31
* Fixed NPCs URL

## [v0.3.0] - 2020-01-12
* First stable release of the website, from now on changes will be documented here.