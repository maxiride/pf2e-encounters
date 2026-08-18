# ADR 0006 — Warn on degenerate XP budget bands instead of reinterpreting them

- **Status**: accepted
- **Date**: 2026-08-15

## Context

[Issue #81](https://github.com/maxiride/pf2e-encounters/issues/81) reported that at party
size 1 the "Low" difficulty reads as easier than "Trivial". Checked against the rulebook's
[Encounter Budget table](https://2e.aonprd.com/Rules.aspx?ID=2717) (GM Core): the Character
Adjustment per player below 4 is 10/20/20/30/40 for Trivial/Low/Moderate/Severe/Extreme.
Because Low's adjustment (20) is double Trivial's (10), Low's budget catches up to and then
undercuts Trivial's as party size shrinks:

- party of 2: trivial = low = 20 (tie — Low is unreachable, `threat()` matches trivial first)
- party of 1: trivial = 10, low = 0 (inverted — Low is unreachable and lower)

`encounter-store.ts`'s math is a correct implementation of the rulebook formula. This is a
rules-as-written gap in how the table handles small parties, not a bug in this tool's
arithmetic — and per the project's stance (README/CLAUDE.md: "rules-as-written, no
house-ruling"), we don't invent an unofficial correction the rulebook doesn't define.

**Term:** a **degenerate budget band** is a difficulty band whose upper bound is less than or
equal to a lower band's upper bound for the current party size, making that band unreachable
by `threat()`.

## Decision

Add a generic, advisory-only warning instead of special-casing party sizes 1 and 2 or
altering the threat/budget math:

- `encounter-store.ts` exposes a computed `hasDegenerateBudget: boolean` that checks all five
  `xpBudget` bounds for non-decreasing order (trivial ≤ low ≤ moderate ≤ severe ≤ extreme).
  Generic by construction, so it self-detects if the rulebook or the formula ever changes,
  rather than hardcoding "warn when partySize <= 2".
- `EncounterList.vue` shows a warning icon + tooltip next to the **party size** input (not
  per-creature, not on `ThreatBar`), since this is a property of the party-size choice itself,
  true before any creature is added — mirrors the existing `isDeltaOutOfBounds` icon+tooltip
  pattern (see issue #62 / ADR context in `encounter-store.ts`).
- The tooltip explains the rules-as-written gap, links the rulebook page and issue #81, and
  says GM judgment applies. Nothing about `threat`, `xpBudget`, or the threat badge changes.

## Consequences

- No behavior change to the XP math; a GM setting party size to 1 or 2 gets an explanation
  instead of a silent, confusing "Low never shows up".
- The check is a byproduct of the existing budget computation (a pairwise comparison over
  values already computed), so it stays in sync automatically if `xpBudget`'s formula changes.
- If the rulebook is ever errata'd for small parties, only `xpBudget` needs to change —
  `hasDegenerateBudget` and the warning UI need no update.
