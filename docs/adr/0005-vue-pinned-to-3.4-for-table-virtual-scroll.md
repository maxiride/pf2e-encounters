# ADR 0005 — Dropped QTable virtual-scroll; Vue stays pinned to 3.4.38 anyway

- **Status**: superseded (virtual-scroll dropped) — Vue pin still stands
- **Date**: 2026-07-13, updated same day

## Context

Switched `CreaturesTable` from click-through pagination to `q-table`'s
`virtual-scroll` (native infinite scroll, no custom scroll-handling code —
matches the old v1 UX the maintainer preferred).

With Vue 3.5.21 (the version `^3.4.18` resolves to as of this writing) and
Quasar 2.18.2, virtual-scroll silently renders **zero rows**: the padding
spacer rows appear (correct total height, correct item-size CSS var) but
the actual content `<tbody>` stays empty, no console error. Pinning `vue` to
`3.4.38` fixed it in an isolated repro (plain `q-table`, hardcoded 500-row
array, no app code) and, initially, in this table too.

**It didn't stay fixed.** Across a long debugging session (dev-server
restarts, HMR churn, a Playwright run that hung for 20 minutes on Windows)
the same 3.4.38-pinned setup went back to rendering zero rows, repeatedly,
including in a from-scratch production build served fresh. Some of those
"failures" turned out to be a red herring — one round tested the prod build
through a plain static server without the `/pf2e-encounters/` base path, so
the JS 404'd and the app never mounted at all, nothing to do with
virtual-scroll. But even after ruling that out, virtual-scroll's reliability
in this dev environment stayed inconsistent enough (works, then doesn't,
across otherwise-identical restarts) that it's not trustworthy to ship on.

Separately — and this is what actually mattered for the user-facing bug this
work started from — virtual-scroll was also the direct cause of a real
**scrolling performance problem**: every scroll tick recycles rows in and out
of the DOM, and each row was mounting four Quasar components (`QBadge` ×2,
`QBtn`, `QTooltip`). Mounting/unmounting those on every recycle is what made
scrolling stutter and the page freeze for seconds at a time (measured: single
scroll events were cheap, but a realistic rapid-scroll burst produced up to
256ms single blocking tasks and multi-second cumulative jank).

## Decision

1. **Dropped `virtual-scroll` entirely.** All ~4,665 filtered rows render at
   once inside a fixed-height (`65vh`), natively-scrollable `q-table` (no
   `virtual-scroll` prop; `pagination.rowsPerPage: 0` + `hide-bottom` still
   used). No DOM-node-count optimization, but no virtual-scroll calculation
   left to fail either — scrolling is now the browser's native, GPU-composited
   scroll, not something Quasar recomputes per tick.
2. **Replaced the four per-row Quasar components with plain HTML/CSS**
   (`.badge-outline` spans instead of `QBadge`, a plain `<button>` with a
   native `title` attribute instead of `QBtn` + `QTooltip`). This was the
   actual fix for the freeze — it matters with or without virtual-scroll,
   since it also cuts the cost of the initial full-list mount.
3. **`vue` stays pinned exact at `3.4.38`** regardless — it's still the
   version known to work, and unpinning it isn't a decision to make casually
   for an unrelated change. If Vue's version ever needs to move, re-verify
   this table (and anything else Vue-version-sensitive) from a clean state
   before trusting it.

Measured after the fix (synthetic rapid-scroll burst, 20 ticks): wall time
19.8s → 3.6s, worst single blocking task 256ms → 88ms, no more cascading
multi-second freeze.

## Consequences

- All rows mount once at load/filter-change instead of incrementally — the
  lightweight markup (plain HTML, no component overhead) keeps this cheap
  enough not to matter in practice.
- If the dataset grows an order of magnitude and initial-mount cost becomes
  a real problem, virtual-scroll is the natural next thing to revisit — but
  only after confirming, in a clean environment, that it's actually stable
  first. Don't re-add it speculatively.
- `markRaw()` on the filtered array (in `CreaturesTable.vue`) is kept even
  without virtual-scroll — it's still valid general advice for a
  computed-derived array this size, cheap to keep, no reason to remove it.
