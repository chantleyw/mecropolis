---
name: Mecropolis
description: Field and crop tracker where season stage is derived from recorded weather.
colors:
  field-paper: "#f5f4ef"
  surface: "#ffffff"
  surface-2: "#faf9f5"
  loam-ink: "#1b2620"
  sage-muted: "#667066"
  furrow-line: "#e4e2d8"
  leaf: "#14804f"
  leaf-bright: "#22b573"
  leaf-ink: "#ffffff"
  leaf-soft: "#d5f0e1"
  sun-heat: "#d9820b"
  sun-heat-soft: "#fde9bf"
  rain-sky: "#1f6fc0"
  rain-sky-soft: "#d3e6fa"
  rust-warn: "#a4442f"
  rust-warn-soft: "#f8e4de"
  night-paper: "#0e1411"
  night-surface: "#161e19"
  night-ink: "#e8eee9"
  night-leaf: "#4cb887"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.85em"
rounded:
  control: "10px"
  card: "16px"
  panel: "12px"
  pill: "9999px"
spacing:
  card-pad: "20px"
  card-pad-lg: "24px"
  gutter: "16px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.loam-ink}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-primary:
    backgroundColor: "{colors.leaf}"
    textColor: "{colors.leaf-ink}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.loam-ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  badge-brand:
    backgroundColor: "{colors.leaf-soft}"
    textColor: "{colors.leaf}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  badge-neutral:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.sage-muted}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: Mecropolis

## Overview

**Creative North Star: "The Living Almanac"**

A seasonal record where colour follows the weather: leaf green for growth, sky blue for rain,
sun amber for heat, rust for warnings. Surfaces sit on warm field paper, lit from above, with soft
colour washes drifting in the corners like morning light across a field. Numbers are the content;
the almanac frame makes them feel alive without dressing them up.

The public pages (landing, about, docs) carry the full expression: glossy raised cards, the
Aurora washes, gradient headline text, float and rise motion. App surfaces (dashboard, seasons,
login) keep the same tokens and forms but are calmer: less shine, fewer moving parts, denser
tables and stat rows, because the operator is scanning, not browsing.

Light and dark are equal citizens. Dark mode is a night field (deep green black), not an
inverted light theme.

**Key Characteristics:**

- Weather-coded accents with a strict meaning per hue.
- Tactile, raised surfaces with layered soft shadows and a top inner highlight.
- Tabular numerals everywhere a number is compared.
- Motion is gentle and fully disabled under reduced motion.

## Colors

A warm neutral paper with four weather accents, each with a soft companion for fills and washes.

### Primary

- **Leaf** (`leaf`, bright companion `leaf-bright`): brand, primary actions, growth stages,
  progress fills, focus rings. Its soft tint `leaf-soft` fills badges and the top-left wash.

### Secondary

- **Rain Sky** (`rain-sky`, soft `rain-sky-soft`): rainfall, planted stage, secondary data series,
  the top-right wash.

### Tertiary

- **Sun Heat** (`sun-heat`, soft `sun-heat-soft`): temperature and heat risk, pre-harvest and
  thermal maturity stages, the bottom wash.
- **Rust Warn** (`rust-warn`, soft `rust-warn-soft`): errors, failed sources, high-severity pests.
  Flat fill only, never glossy.

### Neutral

- **Field Paper** (`field-paper`): page background under the washes.
- **Surface / Surface 2**: card top and inset fills (inputs, code, neutral badges).
- **Loam Ink** (`loam-ink`): text. **Sage Muted** (`sage-muted`): secondary text, eyebrows.
- **Furrow Line** (`furrow-line`): borders, dividers, empty progress tracks.
- Dark set: `night-paper`, `night-surface`, `night-ink`, `night-leaf` and the rest in
  `src/styles/globals.css`, duplicated under the media query and `[data-theme="dark"]`.

### Named Rules

**The Weather Code Rule.** Each accent means one thing: green is growth, blue is water, amber is
heat, rust is trouble. Never use an accent for decoration against its meaning.

**The Twin Token Rule.** Every token change is made in three places in `globals.css`: `:root`,
the dark media query, and `[data-theme="dark"]`.

## Typography

**Body Font:** Geist (with system-ui)
**Label/Mono Font:** Geist Mono (with ui-monospace) for code and identifiers.

