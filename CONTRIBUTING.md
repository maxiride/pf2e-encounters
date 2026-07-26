# Contributing

This is a small, one-person side project — these are loose guidelines, not a process. Use judgment.

## Setup

```bash
pnpm install
pnpm dev
```

See `CLAUDE.md` for the full command list (lint, tests, data refresh) and an overview of the
architecture. Worth a skim before touching `encounter-store.ts`, the AoN data fetcher, or deploy —
there's some non-obvious history there, and `docs/adr/` has the reasoning behind the less obvious
decisions.

## Making a change

- Branch off `main`, open a PR back to `main`. CI (lint + unit + e2e) runs automatically.
- Bug fixes and small improvements: just open a PR, no need to ask first.
- Bigger changes (new features, refactors, anything that touches the rules math): open an issue first
  so we don't waste effort on something that won't land.
- If you're changing GM Core rules logic in `encounter-store.ts`, cite the relevant
  [AoN rules page](https://2e.aonprd.com/Rules.aspx?ID=2715) and update
  `encounter-store.spec.ts` — that file is the spec, not just a test.
- Run `pnpm lint` and `pnpm test` before pushing. Not a hard gate, just saves round-trips.

## Issues

Use the issue templates if one fits; a plain description works too.

## Anything else

Open an issue or start a PR — happy to talk it through there.
