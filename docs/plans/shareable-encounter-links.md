# Shareable encounter links — action plan

Ref: issue #51. Context dump — investigation done, no code written yet.

## Decision: hash query param, no compression

- URL length is **not** a real constraint here. Browser floors (Firefox ~65K,
  Chrome/Edge ~2MB) are all far above anything this app would generate.
- The only limit worth worrying about is CDN/proxy request-line limits
  (Fastly, what GitHub Pages runs on — ~8-16KB), and those only apply to
  bytes actually sent to the server (path + query string).
- Router already defaults to `createWebHashHistory` (`src/router/index.ts:22`,
  unset `VUE_ROUTER_MODE` — GH Pages has no server rewrite rules). Hash-mode
  vue-router still parses query params after the `#` (`/#/?e=...`), so
  `route.query` works normally and the payload never reaches the server on
  load/reload/direct nav.
- Conclusion: **skip compression entirely** (no pako/lz-string/CompressionStream).
  A plain fixed-width base36 string is enough.

## Encoding

Every creature in an encounter comes from the static `public/creatures.json`
(4,665 entries; `addCreature` in `encounter-store.ts` is only ever called from
`CreaturesTable.vue` with `row.url` — no custom/homebrew entry path exists).
So the link only needs enough info to re-look-up each row at load time, not
the full name/level.

Per-creature-stack token, fixed width, **no delimiter needed**:

```
<type:1><id:3><kind:1><count:2>   = 7 chars
```

- `type`: `n` (NPCs.aspx) / `m` (Monsters.aspx) — only 2 url prefixes exist.
- `id`: AoN numeric ID, base36. Current max ID is `4849` (checked via script
  against `public/creatures.json`) — 3 base36 chars (max 46656) has headroom.
- `kind`: `b`/`w`/`e` (base/weak/elite).
- `count`: base36, 2 chars (max 1295) — covers absurd swarm counts.

Header, also fixed width, prefixed once: `<partySize:2><partyLevel:2>` = 4 chars.

Total length ≈ `4 + 7×N` chars, N = unique creature stacks (not individual
creatures — count is packed in per stack).

- Typical encounter (3-8 stacks): ~55-60 chars.
- Large (20 stacks): ~144 chars.
- Absurd (100 stacks): ~704 chars.

All trivial versus the browser floor above.

## Implementation steps (not started)

1. Pure encode/decode helpers, no store coupling:
   - `encodeEncounter(partySize, partyLevel, creatures) -> string`
   - `decodeEncounter(string) -> { partySize, partyLevel, stacks }` — stacks
     are `{ type, id, kind, count }`, resolved against `creatures-store.ts`
     data by the caller (helpers themselves don't need the dataset loaded).
2. "Share" action (explicit button, **not** a live URL sync — avoids router
   churn / history spam on every add/remove): builds the URL from current
   `encounter-store` state on demand, copies to clipboard.
3. On app load, check `route.query.e` (short key). Must wait until
   `creatures-store` has finished loading (decode needs the static dataset
   for lookup) before rehydrating via existing actions (`addCreature`,
   `setCreatureKind`, `setPartySize`, `setPartyLevel`).
4. Graceful failure: unknown/stale AoN ID (data refreshes monthly, an entry
   could theoretically disappear) — skip that stack, don't crash the whole
   decode.
5. Unit tests for encode/decode round-trip in Vitest, alongside
   `encounter-store.spec.ts`, per project convention (`docs/adr/0004`).

## Explicitly skipped (ponytail ladder)

- Compression library — no code, add only if real encounter sizes ever
  approach browser URL limits (currently 3 orders of magnitude away).
- Query string (not hash) — hash sidesteps the CDN limit entirely, free win.
- Storing `name`/`level` in the link — derivable from the static dataset
  already loaded client-side.
- Bigger ID encoding than 3 base36 chars — only needed if AoN ID range grows
  past 46,656 (currently 4,849) or the app adds homebrew creatures without an
  AoN ID.
