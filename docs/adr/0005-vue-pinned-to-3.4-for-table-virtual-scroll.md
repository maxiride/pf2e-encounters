# ADR 0005 — Vue pinned to 3.4.38 (Quasar's QTable virtual-scroll breaks on 3.5+)

- **Status**: accepted
- **Date**: 2026-07-13

## Context

Switched `CreaturesTable` from click-through pagination to `q-table`'s
`virtual-scroll` (native infinite scroll, no custom scroll-handling code —
matches the old v1 UX the maintainer preferred).

With Vue 3.5.21 (the version `^3.4.18` resolves to as of this writing) and
Quasar 2.18.2, virtual-scroll silently renders **zero rows**: the padding
spacer rows appear (correct total height, correct item-size CSS var) but
the actual content `<tbody>` stays empty. No console error. Confirmed with
an isolated repro (plain `q-table`, hardcoded 500-row array, no app code, no
custom slots, no store) — same failure, ruling out anything project-specific.
None of the commonly-suggested fixes helped: `table-style`,
`virtual-scroll-item-size`, `virtual-scroll-slice-size`, dropping `dense`,
`markRaw()` on the rows array (still applied — it's Quasar's own documented
recommendation for large lists, just wasn't the cause here).

Pinning `vue` to `3.4.38` fixes it immediately, no other changes needed.

## Decision

`package.json` pins `"vue": "3.4.38"` — exact version, no `^` — so a routine
`pnpm update` can't silently reintroduce this. If it did, the table would
render an empty, correctly-sized scrollbar with no rows and no error, which
is a nasty one to debug twice.

## Consequences

- Stuck on Vue 3.4.x until either Quasar patches virtual-scroll for 3.5+, or
  we drop virtual-scroll. Check before bumping: load the table, resize the
  window, confirm rows other than the first page actually render.
- If this needs revisiting: dropping `virtual-scroll` and rendering the full
  filtered list (`pagination.rowsPerPage: 0`, `hide-bottom`, fixed-height
  scrollable container, no `virtual-scroll` prop) is the fallback — no true
  DOM virtualization, but ~4,665 simple rows is not a lot for a modern
  browser, and it sidesteps this bug entirely.
