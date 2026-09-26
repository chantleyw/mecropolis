---
name: Mecropolis
description: Field and crop tracker where season stage is calculated from recorded weather.
colors:
  bg: "#eceef0"
  surface: "#ffffff"
  surface-2: "#f4f5f7"
  ink: "#101418"
  muted: "#56606b"
  line: "#dde1e5"
  action: "#101418"
  action-ink: "#ffffff"
  sea: "#d6dde3"
  brand: "#0c7a5e"
  brand-soft: "#d9f0e8"
  warn: "#b42318"
  warn-soft: "#fbe3e0"
  sky: "#1b64c4"
  sky-soft: "#dbe8f8"
  heat: "#b8440f"
  heat-soft: "#fbe4d3"
  r0: "#3b4cc0"
  r1: "#3e9fd6"
  r2: "#4cc3a6"
  r3: "#9bd65a"
  r4: "#f0d43a"
  r5: "#f39a2b"
  r6: "#d8452a"
  rain-pale: "#ecf3fa"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.03em"
    fontFeature: "ss01"
  display-sm:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "ss01"
  body-lead:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  control:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333
  reading:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  data: "2px"
  chip: "4px"
  control: "6px"
  panel: "8px"
  dot: "9999px"
spacing:
  row-y: "10px"
  row-x: "20px"
  panel-pad: "24px"
  panel-inset: "24px"
  panel-inset-mobile: "16px"
  section-gap: "96px"
  nav-height: "56px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "8px 14.4px"
  button-primary-hero:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 14.4px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9.6px 12px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-pad}"
  segmented-track:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.control}"
    padding: "4px"
  segmented-option-active:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.chip}"
    padding: "6px 8px"
  segmented-option:
    textColor: "{colors.muted}"
    typography: "{typography.control}"
    rounded: "{rounded.chip}"
    padding: "6px 8px"
  stage-badge:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "2px 8px"
  badge-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.chip}"
    padding: "2px 8px"
  farm-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "4px 8px"
  farm-label-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.chip}"
    padding: "4px 8px"
  nav-bar:
    backgroundColor: "{colors.surface}"
    height: "{spacing.nav-height}"
---

# Design System: Mecropolis

## Overview

**Creative North Star: "The Regional Weather Map"**

The data is the ground. A full-bleed field of real Open-Meteo grid cells, coloured by one meteorological ramp, fills the first viewport over a quiet grey basemap; everything a person reads or presses sits on solid white panels that float over that field. The look descends from weather-map tools (Windy, Ventusky) with light chrome: the colour belongs to measured quantities, the chrome stays near-white and near-black so it never competes with them.

Below the field the page turns flat: ruled lists on the page ground, separated by hairlines, not stacks of cards. Density is moderate and legible; readings are set in a monospaced face with tabular figures, prose in a plain sans. Every coloured cell, bar and swatch stands for a number with a named source; a missing number is left blank or neutral, never coloured as zero.

**Key Characteristics:**

- Full-bleed data field with solid white panels floating over it (8px radius, one soft shadow, hairline edge).
- One meteorological ramp (blue, cyan, teal, green, yellow, orange, red) for quantity; chrome is neutral.
- One ink-black primary button; no coloured call-to-action.
- Geist for UI and prose, Geist Mono with tabular figures for readings, coordinates and scales.
- Flat below the fold: hairline-ruled lists, section rhythm of 96px.
- Light by default; a dark theme mirrors every neutral and state token, while the ramp stays identical because it is data.

## Colors

Neutral cool-grey chrome around a single seven-stop data ramp; state hues are small and functional.

### Primary

- **Ink Black** (`action`, `ink`): the one primary button, the selected layer option, the selected farm pin and label, and all body text. In dark theme it inverts to near-white with dark text on it.

### Secondary

- **Meteorological Ramp** (`r0` Deep Cold Blue, `r1` Cyan, `r2` Teal, `r3` Spring Green, `r4` Sun Yellow, `r5` Orange, `r6` Heat Red): the only colour scale for quantities (degree days, temperature). Map cells interpolate between the stops at 70% fill opacity over the basemap; the legend bar is the same ramp as a gradient. Stage swatches and the brand mark sample it. The ramp is identical in both themes.
- **Rain Scale** (`rain-pale` to `sky`): the one documented exception, a single-hue pale-to-deep blue for rainfall so it is never read as heat.

### Tertiary

- **Live Green** (`brand`, `brand-soft`): the live-listener dot (with its ping) and the brand badge tone. It is a status signal, not an action colour.
- **Alert Red** (`warn`, `warn-soft`): failures, refresh errors and the "Not validated" badge on crop models.
- **Link Blue** (`sky`, `sky-soft`): focus rings, text caret, the sky badge tone.
- **Heat Orange** (`heat`, `heat-soft`): the heat badge tone in the app.

### Neutral

