# Archives of Nethys (AoN) Elasticsearch API — Reference

Public, unauthenticated Elasticsearch endpoint that powers
[2e.aonprd.com](https://2e.aonprd.com). This project's scraper
(`scripts/scrape.mjs`) reads it to build `public/creatures.json`.

## Endpoint

```
POST https://elasticsearch.aonprd.com/aon/_search
Content-Type: application/json
```

Standard ES 7.x request body. No auth, no rate limit advertised — be polite.

## Categories

All documents share a single index. Use `term: { category: "<name>" }` to scope
to a content type. Doc counts as of the last scrape:

| Category              | Docs  | Category               | Docs |
|-----------------------|-------|------------------------|------|
| equipment             | 8595  | trait                  | 907  |
| feat                  | 8390  | deity                  | 715  |
| **creature**          | 4684  | sidebar                | 691  |
| action                | 3944  | creature-family        | 646  |
| rules                 | 3628  | hazard                 | 634  |
| spell                 | 2454  | weapon                 | 614  |
| item-bonus            | 1297  | background             | 606  |
| class-feature         | 1254  | heritage               | 432  |
| …                     |       | archetype              | 334  |

(+ language, ancestry, condition, vehicle, ritual, relic, etc.)

## Pagination

ES default `size` cap is 10000 per request; this scraper uses 1000 and pages
with `search_after` on a stable sort key:

```json
{
  "size": 1000,
  "query": { "bool": { "must": [{ "term": { "category": "creature" } }] } },
  "sort": [{ "id.keyword": "asc" }],
  "search_after": ["creature-1000"]
}
```

Stop when the page returns fewer than `PAGE_SIZE` hits.

## Creature document

Below is the full field set observed on `category: creature` documents, with
the source row for a sample (Goblin Warrior, `creature-3024`).

### Identity & sourcing

| Field                     | Type            | Notes                                                                                                                       |
|---------------------------|-----------------|-----------------------------------------------------------------------------------------------------------------------------|
| `id`                      | string          | `"creature-3024"`. Prefix is the category; strip for the numeric AoN id.                                                    |
| `name`                    | string          | Display name.                                                                                                               |
| `category`                | string          | Always `"creature"` here.                                                                                                   |
| `type`                    | string          | Almost always `"Creature"`.                                                                                                 |
| `npc`                     | bool            | `true` → entry comes from the NPC catalogue; URL uses `NPCs.aspx`, otherwise `Monsters.aspx`.                               |
| `url`                     | string          | Relative URL on aonprd.com (`/NPCs.aspx?ID=3024`).                                                                          |
| `release_date`            | ISO date string | First publication date. The Pathfinder Remaster line began Nov 15 2023 (Player Core); Monster Core followed 2024-03-27.    |
| `source`                  | string[]        | Source books this entry appears in (e.g. `["Monster Core"]`).                                                               |
| `primary_source`          | string          | The canonical book; `source[0]` in practice.                                                                                |
| `primary_source_category` | string          | High-level source bucket (`"Rulebooks"`, `"Adventure Paths"`, …).                                                           |
| `primary_source_raw`      | string          | Includes page number: `"Monster Core pg. 174"`.                                                                             |
| `source_raw`              | string[]        | Per-source page citations.                                                                                                  |
| `source_category`         | string[]        | Per-source buckets.                                                                                                         |
| `source_markdown`         | string          | Rendered markdown of source citations with AoN links.                                                                       |

### Remaster relationship (important)

AoN models Remaster supersession as a paired cross-reference. **A creature
has at most one of these two fields populated.**

| Field         | Set on               | Meaning                                                                                                                      |
|---------------|----------------------|------------------------------------------------------------------------------------------------------------------------------|
| `remaster_id` | the **legacy** entry | Array of `creature-<n>` ids of the remastered replacement(s). Populated → this document IS legacy. **951 creatures.**       |
| `legacy_id`   | the **remaster** entry | Array of `creature-<n>` ids of the legacy original(s) it replaced. Populated → this document IS the remastered version. **954 creatures.** |

The counts differ by 3 because a few legacy creatures were split or merged
into multiple remastered entries (e.g. one legacy → two remastered, so two
`legacy_id` rows reference the same `remaster_id` target).

### "Legacy" — three plausible definitions

Important: **these mean different things and pick different sets**. Choose
based on intent.

| Definition                                          | Field test                                                  | Count |
|-----------------------------------------------------|-------------------------------------------------------------|-------|
| **Explicitly superseded by a remaster**             | `remaster_id` exists                                        | 951   |
| **Published before the Remaster shipped**           | `release_date < 2023-11-15`                                 | 2753  |
| **Published after the Remaster shipped**            | `release_date >= 2023-11-15`                                | 1931  |

Most pre-remaster creatures **were never explicitly replaced** — they're
still canonical, just predate the Remaster. Filtering on `remaster_id`
alone hides only the 951 entries that have a named successor (mostly
OGL-protected concepts and a few alignment-tied iconics).

If the goal is "hide pre-Remaster content," combine the two:

```js
const isLegacy =
  !!c.remaster_id ||                  // explicitly superseded
  new Date(c.release_date) < new Date('2023-11-15'); // pre-Remaster source
```

### Statblock

| Field                                   | Type        |
|-----------------------------------------|-------------|
| `level`                                 | number      |
| `hp`, `hp_raw`, `hp_scale`, `hp_scale_number` | n / s / s / n |
| `ac`, `ac_scale`, `ac_scale_number`     | n / s / n   |
| `perception`, `perception_scale*`       | n / s / n   |
| `fortitude_save`, `reflex_save`, `will_save` (+ `_scale`, `_scale_number`) | n / s / n |
| `strongest_save`, `weakest_save`        | string[]    |
| `strength` / `dexterity` / `constitution` / `intelligence` / `wisdom` / `charisma` (+ `_scale`, `_scale_number`) | n / s / n |
| `attack_bonus`, `attack_bonus_scale`, `attack_bonus_scale_number` | array variants |
| `strike_damage_average`, `strike_damage_scale*` | array variants |
| `speed`                                 | object — `{ land: 25, max: 25 }`. Other keys: `fly`, `swim`, `climb`, `burrow`. |
| `speed_markdown`, `speed_raw`           | string      |
| `sense`, `sense_markdown`               | string      |
| `vision`                                | string (`"Darkvision"`, `"Low-Light Vision"`, …) |
| `language`, `language_markdown`         | string[] / string |
| `skill` (names), `skill_mod` (object), `skill_markdown` (rendered) | mixed |
| `resistance`, `weakness`, `immunity` (+ `_markdown`, `_raw`) | object / string |
| `creature_ability`                      | string[] of named abilities |
| `item`                                  | string[] of carried items   |
| `stealth`                               | string (Stealth modifier as printed) |
| `pfs`                                   | string — Pathfinder Society legality (`"Standard"`, `"Limited"`, `"Excluded"`) |

### Classification

| Field                       | Type     | Notes                                                                                  |
|-----------------------------|----------|----------------------------------------------------------------------------------------|
| `size`                      | string[] | `["Small"]`. Single-element array — flatten on read.                                  |
| `size_id`                   | number[] |                                                                                        |
| `alignment`                 | string   | Two-letter code (`"NE"`, `"LG"`) or `"No Alignment"`. Largely vestigial post-Remaster. |
| `rarity`                    | string   | `"common"` / `"uncommon"` / `"rare"` / `"unique"`.                                     |
| `rarity_id`                 | number   |                                                                                        |
| `trait`                     | string[] | All applicable traits — includes size, creature type, alignment, ancestry, etc.        |
| `trait_raw`                 | string[] | Traits with the size stripped.                                                         |
| `trait_group`               | string[] | High-level groupings (`"Ancestry"`, `"Creature Type"`, …).                             |
| `trait_markdown`            | string   | Linked rendering of `trait`.                                                           |
| `creature_family`           | string   | Family name (`"Goblin"`).                                                              |
| `creature_family_markdown`  | string   | Linked rendering.                                                                      |
| `is_standard_ancestry_feat` | bool     | Used elsewhere; usually `false` on creatures.                                          |

### Media & prose

| Field                 | Type                                  |
|-----------------------|---------------------------------------|
| `image`               | string[] — relative paths under `/Images/Monsters/…webp`. |
| `summary`             | string — short flavor text.           |
| `summary_markdown`    | string                                |
| `text`                | string — full searchable body.        |
| `markdown`            | string — full statblock as AoN markdown. |
| `search_markdown`     | string — trait + source block fragment. |
| `tradition_markdown`  | string — magic tradition tags (mostly empty on creatures). |
| `spell_markdown`      | string — spell list rendering for casters. |

### Operational

| Field                 | Notes                                                                       |
|-----------------------|-----------------------------------------------------------------------------|
| `exclude_from_search` | bool — set on hidden/deprecated entries.                                    |

## Useful queries

**Count remastered vs. legacy:**

```bash
curl -s -X POST 'https://elasticsearch.aonprd.com/aon/_search' \
  -H 'Content-Type: application/json' \
  -d '{"size":0,"query":{"term":{"category":"creature"}},
       "aggs":{
         "with_remaster_id":{"filter":{"exists":{"field":"remaster_id"}}},
         "with_legacy_id":  {"filter":{"exists":{"field":"legacy_id"}}}
       }}'
```

**Find a creature's remastered counterpart:**

```bash
curl -s -X POST 'https://elasticsearch.aonprd.com/aon/_search' \
  -H 'Content-Type: application/json' \
  -d '{"size":1,"query":{"term":{"id":"creature-1"}},
       "_source":["id","name","remaster_id","remaster_name"]}'
# → Unseen Servant → Phantasmal Minion (creature-2750)
```

**Sources contributing the most creatures:**

```bash
curl -s -X POST 'https://elasticsearch.aonprd.com/aon/_search' \
  -H 'Content-Type: application/json' \
  -d '{"size":0,"query":{"term":{"category":"creature"}},
       "aggs":{"sources":{"terms":{"field":"primary_source.keyword","size":40}}}}'
```

Top buckets at the time of writing — post-Remaster sources are bolded:

| Source                 | Count |
|------------------------|-------|
| **Monster Core**       | 445   |
| Bestiary               | 413   |
| **Monster Core 2**     | 395   |
| Bestiary 2             | 335   |
| Bestiary 3             | 324   |
| **NPC Core**           | 270   |
| Kingmaker Adv. Path    | 164   |
| **Draconic Codex**     | 117   |
| Book of the Dead       | 86    |
| Gamemastery Guide      | 83    |
| **Howl of the Wild**   | 76    |
| Rage of Elements       | 76    |
