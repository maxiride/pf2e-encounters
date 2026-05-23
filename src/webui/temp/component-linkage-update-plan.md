# Component linkage update — execution plan

This plan finishes the component-linkage cleanup. Most schema-level work was already applied in a prior session; this plan **verifies the applied changes are in place**, **fixes any drift**, **updates the audit HTML** to reflect the final state, and **runs tests** to confirm nothing broke.

A fresh Claude can execute this end-to-end without prior context. Working directory: `/Users/mark/Documents/repos/runegoblin/live-tokens`. Read this file first, then proceed.

---

## 1. Reference rules (canonical)

1. **Link shape props** (border-width, radius, padding, similar geometry) across all variant×state cells where they exist.
2. **Link typography props** (font-family, font-size, font-weight, line-height) across whatever axis varies.
3. **Don't link colors** — surface, border, text, fill. They're meant to vary.
4. **Wrap text color + typography** in a `TypeGroupConfig` so they read as one fieldset in the editor UI.
5. **GroupKey naming convention:**
   - Drop component-level prefixes (e.g. no `card-`, no `tab-`).
   - Drop part-level prefixes when only one part exists (e.g. no `label-` in Collapsible Section, no `dot-` or `label-` in Radio Button).
   - Keep part-level prefixes when multiple parts coexist within a component (e.g. `title-` vs `body-` in Card; `label-` vs `value-` in Progress Bar; `title-` vs `text-` in Notification).

## 2. Decisions confirmed (do not re-litigate)

| Decision | Outcome |
|---|---|
| Inline Edit Actions save/cancel shape | **Keep split** — separate `save-*` and `cancel-*` groupKeys (cancel allowed to differ from save) |
| Segmented Control radius pair (`bar-radius` + `selected-radius`) | **Keep distinct, unlinked** — bar wraps everything; selected pill is a different element |
| Tab Bar `--tabbar-bar-radius` | **Single unlinked token** — already exposed in the schema under the bar group |
| Section Divider linkage wiring | **Skip** — leave with no linkage |

## 3. Per-component target state (linked groups only — colors stay unlinked)

| Component | Linked groupKeys | Notes |
|---|---|---|
| Button | `border-width` (18), `radius` (18), `padding` (18), `font-family` (6), `font-size` (6), `font-weight` (6), `line-height` (6) | Reference shape; typography per-variant only |
| Card | `border-width` (2), `radius` (2), `header-padding` (2), `body-padding` (2), `shadow` (2), `blur` (2), `title-font-family` (2), `title-font-size` (2), `title-font-weight` (2), `title-line-height` (2), `body-font-family` (2), `body-font-size` (2), `body-font-weight` (2), `body-line-height` (2) | Two parts (title/body), two states (default/hover) |
| Collapsible Section | `border-width` (3), `radius` (3), `padding` (3), `icon-size` (3), `font-family` (3), `font-size` (3), `font-weight` (3), `line-height` (3) | One part — bare typography names |
| Dialog | (none) | Structural parts; no linkage warranted |
| Image | (none) | Single state |
| Inline Edit Actions | `save-border-width` (2), `save-radius` (2), `save-padding` (2), `save-icon-size` (2), `cancel-border-width` (2), `cancel-radius` (2), `cancel-padding` (2), `cancel-icon-size` (2) | Save and cancel intentionally separate |
| Notification | `border-width` (4), `radius` (4), `padding` (4), `icon-size` (4), `title-font-family` (4), `title-font-size` (4), `title-font-weight` (4), `title-line-height` (4), `text-font-family` (4), `text-font-size` (4), `text-font-weight` (4), `text-line-height` (4) | Two typography parts (title/text), four variants |
| Progress Bar | `track-border-width` (5), `radius` (5), `track-height` (5), `label-font-family` (5), `label-font-size` (5), `label-font-weight` (5), `label-line-height` (5), `value-font-family` (5), `value-font-size` (5), `value-font-weight` (5), `value-line-height` (5) | Track is a part within shape; label/value are typography parts |
| Radio Button | `border-width` (3), `font-family` (3), `font-size` (3), `font-weight` (3), `line-height` (3) | One part each — bare names. Dot border color and dot fill stay unlinked |
| Section Divider | (none) | Skipped per decision |
| Segmented Control | `font-family` (4), `font-size` (4), `font-weight` (4), `line-height` (4) | Per-state typography across option states |
| Tab Bar | `border-width` (3), `padding` (3), `icon-size` (3), `font-family` (3), `font-size` (3), `font-weight` (3), `line-height` (3) | One part — bare names. `--tabbar-bar-radius` exposed unlinked at bar level |
| Tooltip | (none) | Single instance |
| Trait Badge | `border-width` (3), `radius` (3), `padding` (3), `shadow` (3), `font-family` (3), `font-size` (3), `font-weight` (3), `line-height` (3) | Three variants, no states — all bare |

