# ADR 0001 — Creature data via the AoN Elasticsearch endpoint

- **Status**: accepted
- **Date**: 2026-07-11

## Context

The app needs the full Pathfinder 2e creature and NPC catalogue from the
[Archives of Nethys](https://2e.aonprd.com) (AoN). Two prior approaches failed:

1. **v1 (2021)** — a custom Go scraper crawling AoN's HTML pages. Brittle,
   required manual cleanup on every run.
2. **v2 draft (2025)** — Playwright driving a headless Chromium through the
   website UI to click "Export as JSON". It broke when AoN added a
   cookie-consent overlay, missed all ~900 NPCs (the UI export only covers the
   monsters page), and required a full Chromium download just to fetch data.

AoN has no official data API and, per feedback on their Discord, one is out of
scope for them. The website itself, however, queries a public Elasticsearch
instance at `elasticsearch.aonprd.com`.

## Decision

Query the Elasticsearch endpoint directly:
[`tools/aon-downloader/fetch-creatures.js`](../../tools/aon-downloader/fetch-creatures.js)
sends **one** `_search` request (`category=creature`, excluding
`exclude_from_search` reprints/joke entries — mirroring the website's own
behaviour), sorted by name, with `_source` limited to the fields the app needs.
It writes `public/creatures.json` (app-ready schema) and
`public/metadata.json` (filter values) in the same run. Zero dependencies,
plain Node ≥ 18.

Being a good citizen of a community-run resource is a design constraint, not
an afterthought:

- a **7-day freshness guard** skips the download entirely unless `--force` is
  passed, so routine dev sessions never hit AoN;
- the whole corpus (~4.7k documents) fits one request — no crawling, no
  pagination hammering;
- the script fails loudly if the corpus ever exceeds the 10k single-page
  limit, rather than silently truncating (`search_after` pagination can be
  added then);
- an identifying `User-Agent` points back to this repository.

## Consequences

- Monsters **and** NPCs arrive together (`npc` boolean per record); the data
  set grew from 3,365 to ~4,665 records.
- The schema is typed and richer (numeric `level`/`hp`/`ac`, array
  `traits`/`size`/`sources`, `alignment`, `family`).
- `alignment` only exists on pre-Remaster statblocks (the 2023 Remaster
  removed it from the game), so ~42% of records have an empty value.
- We depend on an undocumented endpoint: if AoN restructures its index the
  script breaks — loudly, at data-refresh time, never at user-facing runtime
  (the committed JSON keeps working).
