# ADR 0003 — Privacy-first analytics with self-hosted Umami

- **Status**: accepted
- **Date**: 2026-07-12

## Context

We want to know whether the tool is used and how encounters are actually
built (party level/size, most-used creatures, weak/elite adoption) without
cookies, consent banners, or shipping user data to a third party. v1 already
used a self-hosted [Umami](https://umami.is) instance; Umami counted most
sessions as bounces because a single-page tool generates one pageview and
nothing else ([#66](https://github.com/maxiride/pf2e-encounters/issues/66)).

A hard modelling problem: there is **no "encounter finished" signal**. Users
add and remove creatures continuously, so any "final encounter" event would be
arbitrary.

## Decision

Keep self-hosted Umami. The script tag in [`index.html`](../../index.html) is
wrapped in `<% if (ctx.prod) %>` so development builds never send traffic.
[`src/utils/analytics.ts`](../../src/utils/analytics.ts) wraps
`window.umami?.track` and silently no-ops when the script is absent (dev mode,
adblockers).

Instead of guessing at "finished", track discrete mutations plus an idle
snapshot — all centralized in
[`src/stores/encounter-store.ts`](../../src/stores/encounter-store.ts), the
only place that mutates encounter state:

| Event | When | Payload |
| --- | --- | --- |
| `encounter-add-creature` | every add (also the historical bounce workaround) | `name`, `level`, `npc` |
| `encounter-change-kind` | weak/base/elite actually changes | `name`, `kind` |
| `encounter-snapshot` | 8s after the last mutation, or immediately on tab-hide/`pagehide`; skipped while empty | `party_level`, `party_size`, `unique_creatures`, `creature_count`, `xp_cost`, `threat` |

## Consequences

- Aggregations ("average party level", "most-used creatures") happen in the
  Umami dashboard across many snapshots — no client-side statistics.
- A session that edits in bursts emits multiple snapshots; that's acceptable
  for trend data and far simpler than session reconstruction.
- No cookies and no PII: nothing here requires a consent banner.