- **Page Grey** (`bg`): page ground below the field, and the text on a selected pin label.
- **Panel White** (`surface`): every floating panel, the nav bar, buttons, pin labels, tooltips.
- **Well Grey** (`surface-2`): the segmented-control track, bar tracks, hover fill on pin labels and rows.
- **Slate Muted** (`muted`): secondary text, legend ticks, stat labels.
- **Hairline** (`line`): 1px panel edges and list rules; also the fill of a land cell with no value.
- **Sea Grey** (`sea`): the hero ground behind the map, so sea reads as blank ground.

### Named Rules

**The One Ramp Rule.** Quantity is shown only with `r0` to `r6` (rain alone uses its single-hue blue). Buttons, text and panel chrome never borrow ramp colours; the brand mark and the text-selection highlight (`r4`) are the only uses outside data.

**The Blank Is Honest Rule.** No value means no colour: sea cells are not drawn, and a land cell without data is filled with the hairline grey. Never map a missing value to the low end of a scale.

**The Ink Action Rule.** The primary action is ink-black on every surface. Green means live, red means failure, and neither is used for a call to action.

## Typography

**Display Font:** Geist (with system-ui, sans-serif)
**Body Font:** Geist (with system-ui, sans-serif), stylistic set `ss01` on the body
**Label/Mono Font:** Geist Mono (with ui-monospace, monospace)

**Character:** A neutral grotesk that stays out of the data's way, paired with its monospaced sibling for anything that is a measured value.

### Hierarchy

- **Display** (600, 2.5rem, line-height 1.04, -0.03em, balanced wrap): the landing H1 only, inside the hero panel, from 640px.
- **Display small** (600, 2rem, line-height 1.04, -0.03em): the same H1 below 640px, where the hero panel sits under the map.
- **Headline** (600, 1.5rem, -0.025em): section headings below the field; the lead section heading steps up to 1.875rem. Page H1s in Read and Operate routes use 1.875rem to 2.25rem at the same weight and tracking.
- **Title** (600, 1rem): farm names, step titles, definition terms, panel headings.
- **Body** (400, 0.875rem, line-height 1.625, muted): explanatory text in lists and panels, capped at about 28rem to 36rem.
- **Body lead** (400, 0.9375rem, relaxed, pretty wrap): the one hero sentence.
- **Control** (500, 0.8125rem): options in segmented controls, the map layer switcher from 768px and the live-data tabs.
- **Label** (500, 0.75rem, muted, sentence case): stat labels, table heads, legend titles; also the map layer options below 768px.
- **Reading** (Geist Mono 400, 0.6875rem to 0.875rem, tabular figures): legend ticks, coordinates, evidence lines ("since 23 Jun at 133 GDD"), model parameters, step numbers. Large stat values stay in Geist 600 at 1.5rem with tabular figures.

### Named Rules

**The Mono Means Measured Rule.** Geist Mono is reserved for values, coordinates and scales. Prose and labels never use it.

**The No Kicker Rule.** The small muted label marks a stat or a table column. It never sits above a heading, and labels are never uppercase-tracked.

## Layout

The landing hero is a full-bleed map under a sticky 56px white nav, with the section at `100svh` minus the nav and a 42rem floor. From 768px the panels float with 24px insets: the hero panel top left (27rem wide, 24px to 28px padding), the layer card bottom left at the same width, the farm panel top right (22rem). The map fits its region into the space the panels leave, and a farm pin under a panel is hidden; a pin label that cannot sit fully clear of panels, controls and the map edge is hidden rather than clipped.

On phones the order is map first (62svh, full width) with the layer card as a compact card along its bottom, then the grid note, the hero panel and the farm panel, each with 16px margins.

Below the field content sits in a 72rem container (16px gutters, 24px from 640px). Sections are separated by 96px of top padding. Lists are rows with a top rule and a bottom rule per row, 20px vertical padding for step and fact rows, 10px to 12px for data rows. Two-column splits appear from 1024px (text beside the ruled list) and 640px (fact grids).

## Elevation & Depth

Two levels. Panels floating over the data field carry one soft, two-part shadow; everything else is flat and separated by hairlines. Hover on a linked or lift-enabled panel deepens the shadow; nothing moves. Map marks carry their own small shadows so they stay legible on any cell colour.

### Shadow Vocabulary

- **Panel** (`box-shadow: 0 1px 2px rgb(16 20 24 / 8%), 0 8px 24px -10px rgb(16 20 24 / 22%)`): every floating panel and the cell tooltip.
- **Panel lift** (`box-shadow: 0 2px 4px rgb(16 20 24 / 10%), 0 14px 32px -10px rgb(16 20 24 / 30%)`): hover on a linked panel.
- **Map mark** (`0 1px 3px rgb(0 0 0 / 35%)` on the pin dot, `0 2px 6px rgb(0 0 0 / 18%)` on the pin label): only for marks drawn over the coloured field.

Dark theme uses black-based versions of the panel shadows at higher opacity.

### Named Rules

**The Float Only Over Data Rule.** A shadow means the element floats over the map. Content on the page ground is flat and ruled; do not wrap below-the-fold lists in shadowed cards.

