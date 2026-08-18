---
name: PF2e Encounter Builder
description: Build and XP-balance Pathfinder 2e encounters against live GM Core math.
colors:
  oxblood: "#581911"
  aged-gold: "#e9c58e"
  negative: "#C10015"
  warning: "#F2C037"
typography:
  display:
    fontFamily: "becker-regular, sans-serif"
    fontSize: "x-large"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "'Noto Sans', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  pill: "10px"
  sm: "4px"
  full: "50%"
spacing:
  sm: "8px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.oxblood}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-negative:
    backgroundColor: "transparent"
    textColor: "{colors.negative}"
    rounded: "{rounded.full}"
    padding: "0"
  badge-outline:
    backgroundColor: "transparent"
    rounded: "{rounded.pill}"
    padding: "1px 7px"
---

# Design System: PF2e Encounter Builder

## Overview

**Creative North Star: "The GM's Ledger"**

A dense working tool wearing a thin tabletop skin. The chrome — header bar, display title, a
handful of accent touches — carries the fantasy framing: oxblood header, an aged-gold title set in
a custom display face. Everything below that line is a plain, flat, no-frills Quasar data surface:
bordered cards, outlined dense inputs, no-caps buttons, zero drop shadows. The system does not try
to look like a fantasy book throughout — it looks like a GM's plain ledger with a leather cover.

The interface exists to be scanned fast during prep, not admired. Density and legibility win over
decoration everywhere except the header title and the semantic color language (threat levels,
rarity, edition).

**Key Characteristics:**
- Two-color brand accent (oxblood + aged gold) confined almost entirely to the header; the working
  surface is neutral grey/white.
- Flat throughout — no shadows anywhere in the codebase; depth comes from borders and separators.
- Dense, outlined, no-caps form controls (Quasar `dense`/`outlined`/`unelevated` defaults).
- A recurring pill-shaped outline badge (`border-radius: 10px`, `border: 1px solid currentColor`)
  is the system's one signature component, reused for rarity, edition, and creature-type tags.

## Colors

Two brand colors, confined mostly to the header, plus Quasar's stock semantic colors used for real
state (never restyled from their defaults).

