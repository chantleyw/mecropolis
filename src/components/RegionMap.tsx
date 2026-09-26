import "maplibre-gl/dist/maplibre-gl.css"

import {
  AttributionControl,
  Map as MapLibre,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl"
import type { FilterSpecification, GeoJSONSource } from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { REGION } from "@/lib/public/regionGrid"
import type { RegionCell, RegionGrid } from "@/lib/public/regionGrid"
import { rainColor, rampColor } from "@/lib/public/ramp"
import { domain, fmt, LAYERS, UNIT, value, type Layer, type Pin } from "@/components/RegionField"

// Vite bundles the worker (it imports maplibre's shared chunk) and hands back its URL.
setWorkerUrl(workerUrl)

// Keyless vector tiles from OpenFreeMap (OpenMapTiles schema, OpenStreetMap data). The style's
// sources carry the attribution the control shows.
const STYLE = "https://tiles.openfreemap.org/styles/positron"
const SOURCE = "region-grid"
const FILL = "region-grid-fill"
const HOVER = "region-grid-hover"
const H = REGION.step / 2
const BOUNDS: [[number, number], [number, number]] = [
  [REGION.west - H, REGION.south - H],
  [REGION.east + H, REGION.north + H],
]

const MD = "(min-width: 768px)"
const XL = "(min-width: 1280px)"
// Height of the layer card over the bottom of the map on phones (measured, with its margin).
const MOBILE_CARD = 148

// On wide screens the hero panel covers the left 30rem and, from 1280 px, the farm panel the right
// 25rem; the region is fitted into the rest. On phones the layer card covers the map's bottom.
const padding = () =>
  window.matchMedia(MD).matches
    ? { top: 24, bottom: 24, left: 480, right: window.matchMedia(XL).matches ? 400 : 24 }
    : { top: 16, bottom: MOBILE_CARD, left: 16, right: 16 }

type Box = { x: number; y: number; w: number; h: number }
type Place = { side: "l" | "r"; dy: number }
const DOT = 14
const GAP = 6
const CANDIDATES: Place[] = [0, -16, 16, -32, 32].flatMap((dy) => [
  { side: "r" as const, dy },
  { side: "l" as const, dy },
])
const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
const inside = (a: Box, b: Box) =>
  a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h

// A farm's dot and label. `dot: false` hides the whole pin, `label: null` only its label.
type Placement = { dot: boolean; label: Place | null }

/**
 * Picks a side and vertical offset for each farm label so labels stay inside the map and clear of
 * each other, the farm dots, the map controls and the page panels over the map (marked
 * `data-map-cover`). A pin whose dot is under a cover is hidden, and a label that cannot sit fully
 * clear of the covers and the map edge is hidden rather than clipped. Greedy: among clear
 * candidates, the first with no overlap, else the one with the least. Also returns the boxes of
 * the visible dots and labels.
 */
function placeLabels(m: MapLibre, slots: { pin: Pin; el: HTMLElement }[]) {
  const box = m.getContainer()
  const origin = box.getBoundingClientRect()
  const frame: Box = { x: 4, y: 4, w: origin.width - 8, h: origin.height - 8 }
  const covers: Box[] = [
    ...box.querySelectorAll(".maplibregl-ctrl"),
    ...document.querySelectorAll("[data-map-cover]"),
  ].map((c) => {
    const r = c.getBoundingClientRect()
    return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height }
  })
  const dots = slots.map(({ pin, el }) => {
    const p = m.project([pin.lng, pin.lat])
    const dot: Box = { x: p.x - DOT / 2, y: p.y - DOT / 2, w: DOT, h: DOT }
    const shown = inside(dot, frame) && covers.every((c) => overlap(dot, c) === 0)
    return { pin, el, p, dot, shown }
  })
  const blocked: Box[] = dots.flatMap((d) => (d.shown ? [d.dot] : []))
  const out: Record<string, Placement> = {}
  for (const { pin, el, p, shown } of dots) {
    if (!shown) {
      out[pin.slug] = { dot: false, label: null }
      continue
    }
    const label = el.querySelector<HTMLElement>("[data-label]")
    const w = label?.offsetWidth ?? 0
    const h = label?.offsetHeight ?? 0
    const at = (c: Place): Box => ({
      x: c.side === "r" ? p.x + DOT / 2 + GAP : p.x - DOT / 2 - GAP - w,
      y: p.y - h / 2 + c.dy,
      w,
      h,
    })
    const clear = (b: Box) => inside(b, frame) && covers.every((c) => overlap(b, c) === 0)
    let best: Place | null = null
    let bestCost = Infinity
    for (const c of CANDIDATES) {
      const b = at(c)
      if (!clear(b)) continue
      const k = blocked.reduce((sum, o) => sum + overlap(b, o), 0)
      if (k < bestCost) [best, bestCost] = [c, k]
      if (k === 0) break
    }
    if (best) blocked.push(at(best))
    out[pin.slug] = { dot: true, label: best }
  }
  return { places: out, boxes: blocked }
}

