# ADR 0005 — No client-side cache (localStorage/IndexedDB) for creature data

- **Status**: accepted
- **Date**: 2026-07-26

## Context

`creatures.json` + `metadata.json` are fetched on every app boot
([`src/boot/creatures.ts`](../../src/boot/creatures.ts)) with no caching layer
beyond the browser's default HTTP cache. Raised whether storing the payload
in localStorage/IndexedDB would meaningfully speed up load.

Measured (2026-07-26, current data snapshot):

- `creatures.json`: 1,169,825 bytes raw (4,665 creatures), **147KB over the
  wire** — GitHub Pages' CDN already serves it gzip-encoded
  (`Content-Encoding: gzip`, confirmed on the live response).
- `metadata.json`: 12.8KB raw / 5.2KB gzip.
- `JSON.parse` of the full creatures array: ~12ms (Node/V8, desktop). Expect
  2-4x on low-end mobile — still comfortably under 50ms.
- Live response headers already carry `Cache-Control: max-age=600` and an
  `ETag`. The browser serves both files from HTTP cache for free for 10
  minutes, then issues a conditional GET (304, headers-only, no 147KB
  re-transfer) since the files only change on the monthly refresh
  ([ADR 0002](0002-monthly-data-refresh-and-gh-pages-deploy.md)).

## Decision

**Do not add a localStorage/IndexedDB cache for creature data.** Rely on the
existing HTTP caching GitHub Pages already provides.

Reasoning:

- The HTTP cache + 304 revalidation already eliminates the 147KB re-download
  for all but a cold reload after >10 minutes idle — a case where the saved
  cost is one small round-trip (tens to a couple hundred ms), not the full
  payload.
- A localStorage cache would still require `JSON.parse` on every read (it
  only stores strings), so it would **not** reduce parse time — the
  measured ~12ms is that cost regardless of source.
- An IndexedDB cache could skip re-parsing (stores structured clones), but
  only at the cost of real added complexity: versioning against
  `metadata.updated`, quota handling, staleness fallback, extra code paths
  to test — for a win bounded by a single sub-200ms round-trip in an
  uncommon case.

## Consequences

- No new code, no new failure modes (corrupt cache, quota exceeded, stale
  cache serving old creature data past a refresh).
- Loading-time ceiling at current data scale is the unavoidable one-time
  network fetch + ~12ms parse, not caching strategy.
- Revisit if `creatures.json` grows ~5-10x its current size, or if real user
  analytics ([ADR 0003](0003-privacy-first-analytics-with-umami.md)) surface
  slow first-loads on actual devices — neither is true today.
