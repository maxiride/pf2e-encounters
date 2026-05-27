---
name: live-tokens-pick-component
description: Recommend which shipped @motion-proto/live-tokens component fits a UX need, with decision trees for the confusable pairs (SegmentedControl vs TabBar vs RadioButton vs MenuSelect; Card vs CollapsibleSection vs Dialog; Callout vs Notification vs Tooltip; Badge vs CornerBadge; Toggle vs SegmentedControl vs RadioButton). Use when the user asks which / what component to use, should I use X or Y, what is the difference between two components, how do I show / let the user / capture / display some UX outcome, or starts to author a custom component before checking the catalogue. Read this before reaching for live-tokens-create-component. Not for actually placing the chosen component on a page (see live-tokens-build-page).
---

# Picking the right live-tokens component

This skill helps you choose between shipped components when several could plausibly fit. The catalogue is small; the hard part is semantic intent. A `RadioButton` set and a `SegmentedControl` can render identical-looking UIs but communicate different things.

For composing a page once you've picked components, see [[live-tokens-build-page]]. For authoring a brand-new component when nothing fits, see [[live-tokens-create-component]] (but read this skill first to confirm nothing in the catalogue fits).

## Catalogue

Action: `Button`. Input: `Input`. Selection: `SegmentedControl`, `TabBar`, `RadioButton`, `MenuSelect`, `Toggle`. Containers: `Card`, `CollapsibleSection`, `Dialog`. Messaging: `Callout`, `Notification`, `Tooltip`, `Badge`, `CornerBadge`. Display: `Table`, `Image`, `ImageLightbox`, `ProgressBar`, `SectionDivider`, `SideNavigation`, `CodeSnippet`.

`CodeSnippet` is for a single-line command or value the user is meant to copy and paste back into a terminal (install commands, generated keys, ids). Click-to-copy with a brief "Copied" popover. Use it whenever your page asks the reader to *run* something, rather than just *read* it.

## Single-selection family: SegmentedControl vs TabBar vs RadioButton vs MenuSelect

All four pick one option from a set. The right one depends on **option count**, **whether the selection changes what's rendered below**, and **how much visual weight** you want.

| Component         | Best for                                                                | Visual weight    | Option count |
|-------------------|-------------------------------------------------------------------------|------------------|--------------|
| `SegmentedControl`| Inline switch between alternative *views of the same data*              | Compact pill     | 2–4          |
| `TabBar`          | Switching between *tab panels* (content area swaps below)               | Page-section     | 2–7          |
| `RadioButton`     | Form-style selection where the user reviews all options as text         | Form-row         | Any          |
| `MenuSelect`      | Hide the option set behind a dropdown to save vertical/horizontal space | Compact dropdown | Any          |

- `TabBar` implies "this changes the page"; `SegmentedControl` implies "this is one knob among others."
- Use `RadioButton` when labels deserve room to breathe and the user is committing to a larger form.
- Use `MenuSelect` when options would overflow horizontally or there are too many to display at once.
- **Don't pick `SegmentedControl` when option labels are long enough to wrap.** It loses its compactness; use `RadioButton` rows instead.

## Container family: Card vs CollapsibleSection vs Dialog

| Component             | Modality            | Use for                                                     |
|-----------------------|---------------------|-------------------------------------------------------------|
| `Card`                | Inline, always open | Default container for grouped content                       |
| `CollapsibleSection`  | Inline, toggleable  | Progressive disclosure inside a longer page                 |
| `Dialog`              | Modal, blocks page  | Confirmations, focused tasks the page can't continue around |

- Default to `Card`. It's the workhorse.
- Reach for `CollapsibleSection` only when the content is *legitimately secondary* (advanced users open it; most skip). Don't use collapse as a styling choice when the content matters.
- **Don't use `Dialog` for routine forms.** Reach for it only when the page cannot meaningfully continue until the user decides (destructive confirmations, payment, sign-in). Routine forms go inline in a `Card`.

## Messaging family: Callout vs Notification vs Tooltip vs Badge

| Component       | Scope          | Triggered by    | Dismissable | Use for                                              |
|-----------------|----------------|-----------------|-------------|------------------------------------------------------|
| `Callout`       | Section-inline | Always present  | No          | "Heads up about this section"                        |
| `Notification`  | System-level   | Event / save    | Yes         | "Your changes were saved"                            |
| `Tooltip`       | Element-inline | Hover / focus   | Auto        | Definition or hint anchored to an element            |
| `Badge`         | Element-inline | Always present  | No          | Status pill ("Beta", "New", "v2")                    |
| `CornerBadge`   | Element-corner | Always present  | No          | Position-anchored marker (count, status dot)         |

- `Callout` is *content*. Part of the section, written into the markup, says something important about what surrounds it. Variants (`info`, `success`, `warning`, `danger`) set the tone.
- `Notification` is *feedback*. Appears in response to an action, then dismisses. **Don't use `Notification` for static content;** persistent messages belong in a `Callout`.
- `Tooltip` is for *what an element means*. **Don't use `Tooltip` as the primary location of important content;** it auto-dismisses and isn't accessible for must-read content.
- `Badge` and `CornerBadge` differ only in positioning. `CornerBadge` lives at a `top-right` / `bottom-left` anchor on a parent (notification counts, "NEW" stickers).

## Toggle vs SegmentedControl vs RadioButton (for on/off)

All three can express a binary choice. The right one depends on what the choice *is*.

| Component          | Best for                                                                                                              |
|--------------------|-----------------------------------------------------------------------------------------------------------------------|
| `Toggle`           | A *setting* that's either on or off (notifications on/off, dark mode). The label names the setting; the switch shows the state. |
| `SegmentedControl` | A *choice between two named alternatives* (Light / Dark, List / Grid). Both labels are visible at once.                |
| `RadioButton` pair | A *form-style choice* where the user reviews both labels before committing (Yes / No questions, opt-in selections).    |

- If the off and on states share a name (the feature itself), it's `Toggle`. "Email notifications" has no "off" label because the switch position is the state.
- If the two states have different names you want users to compare, it's `SegmentedControl`.
- `Toggle` flips immediately; `RadioButton` pair is for forms where the choice is part of a larger submission.

---

If nothing in the catalogue fits (a `Slider`, a `DatePicker`, a `Stepper`, a custom widget), author it via [[live-tokens-create-component]]. **Don't reach for a custom component before checking the catalogue;** a custom component is a maintenance commitment.