**Character:** One grotesk family in several weights; hierarchy comes from size and weight, not
from pairing.

### Hierarchy

- **Display** (600, 3.75rem, line-height 1, tabular): the big live reading (temperature) only.
- **Headline** (600, 2.25rem, tight tracking, balanced wrap): page titles; may use gradient text on
  public pages.
- **Title** (600, 1rem): section and card headings.
- **Body** (400, 0.9375rem, relaxed leading, prose column max 48rem): text and table cells.
- **Label** (600, 0.6875rem, 0.08em tracking, uppercase): eyebrows above titles and stat labels.

### Named Rules

**The Tabular Rule.** Any number that sits next to another number uses `tabular-nums`.

## Layout

Single centred column. Prose pages max 48rem; app and landing up to 72rem with responsive grids
(1 column on phones, 2 to 3 from `sm`/`lg`). 16px side gutter on phones, 24px from `sm`. Cards pad
20px, 24px from `sm`. Stat rows wrap into two columns on phones. The page background is fixed so
the washes stay put while content scrolls.

## Elevation & Depth

Layered and lifted. Cards and buttons sit above the paper with a 1px top inner highlight and two
stacked soft green-tinted drop shadows; interactive cards lift 3px with a deeper shadow on hover.
Dark mode drops the tint and uses black shadows.

### Shadow Vocabulary

- **Resting** (`--shadow`): every card.
- **Lifted** (`--shadow-lift`): hover on linked or `card-lift` cards.
- **Glow**: progress fills cast a soft glow in their own colour.

### Named Rules

**The Calm App Rule.** App surfaces use resting shadows and at most one lift per card; shine
sweeps, floating and drifting stay on public pages.

## Shapes

Soft rounded rectangles: 16px cards, 12px inner panels, 10px controls, full pills for badges,
progress tracks and the live dot. The logo is an 8px rounded tile. No sharp corners anywhere.

## Components

### Buttons

- **Shape:** gently rounded (10px).
- **Default:** surface gradient fill, furrow-line border, small raised shadow, 600 weight 0.875rem.
- **Primary:** leaf gradient (bright to leaf), leaf-ink text, coloured drop glow.
- **Hover / Focus / Active:** border turns leaf (primary brightens 8%); press sinks 1px; focus is a
  2px leaf outline offset 2px. Disabled drops to 55% opacity.

### Chips (Badges)

- **Style:** pill, 0.75rem 600, soft gradient fill in the tone's colour with tone-coloured text.
  Stage badges map stages to tones (planning neutral, planted sky, growing leaf, pre-harvest and
  thermal maturity heat, review neutral). Warn badges are flat.

### Cards / Containers

- **Corner Style:** 16px.
- **Background:** diagonal gradient from card top to a faint green bottom.
- **Shadow Strategy:** resting, lifted on hover when linked.
- **Border:** 1px furrow line; linked season cards turn the border leaf on hover.
- **Internal Padding:** 20px, 24px from `sm`.
- **Stat:** a card with a 4px leaf to sky gradient strip on top, eyebrow label, 1.5rem tabular
  value, muted hint.

### Inputs / Fields

- **Style:** inset surface-2 fill, furrow-line border, 10px radius, 0.9375rem text.
- **Focus:** the global leaf outline.

### Navigation

- Header with the Brand mark (seedling tile plus wordmark), text links, and the theme toggle as a
  square icon button. Back button on inner pages.

### GDD Progress Bar (signature)

A 10px pill track in furrow line with a leaf gradient fill that grows from the left on load, casts
a leaf glow and (public pages only) carries a slow shine sweep. Always labelled with the
`total / maturity GDD` reading and a percentage, and exposed as a `progressbar`.

### Live Pulse (signature)

A leaf dot with an expanding ping ring beside data that is subscribed to real-time updates.

## Do's and Don'ts

### Do:

- **Do** show the source next to every external number, and a plain "unavailable" line when a
  source fails.
- **Do** keep all motion inside `prefers-reduced-motion: no-preference`.
- **Do** use the stage tone map from `src/components/ui.tsx` for every stage badge.

### Don't:

- **Don't** add shine, float or drift animations to app surfaces.
- **Don't** use rust or amber for anything other than warnings and heat.
- **Don't** place Aurora washes behind the text column.
- **Don't** show placeholder or skeleton numbers that could be read as data.
