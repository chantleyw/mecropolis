---
version: 1
slug: "src-pages-landing-tsx"
primary_target: "src/pages/Landing.tsx"
related_targets: []
---

Scope: public landing `/` (Persuade). Sets the world for `/about`, `/docs` (Read) and app routes (Operate).
Audience: DEV.to judges first, farm operator second. Memory goal (user): "a working Sanity app". Look reference (user): Windy / Ventusky, light chrome. User ruled out: themed metaphors, decorative, corporate, dark/techy.
Chosen after three re-rolls: user-pinned Sketch A, "Regional field" (`.impeccable/mocks/sketches.html`).

## Direction contract

THESIS: The Western Cape grain belt as a live weather-map field of accumulated degree days, the three farms pinned on it, so the mechanism (stage from recorded heat) is visible before a word is read. Refuses the agtech hero-plus-screenshot and card stacks.

OWN-WORLD: Full-bleed data colour owns the viewport; chrome is solid white panels (8px radius, one soft shadow, hairline edge) floating over it, near-black ink, one ink-black primary button. One meteorological ramp (blue, cyan, teal, green, yellow, orange, red) carries all quantity; stage colours sample the same ramp. Geist for UI, Geist Mono for readings and scales. Each map cell is one real Open-Meteo grid point; sea cells stay blank ground. No gradients as decoration, no glass.

STORY: Visitor sees heat accumulating across a real region, reads that stage is calculated from it, clicks a farm, sees a real Sanity season with its GDD reading and source, opens the dashboard.

FIRST VIEWPORT: Field fills 100% under a 56px white nav. Left panel (~430px): H1 about 40px, one sentence, Open the dashboard + How it works. Right panel: selected farm's seasons from Sanity (stage, GDD/threshold, source line, live). Bottom left: layer switcher (Degree days, Temperature, Rain) with the ramp legend (units and base) in the same card, so the legend sits beside the layer it describes; bottom right holds the map zoom and attribution. Farm pins labelled, labels placed clear of each other, the controls and the panels; a pin under a panel is hidden, a label that cannot sit fully clear is hidden rather than clipped, and basemap place names under a farm label are dropped. Phones: map first (62svh, full width) with the switcher and legend as a compact card at its bottom and the grid note under the map, then the hero text and farm panel.

FORM: Regional weather-map field; user-pinned over the roll (seed e0220823, three re-rolls). Signature interaction: layer switch recolours the field in place; hovering a cell shows its coordinates, value and source; clicking a pin swaps the season panel.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Unresolved: grid resolution and cache across isolates (Open-Meteo 429 risk); crop base temp for the regional field (wheat model, base 0 C, labelled uncited).