### Primary
- **Oxblood** (#581911): header background, in-content links (`creature-link`), the add-to-encounter
  icon button. The one saturated color visible outside the header.

### Secondary
- **Aged Gold** (#e9c58e): the header's display title only. Used nowhere else — its rarity is what
  makes the title read as a wordmark rather than a label.

### Neutral
- **Page background** (`bg-grey-1`, Quasar grey-1): the entire working surface behind the cards.
- **Border/separator grey** (Quasar `$separator-color`, `rgba(0,0,0,0.08–0.35)`): card borders,
  toggle borders, threat-bar track background and ticks.

### Semantic (state, not brand)
- **Negative** (#C10015, Quasar default): destructive actions — remove/clear buttons, filter reset.
- **Warning** (#F2C037, Quasar default): the out-of-bounds warning icon on encounter entries.

### Named Rules
**The Header-Only Accent Rule.** Oxblood and gold exist to mark the app's identity in the header;
they do not recur as decoration in cards, tables, or dialogs. If a new surface reaches for the
brand colors outside the header, that's a deviation from the incumbent system, not an extension of
it.

## Typography

**Display Font:** `becker-regular` (custom `@font-face`, woff), falling back to sans-serif.
**Body Font:** Noto Sans (Google Fonts), falling back to sans-serif.

**Character:** A single fantasy-flavored display face is reserved for the app title; everything
else — every label, table cell, button, and dialog — is plain Noto Sans. The pairing reads as
"one signature word, then get out of the way."

### Hierarchy
- **Display** (`becker-regular`, `x-large`, gold `#e9c58e`): the app title in the header toolbar.
  The only place this font appears.
- **Title** (`text-subtitle1`/`text-subtitle2`, medium weight): card section headers ("Encounter",
  XP totals).
- **Body** (Noto Sans, `1rem`): table rows, list items, form labels.
- **Label/Caption** (`text-caption`, Quasar default size): threat-bar tick labels, creature
  level/XP subtext, badge text (`0.75rem`).

## Layout

Quasar's 12-column grid (`row`/`col-*`) at `q-col-gutter-md`/`sm`. The main page is a single row:
the creature table takes 8–9 columns on desktop, the encounter panel takes 3–4 and sticks
(`position: sticky; top: 66px`) so it stays visible while the table scrolls. Below `md`, columns
stack to full width — there is no separate mobile layout, just the same grid collapsing.

Density is deliberately high: `q-py-sm` section padding, `dense` on nearly every input/button/
table, tight `q-col-gutter-sm` between filter controls. The one relaxed area is the empty-state
message in the encounter panel (`q-py-lg`).

## Elevation & Depth

Flat by design — there is no `box-shadow` or Quasar `elevation` prop anywhere in the codebase.
Depth is conveyed entirely through `flat bordered` cards and `q-separator` dividers, not shadow.

### Named Rules
**The Flat-By-Default Rule.** Surfaces never lift. A card's edge is a 1px border, not a shadow;
introducing elevation would be a new decision, not a restoration of an existing pattern.

## Shapes

Two radius languages coexist deliberately: small rectangular radii (4px) on bordered toggle
groups and buttons, and a fully pill-shaped outline (10px, `border: 1px solid currentColor`) on
inline tag badges. Icon-only buttons are circular (`round`, effectively `border-radius: 50%`).
No large-radius "soft card" language — cards are square-cornered by Quasar default.

## Components

### Buttons
- **Shape:** rectangular, sharp corners by default; `round` variant (perfect circle) for
  icon-only actions (add/remove/close/delete).
- **Primary:** oxblood background on `toggle-color="primary"` states (Weak/Base/Elite toggle);
  otherwise buttons are `flat`/`unelevated`, no-caps, and inherit ambient text color.
- **Negative:** transparent background, negative-red icon/text; used only for destructive actions
  (remove creature, clear encounter, reset filters).
- **Hover/Focus:** Quasar defaults — no custom transition or ripple styling.

### Badges / Tags (signature component)
- **Style:** `badge-outline` — transparent background, 1px `currentColor` border, 10px pill radius,
  `0.75rem` text, `1px 7px` padding. Text color carries the semantic meaning (rarity tier, NPC vs.
  Monster, Legacy vs. Remastered), the badge shape stays constant.
- **Why plain CSS, not `q-badge`:** these render inside a virtual-scrolled table where component
  remount cost stutters scrolling; a styled `<span>` reuses the same look at zero mount overhead.

### Cards / Containers
- **Corner Style:** square (no radius override — Quasar default).
- **Background:** white on grey-1 page background.
- **Shadow Strategy:** none (see Elevation & Depth) — `flat bordered` only.
- **Border:** 1px, Quasar default border color.
- **Internal Padding:** `q-py-sm` between sections, separated by `q-separator`.

### Inputs / Fields
- **Style:** `outlined`, `dense` — a thin border, no fill, compact height.
- **Focus:** Quasar's default outlined-field focus treatment (border color shift), unstyled.

### Threat Bar (signature component)
A horizontal budget gauge: a 12px-tall, fully-rounded (6px radius) track with a colored fill that
animates width and color over 0.3s ease, plus tick marks at each difficulty threshold (Trivial →
Beyond Extreme) using a fixed Quasar-palette color ramp (`grey-6` → `light-green-7` → `lime-8` →
`amber-8` → `orange-9` → `deep-orange-9` → `red-10`). This ramp is the one clearly designed color
sequence in the system, kept in `threat-colors.ts` as a single shared source.

### Navigation
Header is a single `q-toolbar`: square logo avatar, gold display title, then a flat row of
low-emphasis actions (License, What's New, GitHub corner link) — no active/selected state styling
because there is no multi-page navigation to indicate.

## Do's and Don'ts

### Do:
- **Do** keep the oxblood/gold accent confined to the header; the working surface stays neutral
  grey/white so the data is what draws the eye.
- **Do** reuse `badge-outline` (10px pill, `1px solid currentColor`, transparent fill) for any new
  inline tag/status label, especially inside virtual-scrolled lists where component mount cost
  matters.
- **Do** keep new controls `dense`/`outlined`/`no-caps` to match the existing density.
- **Do** use the existing Quasar-palette threat ramp (`threat-colors.ts`) for any new
  difficulty/severity indicator rather than inventing new colors for the same concept.

### Don't:
- **Don't** add `box-shadow` or Quasar `elevation` — nothing in this system lifts off the page.
- **Don't** introduce a second display/fantasy font; `becker-regular` is reserved for the header
  title only.
- **Don't** style badges as filled `q-badge` components inside the creatures table — the plain-CSS
  `badge-outline` span exists specifically to avoid virtual-scroll remount cost.
