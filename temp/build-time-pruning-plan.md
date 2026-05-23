# Build-time pruning — implementation plan

Sister doc to `sectiondivider-intrinsics-via-css.md`. That doc handles **how intrinsics are encoded** (CSS vars on `:root`, with `display: var(...)` hiding unused elements). This doc handles **what the shipped artifact looks like** — specifically, the package's "ships clean" promise.

Status: scoped, not yet implemented. Sequence is: CSS-var refactor lands first (hidden elements accepted in dev DOM). This pruning step lands second and removes the hidden elements from production builds.

---

## 1. The approach (revised after research)

Originally I scoped a from-scratch Svelte preprocessor (~3 days). Two pieces of existing infrastructure collapse most of that work:

1. **`svelte-preprocess` ships a `replace` preprocessor** that takes `[RegExp, ReplaceFn | string]` tuples and applies them to component markup. Documented at `sveltejs/svelte-preprocess/docs/preprocessing.md`. Already in our pipeline via `svelte.config.js:5` — `sveltePreprocess()` is called, we just need to pass it a `replace` option.

2. **Vite constant-folds `import.meta.env.DEV` at production build**, including inside Svelte `{#if}` *markup* blocks. So the dev-vs-prod split is free — we don't engineer it.

The combined shape:

```svelte
{#if import.meta.env.DEV}
  <!-- Dev branch: render everything, CSS-driven hiding via display: var(...). -->
  <span class="divider-eyebrow">{eyebrow}</span>
  <span class="sd-hairline sd-hairline--above-label" aria-hidden="true"></span>
  ...
{:else}
  <!--PRUNE_FOR sectiondivider eyebrow-display != none-->
  <span class="divider-eyebrow">{eyebrow}</span>
  <!--END_PRUNE-->

  <!--PRUNE_FOR sectiondivider hairline == above-label-->
  <span class="sd-hairline sd-hairline--above-label" aria-hidden="true"></span>
  <!--END_PRUNE-->
  ...
{/if}
```

What we write: a regex + replacement function passed to `svelte-preprocess`. The function parses each `PRUNE_FOR…END_PRUNE` block, looks up the production config, computes which variants keep the block, and emits `{#if variant === 'lg' || variant === 'sm'}…{/if}`.

In dev: `import.meta.env.DEV` is true, dev branch runs, all markup renders, CSS hides what the variant has set to `display: none`. Editor edits flow live.

In prod: `import.meta.env.DEV` constant-folds to `false`, the dev branch is dead code and gets stripped, the else branch runs with variant-statically-resolved guards around each previously-marked block. Variants that hide a block never carry its markup; the bundle is clean.

---

## 2. Marker convention

```
<!--PRUNE_FOR <component> <key> <op> <value>-->
  ...markup...
<!--END_PRUNE-->
```

Operators: `==`, `!=`, `in [a, b, c]`.

Examples:

```svelte
<!--PRUNE_FOR sectiondivider eyebrow-display != none-->
<span class="divider-eyebrow">{eyebrow}</span>
<!--END_PRUNE-->

<!--PRUNE_FOR sectiondivider hairline == above-label-->
<span class="sd-hairline sd-hairline--above-label"></span>
<!--END_PRUNE-->
```

