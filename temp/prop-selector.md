 Property selectors: intended functionality & gaps                                                                                                                                                                                                
                                                                             
  Based on the SegmentedControl implementation, here's how the system works today, where it's brittle or unclear, and what I'd change.                                                                                                             
                                                                                                                                                                                                                                                   
  ---                                                                                                                                                                                                                                              
  1. The mental model                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                   
  A component (e.g. segmentedcontrol) owns a set of CSS custom properties split into <prefix>-<variant>-<property>. The prefix is derived in `componentVarPrefix` via a `VAR_PREFIX_OVERRIDES` map (`segmentedcontrol` → `segment`, `collapsiblesection` → `collapsible`, etc.), so the on-disk token names are abbreviated (`--segment-*`, not `--segmentedcontrol-*`). Examples from the live config:

  - --segment-bar-border-width → variant = bar-border, property = width
  - --segment-selected-border-width → variant = selected-border, property = width
  - --segment-option-text-font-weight → variant = option-text-font, property = weight

  Siblings are discovered by matching prefix + -<property> suffix (parseComponentVar in editorStore.ts:712 — splits on the last dash). Two tokens are siblings iff they end in the same last dash segment. This is a purely name-derived relationship — there is no explicit `groupKey` in the data.

  Note: one incident of this parser silently grouping unrelated tokens has already been patched by renaming the divider token. The old `--segment-divider-width` collided with `--segment-bar-border-width` / `--segment-selected-border-width` on the `-width` suffix; it is now `--segment-divider-thickness` (suffix `-thickness`, zero siblings — correctly solo). The analogous `--segment-divider-height` is solo on `-height`. The underlying parser fragility remains — any future token ending in `-width` will auto-join the border-width sibling set whether that was intended or not.                                                                   
                                                                                                                                                                                                                                                   
  Each token can be in one of four states:                                                                                                                                                                                                         
                                         
  ┌────────────────────────────────────────────────────────────┬───────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐   
  │                           State                            │               When                │                                                               Visual today                                                                │
  ├────────────────────────────────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ Solo — no siblings                                         │ siblings.length < 2               │ No lock icon (recent fix), value fully editable                                                                                           │
  ├────────────────────────────────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Unlinkable — canBeShared: false                            │ Declared independent              │ No lock icon, fully editable                                                                                                              │   
  ├────────────────────────────────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ Linked — all siblings agree, not in unlinked[]             │ isComponentPropertyShared ===     │ Locked icon, left accent border, shown once in the shared block; mirrored tokens in per-variant fieldsets are dimmed (opacity: 0.4) and   │   
  │                                                            │ true                              │ non-interactive                                                                                                                           │   
  ├────────────────────────────────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Linkable — canBeShared: true, ≥2 siblings, not currently   │ Open lock                         │ Open lock icon; editing writes only this token                                                                                            │   
  │ linked                                                     │                                   │                                                                                                                                           │   
  └────────────────────────────────────────────────────────────┴───────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                                                                                                                                                                                   
  The shared block at the top collapses each linked group into one representative row, with context labels listing the variants it fans out to.                                                                                                    
                                         
  ---
  1a. What has changed since this audit was first written

  - **Divider tokens renamed** (`-width` → `-thickness`, `-height` retained). Closes the concrete false-grouping bug the audit implicitly flagged in gap E; the parser itself is unchanged.
  - **Component editor restructured** into `src/component-editor/` with `scaffolding/` shared pieces (`TokenLayout`, `FieldsetWrapper`, `ComponentEditorBase`, `ComponentFileManager`). Selectors moved under `src/ui/` with a `UI*` prefix. All line references in this audit are against the current layout.
  - **Component-prefix unabbreviation landed (2026-04-24):** `VAR_PREFIX_OVERRIDES` deleted; `componentVarPrefix` uses the component ID directly. Tokens now `--segmentedcontrol-*`, `--collapsiblesection-*`, `--progressbar-*`, `--sectiondivider-*`, `--radiobutton-*`, `--inlineeditactions-*`, `--detailnav-*`. `-bg` → `-surface` applied to progressbar tracks and inlineeditactions save/cancel slots (state reordered to `-hover-surface`). `migrateComponentAliases` handles legacy configs. Conventions captured in `src/styles/CONVENTIONS.md`.
  - **Explicit `groupKey` landed (2026-04-27):** ✅ `parseComponentVar` last-dash inference replaced with a per-component schema. Editors call `registerComponentSchema(component, tokens)` at module load; `getGroupKey` consults the schema and falls back to last-dash matching for unmigrated editors. SegmentedControl declares groupKeys (`border-width`, `radius`, `font-weight`, `font-family`, `divider-thickness`, `divider-height`). `unlinked[]` now stores groupKey strings.
  - **Re-link confirmation popover landed (2026-04-27):** ✅ `UIRelinkConfirmPopover` opens when sibling values disagree on re-link; shows distinct alias options + sources, Confirm/Cancel; silent link path retained when siblings already agree. Closes gap A.
  - **Click-to-scroll on dimmed mirror rows landed (2026-04-27):** ✅ Variant-fieldset dimmed rows now show a tooltip and scroll/flash the matching shared anchor on click. Closes gap B / P2.
  - **Zone divider landed (2026-04-27):** ✅ Dashed 1px column rule between linked and independent kinds in TokenLayout. Closes gap C / P3.
  - **Still pending** (tracked in `temp/theme-token-improvements.md` and `temp/primary-to-brand-rename.md`):
    - Theme-layer prereqs: font-size rename, `--btn-*` eviction, bare-word orphan cleanup, full `bg` → `canvas` sweep, font-weight normalization, primary → brand.
  - Gaps D, E, F, G, H, I, J below are all still present in code (A/B/C are now closed).

  ---
  2. How editing flows today
                                         
  From the shared block (UITokenSelector.writeOverride:45):
  - Writing propagates via setComponentAliasShared → overwrites every sibling's alias.                                                                                                                                                             
  - Clicking the lock when linked → unlinkComponentProperty → adds property to slice.unlinked[]; aliases preserved so each sibling keeps its last value and siblings become independently editable.                                                
                                                                                                                                                                                                                                                   
  From a per-variant fieldset:                                                                                                                                                                                                                     
  - If the token is currently shared, the row is disabled: true via withSharedDisabled (SegmentedControlEditor.svelte:144) — click does nothing; you must go to the shared block to edit.                                                          
  - If independent, writes use setComponentAlias on that one variable only.                                                                                                                                                                        
                                                                                                                                                                                                                                                   
  Re-linking (unlinked → linked): click the open lock on any sibling → setComponentAliasShared broadcasts that token's current value to all siblings and clears the unlinked[] flag.                                                               
                                                                                                                                                                                                                                                   
  ---                                                                                                                                                                                                                                              
  3. Gaps I found                                                                                                                                                                                                                                  
                                         
  A. Re-linking silently overwrites — ✅ CLOSED (2026-04-27)

  `UITokenSelector.toggleShared` now opens `UIRelinkConfirmPopover` when sibling values disagree; the popover shows distinct alias options + sources with Confirm/Cancel. The silent path is preserved when siblings already agree.

  B. The "dimmed token in variant fieldset" is mute — ✅ CLOSED (2026-04-27)

  Variant-fieldset dimmed rows now show a `title` tooltip ("Linked across N variants — edit in shared block") and clicking jumps to the shared-block anchor with a brief flash highlight. Keyboard accessible.

  C. No visual boundary between linked and independent columns — ✅ CLOSED (2026-04-27)

  TokenLayout now reserves a 0-width divider column at the boundary; CSS draws a dashed 1px rule. Renders only when both zones have content.
                         
  D. Shareable-but-solo is a dead concept

  `canBeShared: true` on a token with no siblings — `--segment-option-text-font-family` is the live example; font-family exists only on the default option, not on hover/disabled/selected — means the lock toggle is hidden (UITokenSelector.svelte:42 gates `showLinkToggle` on `hasSiblings`). The developer-declared intent ("this property ought to link") has no user-facing surface. There's no UI for a user to say "add a sibling variable for this in hover/disabled/selected states."
                                                                                                                                                                                                                                                   
  E. Partial / divergent state has no visual

  `isComponentPropertyShared` (editorStore.ts:740) returns false in three distinct situations: (1) the property is in `slice.unlinked[]`, (2) siblings have different aliases, (3) at least one sibling alias is missing. The UI collapses all three to a single "open lock / linkable" presentation. A user can't tell "these are diverged accidentally" from "these are intentionally unlinked."
                                                                                                                                                                                                                                                   
  F. Context labels are read-only
                                         
  "default option / disabled option / selected option" in the shared block is useful orientation, but clicking a label doesn't scroll or highlight the referenced fieldset. The hover highlight (dashed outline on all siblings) is the only       
  cross-navigation cue.
                                                                                                                                                                                                                                                   
  G. State dropdown hides variants                                                                                                                                                                                                                 
                                         
  The state selector (default/hover/disabled) collapses three fieldsets into one. If I'm working on font-weight sharing and the hover state is offscreen in a different dropdown, I lose track of what's linked to what. The shared block shows    
  "disabled option" in a context label but I can't see the actual disabled fieldset without switching the dropdown.
                                                                                                                                                                                                                                                   
  H. Reset semantics vary by origin                                                                                                                                                                                                                
                                         
  UIPaletteSelector (and the other selectors) have a "reset to default" button in the dropdown header. Its effect depends on where you triggered it — resetting a shared token from the shared block resets all siblings via the shared write path;
   resetting from a variant fieldset is blocked (dimmed). That coupling isn't documented in the UI.
                                                                                                                                                                                                                                                   
  I. The lock on canBeShared tokens with only 1 sibling was a source of confusion                                                                                                                                                                  
                                         
  Until my recent fix, font-family in default option showed a non-functional lock. The fix hides it, but the declaration canBeShared: true is now a silent no-op. Either the declaration should be warned/removed, or it should bootstrap siblings 
  on first link-click.   
                                                                                                                                                                                                                                                   
  J. No property-level affordance for rename / add / remove

  `barTokens`, `dividerTokens`, `optionStates`, `selectedTokens`, and `shareableContexts` are all hard-coded in SegmentedControlEditor.svelte:26-80. A user can't add a new shareable property, remove one, or rename the label. The editor pattern works well as a reference impl but would need a data-driven layer (the `groupKey` + schema-file approach proposed in memory) to scale to "assigning properties to tokens" beyond the hard-coded set.
                                                                                                                                                                                                                                                   
  ---                    
  4. UX improvements, prioritized        
                                 
  P1 — Link semantics must be explicit
                                                                                                                                                                                                                                                   
  Confirm before broadcast on re-link. When clicking an open lock, open a mini-popover:                                                                                                                                                            
                                                                                                                                                                                                                                                   
  Link this property across 3 variants?                                                                                                                                                                                                            
    ○ Use this value (Bold)     — overwrites 2 siblings                                                                                                                                                                                            
    ○ Use default option's      (Semibold) — overwrites 2                                                                                                                                                                                          
    ○ Use selected option's     (Bold)     — overwrites 2                                                                                                                                                                                          
    [Cancel]  [Link]                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                   
  If all siblings agree, skip the popover (silent link). This eliminates gap A and E — the popover also naturally surfaces divergence.                                                                                                             
                                                                                                                                                                                                                                                   
  P2 — Make the dimmed variant-fieldset rows legible                                                                                                                                                                                               
                                         
  Add:                                                                                                                                                                                                                                             
  - Tooltip on hover: "Linked across control bar, selected option. Edit in shared block."
  - Click a dimmed row → scroll the shared block into view and focus (with a brief flash highlight) the linked row up top.                                                                                                                         
  - A small → shared chip in the label row, not a styled-disabled dropdown.                                               
                                                                                                                                                                                                                                                   
  This reframes "disabled" as "mirror" — closer to how Figma's linked-variant properties behave.                                                                                                                                                   
                                                                                                                                                                                                                                                   
  P3 — Visible zone split                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                   
  In TokenLayout, put a 1px subtle dashed column between linked columns and independent columns. Legend them: small muted caption above the fieldset — "linked ——— independent" — only when both zones have content.                               
                                         
  P4 — Context-label as link                                                                                                                                                                                                                       
                         
  In the shared block, make each context pill a real button: [control bar] → scrolls and flashes the control-bar fieldset. Makes the hover highlight's purpose discoverable.                                                                       
   
  P5 — Divergence indicator                                                                                                                                                                                                                        
                         
  Add a fourth visual state for shareable properties whose siblings disagree but aren't flagged unlinked:                                                                                                                                          
  - Striped accent border on the trigger (instead of solid)
  - Warning icon in place of the lock: ! — hover: "3 variants have 2 different values — click to link or unlink"                                                                                                                                   
  - In the shared block, show — as the value or a mini list of the distinct values.                             
                                                                                                                                                                                                                                                   
  P6 — Surface cross-state editing                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                   
  When editing a shared token whose siblings span multiple option states (default/hover/disabled), the state dropdown should temporarily pin "all states affected" so the user understands scope. Alternatively, during the edit session, show the 
  non-visible states as collapsed sibling rows below the current one.                                                                                                                                                                              
                                                                                                                                                                                                                                                   
  P7 — Lift tokens out of component code

  Longer-term: the token lists in SegmentedControlEditor.svelte (barTokens, dividerTokens, optionStates, selectedTokens, shareableContexts) should become data driven — a component-schema.json declaring variants, properties, and which properties are shareable, with an explicit `groupKey` that formalizes sibling relationships instead of relying on last-dash suffix parsing. Then the editor is a single schema-driven component, and renaming/adding/removing properties is a matter of editing the schema, not the editor. This is the refactor target captured in the memory worksheet.
                                                                                                                                                                                                                                                   
  P8 — Clarify "Active config matches production"                                                                                                                                                                                                  
                                         
  When Unsaved changes is displayed, the "Active config matches production" label is misleading. It's comparing "what's loaded in memory vs what's on disk" but a user reads "production = ground truth, so I'm clean." Suggest: replace with a    
  timestamp — "Loaded from default.json at 14:26" — and only show "matches production" when both dirty flags are clean.
                                                                                                                                                                                                                                                   
  ---                    
  5. Shortest path to the biggest UX lift — ✅ landed 2026-04-27

  P1 (explicit re-link), P2 (dimmed-row tooltip + click-to-scroll), and P3 (zone dividers) all shipped, alongside the `groupKey` refactor that replaces fragile last-dash sibling parsing. The SegmentedControl editor is now production-ready as the reference pattern for migrating other components.