/**
 * Basemap place names (towns, regions) that sit under a farm dot or label. MapLibre drops their
 * labels through a layer filter; `hidden` maps each name to its point so a name stays hidden while
 * its point is within NEAR px of a farm box, which stops it flickering back in on the next pass.
 */
const NEAR = 160
function coveredPlaces(m: MapLibre, boxes: Box[], hidden: Map<string, [number, number]>) {
  const near = (x: number, y: number) =>
    boxes.some(
      (b) => x > b.x - NEAR && x < b.x + b.w + NEAR && y > b.y - NEAR && y < b.y + b.h + NEAR,
    )
  const next = new Map(
    [...hidden].filter(([, ll]) => {
      const p = m.project(ll)
      return near(p.x, p.y)
    }),
  )
  const layers = placeLayers(m)
  if (layers.length === 0) return next
  for (const b of boxes) {
    const hits = m.queryRenderedFeatures(
      [
        [b.x, b.y],
        [b.x + b.w, b.y + b.h],
      ],
      { layers },
    )
    for (const f of hits) {
      const name: unknown = f.properties.name
      if (typeof name === "string" && f.geometry.type === "Point")
        next.set(name, f.geometry.coordinates as [number, number])
    }
  }
  return next
}

const placeLayers = (m: MapLibre) =>
  m
    .getStyle()
    .layers.flatMap((l) =>
      l.type === "symbol" && "source-layer" in l && l["source-layer"] === "place" ? [l.id] : [],
    )

// The Positron base map is light in both themes, so cells use the light-theme --line and --ink
// rather than the page tokens (near-white outlines on a light map in dark mode).
const EMPTY_CELL = "#dde1e5"
const HOVER_LINE = "#101418"

function cellsGeoJson(grid: RegionGrid, layer: Layer): GeoJSON.FeatureCollection {
  const [lo, hi] = domain(grid, layer)
  return {
    type: "FeatureCollection",
    features: grid.cells.flatMap((c, i) => {
      if (!c.land) return []
      const v = value(c, layer)
      const t = v === null ? 0 : (v - lo) / (hi - lo)
      return [
        {
          type: "Feature",
          id: i,
          properties: {
            i,
            color: v === null ? EMPTY_CELL : layer === "rain" ? rainColor(t) : rampColor(t),
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [c.lng - H, c.lat + H],
                [c.lng + H, c.lat + H],
                [c.lng + H, c.lat - H],
                [c.lng - H, c.lat - H],
                [c.lng - H, c.lat + H],
              ],
            ],
          },
        },
      ]
    }),
  }
}

