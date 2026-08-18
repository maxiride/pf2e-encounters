# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Game Masters running Pathfinder 2e. Primary use is prep-time: building and XP-balancing an
encounter before a session. Some fraction of users likely keep it open during live play for
quick lookups or last-minute adjustments, but that is a secondary, unconfirmed use case — the
author's own hypothesis is that most GMs prepare ahead of time, so live-table use is niche.

## Product Purpose

Let a GM browse every creature/NPC from the Archives of Nethys and assemble an encounter with
live XP-budget feedback, so they don't have to hand-tally XP or re-derive Weak/Elite adjustments
themselves. Success is a correctly-balanced encounter assembled with less manual arithmetic.

## Positioning

Implements the GM Core encounter-building math rules-as-written, including *Weak* and *Elite*
variant adjustments — which the product's own README states most similar tools overlook. No
house-ruling; rules discussions cite the relevant AoN rules page (see issue #62).

## Operating Context

- Client-only SPA, no backend at runtime, no accounts/login.
- Creature/NPC data is a static JSON snapshot (`public/creatures.json` + `metadata.json`)
  refreshed monthly by a scheduled GitHub Action against AoN's public Elasticsearch endpoint;
  the app only ever reads the committed static files.
- Hosted on GitHub Pages (`gh-pages` branch), deployed from `main`.
- Used in a browser, most likely desktop during prep; mobile/at-table use is unconfirmed but
  plausible.

## Capabilities and Constraints

- Browse/filter creatures by level, type, traits, rarity, size, family, alignment, source, and
  Legacy/Remastered edition.
- Assemble an encounter and see live XP budget math, including Weak/Elite adjustments.
- No backend, no user accounts, no server-side persistence — any saved state is client-side only.
- Data freshness is bounded by the monthly refresh cadence; the downloader intentionally makes a
  single polite request with a freshness guard (see ADR 0001) rather than live-querying AoN.
- Analytics: self-hosted Umami, production builds only, no cookies (ADR 0003).

## Evidence on Hand

Live production site: https://maxiride.github.io/pf2e-encounters/. No testimonials, case studies,
or user research on hand — the "live at-table use" audience segment is an unconfirmed hypothesis,
not evidence; do not present it as validated.

## Product Principles

1. Rules-as-written, no house-ruling — every rules-affecting decision must be traceable to an AoN
   rules page.
2. Prep-time is the primary job; anything that would slow down or clutter the prep flow to serve
   a hypothetical live-table use case needs justification.
3. Zero backend, zero accounts — the product's value comes from correctness and speed against
   static data, not from server-side features.
4. Be a good citizen of AoN's public infrastructure — data-fetching behavior stays conservative
   even if it costs freshness or convenience.