**The Solid Panel Rule.** Panels are opaque white with a hairline edge. No glass, no blur, no translucency.

## Shapes

Small, plain corners that scale with the element's role: 2px on data marks (legend bar, bar tracks, swatches, soil bands), 4px on badges, pin labels and segmented options, 6px on buttons, inputs, the segmented track and tooltips, 8px on panels. Only status dots and pin dots are round. Borders are 1px hairlines; the pin dot uses a 3px ring (ink ring on white, white ring on ink when selected). Map cells are square grid cells at 0.25 degrees, drawn without antialiased seams.

## Components

### Buttons

Plain and firm, weight carried by ink rather than colour.

- **Shape:** gently squared (6px).
- **Primary:** ink background and border, white text, 600 at 0.875rem, 8px by 14.4px padding; the hero and closing calls to action use 10px by 16px.
- **Hover / Focus:** primary mixes 18% of the page ground into the ink on hover; secondary darkens its hairline border to ink; active on secondary fills with well grey. Focus is a 2px link-blue outline at 2px offset on every focusable element. Transitions are 150ms on background and border colour.
- **Secondary:** white with a hairline border and ink text. Disabled is 50% opacity with a progress cursor.

### Segmented Control

- **Style:** a well-grey track (6px radius, 4px padding) holding options at 4px radius in the control style (the map layer options drop to the label size below 768px). The active option is ink with white text; inactive options are muted and turn ink on hover. Used for map layers and the live-data tabs.

### Badges

- **Stage badge:** white with a hairline border, 4px radius, 0.75rem semibold, led by an 8px square swatch sampled from the ramp (planted `r1`, growing `r3`, pre-harvest `r5`, thermal maturity `r6`; planning uses the hairline grey and review the muted grey).
- **Tone badges:** soft background with the matching strong text (warn, brand, sky, heat, neutral). "Not validated" on crop models is the warn tone.

### Panels

- **Corner Style:** 8px.
- **Background:** panel white.
- **Shadow Strategy:** panel shadow at rest, lift on hover when linked (see Elevation & Depth).
- **Border:** 1px hairline.
- **Internal Padding:** 24px (28px on the hero from 640px); list panels use 20px horizontal rows with hairline dividers and no outer padding.

### Inputs / Fields

- **Style:** white, hairline border, 6px radius, 9.6px by 12px padding, 0.9375rem text, link-blue caret.
- **Focus:** the shared 2px link-blue outline.

### Navigation

- **Style:** sticky white bar, 56px, hairline bottom edge. Brand mark and wordmark left (600, tight tracking), text links centre at 0.875rem muted turning ink on hover (hidden below 640px), theme toggle and the ink primary button right.

### Regional Field Map (signature)

MapLibre on the OpenFreeMap Positron basemap. One square cell per real Open-Meteo grid point, filled from the ramp at 70% opacity and drawn beneath basemap labels; sea cells are not drawn. Switching layers recolours the cells in place. Hovering a cell outlines it in ink (1.5px) and shows a white tooltip with Mono coordinates, the value in semibold and the source in muted text. Farm pins are 14px dots with a 3px ring and a white label; clicking a pin selects it (ink dot, ink label) and swaps the farm panel. Basemap place names under a farm label are dropped. Zoom and attribution sit bottom right from 768px; on phones only attribution shows, top right.

### Legend Card

The layer switcher and its legend live in one panel: a title stating the quantity, unit and base, a 10px ramp bar at 2px radius, five Mono tick values in muted 11px, and a note naming the grid points, resolution, date range and that model parameters are hand-authored and not validated.

### Live Pulse

An 8px round dot, live green with an expanding ping (1.8s) once the Live Content API connects, hairline grey while connecting, labelled "Live" or "Connecting" in 0.75rem muted.

## Do's and Don'ts

### Do:

- **Do** let the data field own the first viewport and float solid white panels over it (8px radius, panel shadow, 1px hairline).
- **Do** colour every quantity from `r0` to `r6`, and state the unit, base and source in the legend beside it.
- **Do** leave missing values blank or hairline grey, and say in text why they are missing.
- **Do** set readings, coordinates and scales in Geist Mono with tabular figures.
- **Do** separate content below the field with hairline-ruled rows and 96px section spacing.
- **Do** keep one ink-black primary button per panel.
- **Do** keep light and dark tokens in sync; the ramp does not change between themes.
- **Do** honour reduced motion: bar growth (0.9s) and the live ping run only under `prefers-reduced-motion: no-preference`.

### Don't:

- **Don't** use gradients except a ramp or rain legend bar that stands for data.
- **Don't** use glass, blur or translucent panels.
- **Don't** give a call to action a colour; green and red are status, not action.
- **Don't** place a small label above a heading, or set labels in tracked uppercase.
- **Don't** introduce a second quantity scale beyond the ramp and the rain blue.
- **Don't** wrap below-the-fold lists in stacks of shadowed cards.
- **Don't** clip a map label under a panel; hide it instead.