/** The regional grid drawn over an OpenFreeMap base map, with the farms as markers. */
export default function RegionMap({
  grid,
  layer,
  pins,
  selected,
  onSelect,
}: {
  grid: RegionGrid
  layer: Layer
  pins: Pin[]
  selected: string | null
  onSelect: (slug: string) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibre | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null)
  const [places, setPlaces] = useState<Record<string, Placement>>({})

  useEffect(() => {
    const m = new MapLibre({
      container: box.current!,
      style: STYLE,
      attributionControl: false,
      bounds: BOUNDS,
      fitBoundsOptions: { padding: padding() },
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    })
    m.touchZoomRotate.disableRotation()
    // Phones: attribution top right, clear of the layer card (MapLibre makes it compact below
    // 640 px), and no zoom buttons (pinch).
    // Wider: attribution and zoom bottom right, since the farm panel holds the top right.
    const attribution = new AttributionControl()
    const nav = new NavigationControl({ showCompass: false })
    const mq = window.matchMedia(MD)
    const placeControls = () => {
      if (m.hasControl(attribution)) m.removeControl(attribution)
      if (m.hasControl(nav)) m.removeControl(nav)
      if (mq.matches) {
        m.addControl(nav, "bottom-right")
        m.addControl(attribution, "bottom-right")
      } else {
        m.addControl(attribution, "top-right")
      }
    }
    placeControls()
    mq.addEventListener("change", placeControls)
    // The layout changes at the md breakpoint, so the region is fitted again on every resize.
    m.on("resize", () => m.fitBounds(BOUNDS, { padding: padding(), animate: false }))
    m.on("error", (e) => setError(e.error.message))
    m.on("load", () => {
      const labels = m.getStyle().layers.find((l) => l.type === "symbol")?.id
      m.addSource(SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } })
      m.addLayer(
        {
          id: FILL,
          type: "fill",
          source: SOURCE,
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.7, "fill-antialias": false },
        },
        labels,
      )
      m.addLayer(
        {
          id: HOVER,
          type: "line",
          source: SOURCE,
          filter: ["==", ["get", "i"], -1],
          paint: { "line-color": HOVER_LINE, "line-width": 1.5 },
        },
        labels,
      )
      m.on("mousemove", FILL, (e) => {
        const i = e.features?.[0]?.properties.i as number | undefined
        m.setFilter(HOVER, ["==", ["get", "i"], i ?? -1])
        setHover(i === undefined ? null : { i, x: e.point.x, y: e.point.y })
      })
      m.on("mouseleave", FILL, () => {
        m.setFilter(HOVER, ["==", ["get", "i"], -1])
        setHover(null)
      })
      setReady(true)
    })
    map.current = m
    return () => {
      mq.removeEventListener("change", placeControls)
      map.current = null
      m.remove()
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    map.current?.getSource<GeoJSONSource>(SOURCE)?.setData(cellsGeoJson(grid, layer))
  }, [ready, grid, layer])

  const pinKey = pins.map((p) => `${p.slug}:${p.lat}:${p.lng}`).join("|")
  // One DOM element per farm; React renders the pin into it and MapLibre positions it.
  const slots = useMemo(
    () =>
      pins.map((pin) => ({
        pin,
        el: document.createElement("div"),
      })),
    // pinKey stands in for pins, whose array identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinKey],
  )
  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    const markers = slots.map(({ pin, el }) =>
      new Marker({ element: el, anchor: "center" }).setLngLat([pin.lng, pin.lat]).addTo(m),
    )
    // The style's own filters, which the hidden-name filter is added to.
    const base = new Map(placeLayers(m).map((id) => [id, m.getFilter(id)]))
    let hidden = new Map<string, [number, number]>()
    // Label widths are measured once they have rendered, then placed again as the view changes.
    const update = () => {
      const { places: next, boxes } = placeLabels(m, slots)
      setPlaces((prev) => (JSON.stringify(next) === JSON.stringify(prev) ? prev : next))
      const names = coveredPlaces(m, boxes, hidden)
      if ([...names.keys()].join("|") === [...hidden.keys()].join("|")) return
      hidden = names
      const drop: FilterSpecification = [
        "!",
        ["in", ["get", "name"], ["literal", [...names.keys()]]],
      ]
      // The positron filters are expressions (not legacy filters), so they combine under "all".
      for (const [id, f] of base)
        m.setFilter(id, f ? (["all", f, drop] as FilterSpecification) : drop)
      // Dropping a name can let a label that lost collision appear under a farm; check again.
      m.once("idle", update)
    }
    const frame = requestAnimationFrame(update)
    m.on("move", update)
    m.on("resize", update)
    // The panels over the map grow as their data loads.
    const covers = new ResizeObserver(update)
    document.querySelectorAll("[data-map-cover]").forEach((el) => covers.observe(el))
    return () => {
      covers.disconnect()
      cancelAnimationFrame(frame)
      m.off("move", update)
      m.off("resize", update)
      m.off("idle", update)
      markers.forEach((mk) => mk.remove())
    }
  }, [ready, slots])

  const land = grid.cells.filter((c) => c.land)
  const vals = land.flatMap((c) => {
    const v = value(c, layer)
    return v === null ? [] : [v]
  })
  const summary =
    vals.length > 0
      ? `Map of the Western Cape: ${LAYERS.find((l) => l.id === layer)?.label} across ${land.length} grid points, from ${fmt(Math.min(...vals), layer)} to ${fmt(Math.max(...vals), layer)} ${UNIT[layer]}.`
      : "Map of the Western Cape. No values for this layer."
  const hc: RegionCell | undefined = hover ? grid.cells[hover.i] : undefined
  const hv = hc ? value(hc, layer) : null

  return (
    <div className="relative h-full w-full">
      <div ref={box} className="h-full w-full" role="region" aria-label={summary} />

      {error && (
        <p
          role="alert"
          className="card text-warn absolute top-4 left-4 z-10 max-w-sm p-3 text-xs md:left-[30rem]"
        >
          The base map failed: {error}
        </p>
      )}

      {hover && hc && (
        <div
          className="bg-surface text-ink pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap shadow-[var(--shadow)]"
          style={{ left: hover.x, top: hover.y }}
        >
          <span className="font-mono tabular-nums">
            {hc.lat.toFixed(2)}, {hc.lng.toFixed(2)}
          </span>
          <span className="ml-2 font-semibold tabular-nums">
            {hv === null ? "no data" : `${fmt(hv, layer)} ${UNIT[layer]}`}
          </span>
          <span className="text-muted ml-2">Open-Meteo, 0.25° grid</span>
        </div>
      )}

      {slots.map(({ pin, el }) => {
        // Until placed, the label renders hidden so it can be measured without a clipped flash.
        const { dot, label: place } = places[pin.slug] ?? { dot: true, label: null }
        const on = selected === pin.slug
        return createPortal(
          <button
            type="button"
            onClick={() => onSelect(pin.slug)}
            aria-pressed={on}
            aria-label={pin.name}
            className={`group relative block h-3.5 w-3.5 ${dot ? "" : "invisible"}`}
          >
            <span
              aria-hidden
              className={`block h-3.5 w-3.5 rounded-full border-[3px] ${
                on ? "border-surface bg-ink" : "border-ink bg-surface"
              } shadow-[0_1px_3px_rgb(0_0_0/35%)]`}
            />
            <span
              data-label
              className={`absolute top-1/2 rounded px-2 py-1 text-xs font-semibold whitespace-nowrap shadow-[0_2px_6px_rgb(0_0_0/18%)] ${
                place?.side === "l" ? "right-[calc(100%+6px)]" : "left-[calc(100%+6px)]"
              } ${place ? "" : "invisible"} ${on ? "bg-ink text-bg" : "bg-surface text-ink group-hover:bg-surface-2"}`}
              style={{ transform: `translateY(calc(-50% + ${place?.dy ?? 0}px))` }}
            >
              {pin.name}
            </span>
          </button>,
          el,
          pin.slug,
        )
      })}
    </div>
  )
}