The replacement function reads `<component>`'s production config, evaluates the predicate per variant, and:
- All variants pass → no guard needed, emit markup raw.
- No variants pass → emit empty string (block doesn't exist in prod).
- Mixed → emit `{#if variant === 'X' || variant === 'Y'}…{/if}`.

Assumption: the variant prop in scope is named `variant`. Reasonable for our codebase; can be made configurable via a marker argument later if needed.

---

## 3. What we actually build

### 3.1 Verification spikes (first hour)

Before committing to the approach, two things need a 10-line test each:

1. **Does `{#if import.meta.env.DEV}` actually strip in production Svelte markup?** Vite docs say yes for JS; need to confirm inside `.svelte` template blocks. Write a one-component test, run `vite build`, grep the output for the dev-branch markup string. If present → fallback to a custom preprocessor that emits the env-gate JS pattern instead.

2. **Does `svelte-preprocess`'s `replace` match all occurrences or only the first?** Issue #477 reported only-first behavior years ago. If the bug persists, we either use a global flag on the regex (which the implementation may or may not honor) or split into multiple regex entries. Workable either way; just need to know which.

Both verifications cost an hour combined and de-risk the rest of the work.

### 3.2 Prod-config loader

A Node-side helper that, given a component name, reads the production config from disk. Lives at `src/build/loadProductionConfig.ts` (or similar). The editor already writes per-component JSON to `component-configs/<component>/<file>.json` with a manifest pointing to the active production file (`componentConfigService.ts:44`). The loader mirrors that read path with `fs` instead of `fetch`.

Cached in-memory across the build. If a marker references a component whose config is missing, log a warning and emit the markup unguarded (safe fallback — never less than dev).

### 3.3 Replacement function

A pure function: `(match, args, block) => string`. Parses the marker arguments, calls the prod-config loader, computes variant set, builds the guard. ~80–120 lines including arg parsing.

### 3.4 Wiring

Update `svelte.config.js`:

```js
import { sveltePreprocess } from 'svelte-preprocess';
import { buildPruneReplace } from './src/build/pruneReplace.ts';

export default {
  preprocess: sveltePreprocess({
    replace: buildPruneReplace(),
  }),
  // ...
};
```

`buildPruneReplace()` returns the `[RegExp, ReplaceFn][]` array.

### 3.5 SectionDivider retrofit

After the preprocessor works against a toy component, retrofit SectionDivider per the audit doc — markers on each element controlled by an intrinsic.

---

## 4. Time

| Phase | Work | Time |
|---|---|---|
| 0 | Two verification spikes (DEV folding + replace match-all) | 1 hr |
| 1 | Marker syntax + arg parser | 1 hr |
| 2 | Replacement function — guard generation, operator dispatch | 3–4 hrs |
| 3 | Prod-config loader (Node fs reads) | 2–3 hrs |
| 4 | Wire into `svelte.config.js`, smoke-test against a toy component | 30 min |
| 5 | SectionDivider retrofit + visual verification dev + prod | 2–3 hrs |
| 6 | Unit tests with mock prod configs | 2–3 hrs |
| 7 | Docs — marker reference, dev-vs-prod note | 1 hr |

**Total: 12–16 hours. About 1.5 days. Up to 2 if a spike fails and we pivot.**

If verification spike #1 fails (DEV not folded in markup), we drop back to the fuller plan (next section). Add ~1.5 days.

If verification spike #2 fails (replace only matches first), we work around it with a global flag or multi-pattern array. Add ~30 min.

---

## 5. Fallback — from-scratch preprocessor

Kept here as the plan-B if either spike fails badly. Same architecture (markers above blocks, prod config drives the guard), but we author a Svelte preprocessor object directly instead of leaning on `svelte-preprocess`'s `replace`. Adds ~1.5 days for the preprocessor scaffolding, source maps, and explicit dev/prod handling.

---

## 6. Risks / open questions

1. **Source maps.** The string-substitution approach changes line counts. Stack traces from the dev branch are unaffected (it's unchanged). The prod branch line numbers will drift but it's prod — debugger experience there matters less. Accept and revisit if it bites.

2. **Marker drift.** If someone changes a CSS-var key in the editor but forgets to update the marker, the replacement function finds no matches in prod config. **Strict mode is on by default** (decision 3 in section 7): unknown key throws at build time with file, line, and bad key. Loud failure beats silent regression.

3. **Consumer-side use.** If a microsite using `live-tokens` wants to author its own components with markers, the preprocessor function needs to be exported. Cheap to add later; not in MVP scope.

4. **Single block per marker.** The `PRUNE_FOR…END_PRUNE` form supports multi-line markup natively, so this isn't a limitation. The previous "single block" constraint disappears.

5. **HMR.** Dev path always runs the dev branch via `import.meta.env.DEV`, so editor edits to intrinsics flow through CSS vars regardless of prod config. No invalidation needed.

---

## 7. Decisions settled

1. **MVP scope:** SectionDivider only. Dialog stays on its current `editorState` subscription and gets its own audit in phase 3.
2. **Marker name:** `PRUNE_FOR` / `END_PRUNE`. Functional, accurate to the build-time action.
3. **Strict mode:** always on. Unknown config key in a marker → build error with file, line, and bad key. No opt-in flag; loud failure is the default.
4. **Variant prop name:** hard-coded to `variant`. Every component in the registry uses that name already; configurability deferred until a real need surfaces.

This is a 1.5-day piece of work.