## 4. Known-applied changes (verify these stuck)

These edits should already be present in the working tree (uncommitted). The plan's first job is verifying them.

- **`RadioButtonEditor.svelte`** — `canBeLinked`/`groupKey` removed from `dot-border-color` and `dot-fill` tokens (3 states each). `linkableContexts` no longer references those vars.
- **`SegmentedControlEditor.svelte`** — `canBeLinked`/`groupKey` removed from 5 single-token entries: `divider-thickness`, `divider-height`, `bar-radius`, selected-option `border-width`, `selected-radius`. `linkableContexts` simplified to typography only.
- **`CardEditor.svelte`** — 14 groupKey renames dropping the `card-` prefix.
- **`CollapsibleSectionEditor.svelte`** — 4 typography groupKey renames dropping the `label-` prefix.
- **`RadioButtonEditor.svelte`** (round 2) — 5 groupKey renames dropping `dot-` and `label-` prefixes.
- **`TabBarEditor.svelte`** — 7 groupKey renames dropping the `tab-` prefix.

## 5. Execution

### Phase 1 — parallel verification (3 agents in one message)

Spawn three Explore-style agents simultaneously and wait for all three before proceeding to Phase 2. Each agent must report concisely (under 300 words).

#### Agent A — editor schema audit
**Prompt:** "Read every `src/component-editor/*Editor.svelte` file (14 total). For each, extract every Token entry with `canBeLinked: true` and report `(groupKey, variable, label)`. Compare against the target state table in `temp/component-linkage-update-plan.md` section 3. Report:
1. Editors that match the target exactly.
2. Editors with discrepancies — list each as `<editor>: expected <X>, found <Y>`.

Don't make any code changes. Be concise."

#### Agent B — runtime CSS surface audit
**Prompt:** "Read every `src/components/*.svelte` file used by an editor (see `src/component-editor/registry.ts` for the mapping). For each, extract the `--<component>-*` CSS custom property declarations from the `:global(:root)` block. Report:
1. Variables surfaced in the schema but NOT declared in the runtime CSS.
2. Variables declared in the runtime CSS but NOT surfaced in the schema (potential editor gaps).
3. Any per-state vars (e.g. `--card-hover-*`) that exist only on some properties — flag asymmetries that might matter.

The cross-reference is: each editor's `allTokens` exports the schema, each component's `<style>` block holds the runtime CSS. Don't make code changes. Be concise."

