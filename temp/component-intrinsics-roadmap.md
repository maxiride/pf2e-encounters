# Component intrinsics — roadmap

A logical progression from the bug we found to the pattern we want for the whole package. The two detail docs (`sectiondivider-intrinsics-via-css.md` and `build-time-pruning-plan.md`) sit underneath as references; this one is the navigation.

---

## The arc

**Problem we hit:** the editor's per-variant *intrinsics* on SectionDivider — alignment, hairline position, eyebrow visibility, description visibility, eyebrow casing — never reach the live `<SectionDivider>` on the demo page. The editor preview wires them up by hand; nothing else does.

**Why it matters:** "designer edits a variant → every consumer instance updates" is a core value prop of the package. CSS-var tokens (colors, padding, fonts) already deliver on this without per-consumer wiring. Intrinsics don't, and that's a credibility gap.

**The destination:** *all* variant attributes — visual and structural — flow through the same CSS-var pipeline that colors already use. Consumer hard-codes the variant name; everything else cascades. Dev gets live editing. Prod ships clean DOM with no hidden elements.

**Getting there is two pieces of work**, in sequence, with a usable shipping state after each:

| Phase | What it does | What ships after |
|---|---|---|
| 1 | **CSS-var refactor** of SectionDivider intrinsics | The bug is fixed. Editor changes flow to every divider. Prod DOM contains hidden elements (`display: none`). |
| 2 | **Build-time pruning** preprocessor | Prod DOM is clean. Hidden elements stripped at build. Pattern available for other components. |

Each phase is independently useful. We can pause between them indefinitely if priorities shift. The package's promise is satisfied at the end of phase 1; phase 2 satisfies the *aesthetic* of that promise.

---

## Phase 1 — CSS-var refactor (~1 day)

**Detail doc:** `sectiondivider-intrinsics-via-css.md`.

**Goal:** every SectionDivider intrinsic becomes a CSS variable on `:root`. The component renders all conditional markup unconditionally and uses `display: var(...)`, `text-align: var(...)`, etc. to switch behavior per variant. No editorState subscription. No consumer wiring. The variant prop alone selects which set of vars cascades.

**Specific work:**

