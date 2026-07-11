# Pathfinder 2e Encounter Builder — v2.0.0

A full rewrite of the encounter builder: new engine for pulling creature data, and a cleaner, faster interface for putting encounters together.

## 4,665 creatures and NPCs — 917 of them NPCs that were missing before

The old export only pulled what the Archives of Nethys website's "Export as JSON" button gave it, which quietly left out every NPC. This release queries the Archives directly and brings in **everything**: monsters and NPCs together.

| | Before | Now |
|---|---:|---:|
| Total creatures | 3,365 | 4,665 (+1,300) |
| NPCs included | 749 | 917 (+168) |
| Monsters | 2,616 | 3,748 (+1,132) |

## A gentler way to get that data

Previously, refreshing the creature list meant launching a full browser, loading the entire Archives of Nethys creatures page, and clicking through its UI — a heavy, slow process that could break every time the website's layout changed (it did, recently, when a cookie-consent banner started blocking the automation).

The new fetcher asks for exactly the data it needs in a single, lightweight request — no browser, no page load, no wasted traffic. And it only asks when there's a reason to:

- Routine development work never touches Archives of Nethys servers — the data only refreshes when it's actually stale.
- A scheduled check runs **once a month**, on the 1st, to pick up new releases — no more, no less.
- One request in, one response out. That's the whole interaction.

We take "don't overload a community resource" seriously, and the new pipeline is built around that from the ground up.

## What's new for building encounters

- **Search and filter, properly.** Find a creature by name, level range, rarity, size, family, alignment, or trait — filters that existed in the original site but had gone missing are back, plus family and alignment are new additions.
- **The encounter panel actually works now.** Add creatures, adjust their count, flip them between weak / base / elite, see the XP cost update live, and clear the whole encounter in one click.
- **A clearer threat bar.** See at a glance where an encounter lands — Trivial through Extreme — with the math corrected so the display never breaks when an encounter goes over budget.
- **Numbers that update when they should.** Changing your party's level now correctly recalculates every creature already in your encounter (a longstanding bug — thanks to everyone who reported it).
- **A tidier license notice.** The Paizo Community Use disclosure is fully readable again, with a link to the complete license text.

## Under the hood

Rebuilt on Vue 3, Quasar 2, and TypeScript, with a Pinia store architecture that's easier to extend going forward. Creature data now refreshes automatically once a month via GitHub Actions, so the list stays current without anyone needing to remember to run anything by hand.

---

*Alignment data is only available for creatures published before Pathfinder's 2023 Remaster, which removed alignment from the game — newer creatures won't have one to filter by.*