#### Agent C — test + typecheck runner
**Prompt:** "Run these two commands in the live-tokens repo and report results:
1. `npx svelte-check --tsconfig ./tsconfig.json` — capture error count and any errors NOT in the known-pre-existing set (DialogEditor's `CssVarRef` vs string type errors at lines around the confirm/cancel variant selectors).
2. `npx vitest run` — capture pass/fail counts and any failures NOT in the known-pre-existing set in `editorTokens.test.ts` (token-architecture issues with `--card-default-header-surface` resolving to literal `transparent`, `--card-default-blur` / `--card-hover-blur` / `--dialog-blur` resolving to non-layer-1 `--blur-none`, `--radiobutton-*-dot-size` resolving to non-layer-1 `--dot-size-*`, and segmentedcontrol `bar-padding-top/right/bottom/left` not declared in tokens.css).

Report new vs known failures separately. Don't try to fix anything yet. Be concise."

### Phase 2 — fix any drift found

For each discrepancy reported by Agent A, apply the targeted edit to bring the editor into compliance with section 3. These should be small `Edit` operations on `groupKey` strings.

For each gap reported by Agent B, surface in the final report. Don't add CSS vars or new schema tokens unless explicitly listed in section 3 (this plan doesn't authorize new feature work — only convergence on the agreed state).

For each new (non-pre-existing) failure from Agent C, investigate and fix. Pre-existing failures are out of scope for this plan.

### Phase 3 — update the audit HTML

Update `temp/component-linkage-audit.html` to reflect the final state:

1. Find the `data` JS object near the top of `<script>`.
2. For Card, Collapsible Section, Radio Button, Tab Bar: change `status` from `'pending'` to `'reviewed'` and `statusLabel` from "🔧 recommendation pending — ..." to a "✅ reviewed" variant; remove the trailing `changes:` block; update each `groups: { ... }` map's `groupKey` strings to the renamed ones from section 3.
3. For Tab Bar specifically: the matrix is missing the bar-level tokens. Insert bar tokens (`divider color`, `divider thickness`, `corner radius` (bar level), `padding` at the bar level) into the `props` array, with `members` extended to include a "bar" column, OR show them as a separate small matrix. Either is fine — pick whichever reads cleaner.
4. For Segmented Control and Radio Button (already had inline notes about the prior code-cleanup): leave as-is.
5. Update the "Open cross-cutting decisions" `<details>` block at the top to indicate all decisions are resolved (or remove it entirely and leave just a "all resolved" note).
6. Run a quick parse-check via `node -e "const html = require('fs').readFileSync('temp/component-linkage-audit.html','utf8'); const m = html.match(/<script>([\s\S]+?)<\/script>/); const stub = '...'; new Function(stub + m[1])()"` (use the stub pattern from this conversation's earlier validation, or just open the file in a browser to confirm it renders).

### Phase 4 — final verification

Re-run `npx svelte-check` and `npx vitest run` once more. Confirm no new errors vs the pre-existing set listed in Agent C's prompt above.

### Phase 5 — summary report

Output a final summary to the user covering:
- Count of editors verified vs. fixed.
- Confirmation that the audit HTML is updated.
- Test/typecheck status (pre-existing failures persist, no new failures).
- Files modified in this run.

## 6. Out of scope (don't do these without further authorization)

- Adding new CSS variables to runtime components (e.g. per-state typography on Button — was discussed and explicitly deferred).
- Wiring up linkage in Section Divider (decided against).
- Renaming any *variable* names (only groupKeys are being renamed in this pass).
- Touching `editorTokens.test.ts` or trying to fix the pre-existing token-architecture failures.
- Committing or pushing any changes.

## 7. Files this plan touches

Code (verify, fix if needed):
- `src/component-editor/CardEditor.svelte`
- `src/component-editor/CollapsibleSectionEditor.svelte`
- `src/component-editor/RadioButtonEditor.svelte`
- `src/component-editor/SegmentedControlEditor.svelte`
- `src/component-editor/TabBarEditor.svelte`

Documentation (update):
- `temp/component-linkage-audit.html`

Read-only references:
- `src/component-editor/registry.ts` (component → file mapping)
- `src/component-editor/scaffolding/types.ts` (Token type)
- `src/component-editor/scaffolding/linkedBlock.ts` (linkage engine)
- `src/components/*.svelte` (runtime CSS surfaces)
