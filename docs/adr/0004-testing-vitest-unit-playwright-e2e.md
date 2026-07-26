# ADR 0004 — Testing: Vitest for rules logic, Playwright for UI smoke

- **Status**: accepted
- **Date**: 2026-07-12

## Context

The codebase had zero automated tests. The riskiest code is the encounter
math in `encounter-store.ts` — it encodes GM Core rules (XP budgets, creature
XP by level delta, weak/elite adjustments) and has a bug history precisely
there ([#17](https://github.com/maxiride/pf2e-encounters/issues/17) frozen
reactivity, [#62](https://github.com/maxiride/pf2e-encounters/issues/62)
silent delta clamping). The UI is a single page whose critical path is
browse → filter → add → balance.

Tooling survey (July 2026): Playwright leads E2E adoption (~45% vs Cypress
~14%, 91% satisfaction) with free parallelism and cross-browser coverage;
Vitest is the de-facto unit runner for Vite-based apps. The emerging "Vitest
Browser Mode" component-testing layer itself runs on Playwright, so both
choices sit in the same converging ecosystem.

## Decision

Two thin layers, no component-test middle layer for now:

- **Unit — Vitest** (`src/stores/encounter-store.spec.ts`, run with
  `pnpm test:unit`): every row of the GM Core tables (budgets per party size,
  creature XP per delta, weak/elite exceptions), store actions, and the
  analytics event contract (debounced snapshot included, via fake timers).
  `happy-dom` environment because the store registers window/document
  listeners at setup.
- **E2E — Playwright, chromium-only** (`e2e/encounter-builder.spec.ts`, run
  with `pnpm test:e2e`): smoke coverage of the critical path against the real
  dev server and real AoN data, pinning only stable iconic creatures (Goblin
  Warrior, Ancient Red Dragon) and avoiding exact dataset counts, which change
  monthly. Regression tests reference the issues they guard (#17, #62).

Both run in CI ([`ci.yml`](../../.github/workflows/ci.yml)) on pushes to
`dev` and PRs to `main`, with the Playwright HTML report uploaded
as an artifact on failure.

## Consequences

- Rules regressions fail in milliseconds in unit tests instead of needing a
  browser; UI wiring regressions (a broken filter, a dead button) fail in the
  smoke suite.
- E2E asserts against live-refreshed data, so it can theoretically break if
  AoN renames an iconic creature — accepted, that's a data change we'd want to
  notice anyway.
- Firefox/WebKit projects are one config line away if cross-browser bugs ever
  materialize; component testing (Vitest Browser Mode) can slot in later
  without changing runners.
- Known upstream nuisance on **Windows**: after all tests pass, a worker
  process can stall on browser close for up to 5 minutes before Playwright
  force-kills it ([microsoft/playwright#39753](https://github.com/microsoft/playwright/issues/39753)).
  The config already pins `channel: 'chromium'` (full browser instead of
  `chromium_headless_shell`), which makes the stall intermittent instead of
  systematic. The test results themselves are unaffected; Linux CI is not.