1. New migration `2026-05-22-sectiondivider-intrinsics-to-css.ts` that converts the old config keys to the new CSS-var keys (mapping table in the detail doc, section 4).
2. `SectionDivider.svelte` rewrites:
   - Drop the conditional `{#if eyebrow}` / `{#if description}` / hairline-position branching.
   - Render all six hairlines, eyebrow, and description as siblings; control visibility via per-variant CSS vars.
   - Use container style queries (or six display vars, fallback) for hairline-position selection.
   - Drop the `align`, `hairline`, `eyebrowUppercase` props (consumer doesn't pass them anyway).
3. `SectionDividerEditor.svelte` mutators rewrite — `setCfg` writes the new keys instead of the old `show-x` / `'1'`/`''` shape.
4. `KNOWN_COMPONENT_CONFIG_KEYS` (componentConfigKeys.ts:16) loses every SectionDivider entry except `--sectiondivider-{v}-color-family`. The others become cascading CSS vars handled by the normal token-alias pipeline.
5. Verify on `/demo`: editor alignment change updates `The Kit` live; toggling show-eyebrow on the lg variant hides eyebrow across every lg instance on the page.

**Decisions settled** (detail in `sectiondivider-intrinsics-via-css.md` section 8):

1. **Hairline position:** container style queries, one var per variant carrying the position name.
2. **Per-instance overrides:** dropped. Variant is the sole source of hairline visuals.
3. **Suppressed content:** silent. No console warning when a variant hides content the consumer passed.
4. **Demo wiring:** `Section.svelte` gains an `eyebrow` prop; at least one demo section uses it.
5. **Migration:** bundled with the refactor in a single PR.

**What ships:** the user-visible bug from the screenshot is gone. Editor → live divider sync works for every intrinsic. The demo can showcase variant differences. The component file is slightly heavier (more markup, less branching); the DOM has some `display: none` elements per variant.

**Out of scope for phase 1:** Dialog (different pattern, needs its own audit), other components (none have this need today), build-time pruning of the hidden elements.

---

## Phase 2 — Build-time pruning (~1.5 days)

**Detail doc:** `build-time-pruning-plan.md`.

**Goal:** ship clean DOM in production. The `display: none` elements that phase 1 leaves in the prod build get pruned at compile time — the markup never reaches the bundle for variants that hide it.

**The mechanism (revised after research, see detail doc section 1):** lean on two pieces of existing infrastructure rather than build a preprocessor from scratch.

1. `svelte-preprocess` ships a `replace` preprocessor (`[RegExp, ReplaceFn][]`). Already in the pipeline at `svelte.config.js:5`.
2. Vite constant-folds `import.meta.env.DEV` in production, including inside Svelte `{#if}` markup blocks.

Combined: components carry a dev branch (`{#if import.meta.env.DEV}` — full markup with CSS hiding) and an else branch with `<!--PRUNE_FOR component key op value-->...<!--END_PRUNE-->` markers. The replacement function reads the production config, computes which variants keep each block, emits `{#if variant === 'lg' || ...}` guards. Vite strips the dev branch in production; the variant guards leave only the actually-needed markup.

**Specific work** (12–16 hours per the detail doc):

1. **Verification spikes (first hour):** confirm `import.meta.env.DEV` folds inside Svelte markup blocks, and confirm `replace` matches all occurrences (or work around issue #477).
2. Marker syntax + arg parser.
3. Replacement function (operator dispatch, guard generation).
4. Prod-config loader (Node fs reads of `component-configs/<component>/<file>.json`).
5. Wire into `svelte.config.js`.
6. SectionDivider retrofit — add the dev/else split with markers around each previously-CSS-hidden block.
7. Unit tests with mock prod configs.
8. Marker reference docs.

**Decisions settled** (detail in `build-time-pruning-plan.md` section 7):

1. **MVP scope:** SectionDivider only. Dialog handled in phase 3.
2. **Marker name:** `PRUNE_FOR` / `END_PRUNE`.
3. **Strict mode:** always on. Unknown config keys throw at build time.
4. **Variant prop name:** hard-coded to `variant`.

**What ships:** prod bundles contain only the markup the active variant actually renders. Dev still renders everything for live editing. The pattern is available for any future component with the same need — adding markers is a one-hour retrofit per component once the infrastructure exists.

**Out of scope for phase 2:** exposing the preprocessor function as a public API for consumer-authored components (deferrable), Dialog retrofit (separate audit).

---

## Phase 3 — Pattern extension (optional, later)

After phase 2 the pattern exists. We apply it where it adds value:

- **Dialog audit.** Today `Dialog.svelte:5,42-44` is the only other live component that pulls intrinsics from `editorState` — the `confirm-variant` / `cancel-variant` fallback. The category is the same anti-pattern phase 1 retired for SectionDivider, but the shape is different (Button variant is a CSS class, not a CSS property). Worth its own audit doc before rewriting. **Not gating phase 2** — Dialog works today, just via the subscription pattern we now consider a smell.
- **Future components.** Any new component that needs per-variant structural variation (show/hide elements, mutually exclusive positions, etc.) follows the same playbook: encode as CSS vars + markup-always-rendered + `display: var(...)` in phase 1; add `PRUNE_FOR` markers when shipping. No invention required per component.

**Time:** Dialog audit + refactor ~1 day. Other components case by case.

---

## Sequence and dependencies

```
Phase 1 (CSS-var refactor)
   ├─ Settles 5 decisions
   ├─ ~1 day
   └─ SHIPS: bug fixed, editor-to-live sync works, hidden elements in DOM
              │
              ▼
Phase 2 (Build-time pruning)
   ├─ Settles 4 decisions
   ├─ First hour: 2 verification spikes
   ├─ ~1.5 days
   └─ SHIPS: clean prod DOM, pattern reusable
              │
              ▼
Phase 3 (Dialog audit, future components)
   └─ Optional, applied per-need
```

**Hard dependencies:**
- Phase 2 depends on phase 1's CSS-var encoding (the prod-config keys it reads are written by phase 1's mutators).
- Phase 3 depends on phase 2 having proven the pattern. Until then Dialog stays on its current subscription path.

**Soft pause points:**
- After phase 1: the user-visible problem is solved. Pausing here leaves `display: none` ghosts in the DOM but doesn't break anything.
- After phase 2: the package's promises are delivered. Pausing here leaves Dialog on its legacy subscription path, but that path works and is well-isolated.

---

## Total time

| Estimate | Optimistic | Realistic | If both spikes fail |
|---|---|---|---|
| Phase 1 | 6 hrs | 1 day | 1 day |
| Phase 2 | 1 day | 1.5 days | 3 days |
| **Total** | **~1.5 days** | **~2.5 days** | **~4 days** |

I'd budget **3 days** to be honest. That covers both phases at realistic pace, plus a half-day buffer for the kind of incidental fixes that surface when you actually edit live code (a migration that needs an extra case, a CSS specificity surprise, etc.).

The two verification spikes at the start of phase 2 are the biggest uncertainty. If either fails, phase 2 grows by ~1.5 days. Worth running those spikes early in phase 1 if you want to surface that risk sooner — it costs an hour and resolves the time variance.

---

## What this is *not* doing

A few clarifications, since the conversation surfaced them:

- **Not** building a full custom Svelte preprocessor. We lean on `svelte-preprocess`'s `replace` option.
- **Not** generating per-variant component files (`SectionDividerLg.svelte` etc.). One file, env-gated branches, prod-resolved guards.
- **Not** auto-detecting variant usage at consumer call sites. The component carries all variants; the prod build prunes per *variant value* at compile time, but the wrapper still branches at runtime if the consumer passes a dynamic variant.
- **Not** retrofitting other components in phase 1 or 2. Phase 3 is where the pattern spreads, and only if other components actually need it.
- **Not** changing the consumer-facing API. `<SectionDivider variant="lg" title="..." description="..." />` keeps working unchanged through every phase.
