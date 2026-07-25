# AoN Creatures Downloader

Fetches every creature and NPC from the [Archives of Nethys](https://2e.aonprd.com) public
Elasticsearch endpoint (`elasticsearch.aonprd.com` — the same backend the website itself queries)
and writes `public/creatures.json` plus `public/metadata.json` for the app.

## Usage

```bash
pnpm run generate:data          # skipped if creatures.json is fresher than 7 days
pnpm run generate:data --force  # always download
```

No dependencies — plain Node ≥ 18 (`fetch` built in).

## How it works

One `_search` request filtered on `category=creature` (excluding `exclude_from_search`
entries — reprints and joke statblocks, mirroring the website), sorted by name, with
`_source` limited to the fields the app needs. A single request covers the whole corpus
(~4.7k documents, well under the 10k page limit); the script fails loudly if that ever
stops being true.

## History

- **v1 (2021)**: custom Go webscraper crawling the HTML pages. Brittle, lots of manual work.
- **v2 (2025)**: Playwright driving the website UI to click "Export as JSON". Broke when AoN
  added a cookie-consent dialog, missed NPCs, needed a full Chromium download.
- **v3 (current)**: direct Elasticsearch query. One HTTP request, zero dependencies.

## Disclaimer

**DO NOT ABUSE THE TOOL** — the Archive of Nethys is a public, community-driven resource.
The freshness guard exists so development runs never hit AoN; the scheduled GitHub Action
refreshes data once a month.
