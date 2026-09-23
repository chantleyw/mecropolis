import "maplibre-gl/dist/maplibre-gl.css"

import {
  AttributionControl,
  Map as MapLibre,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl"
import type { GeoJSONSource } from "maplibre-gl"
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

/**
 * Picks a side and vertical offset for each farm label so labels stay inside the map and clear of
 * each other, the farm dots, the map controls and the page panels over the map (marked
 * `data-map-cover`). Greedy: the first candidate with no overlap, else the one with the least.
 */
function placeLabels(m: MapLibre, slots: { pin: Pin; el: HTMLElement }[]) {
  const box = m.getContainer()
  const origin = box.getBoundingClientRect()
  const frame: Box = { x: 4, y: 4, w: origin.width - 8, h: origin.height - 8 }
  const covers = [
    ...box.querySelectorAll(".maplibregl-ctrl"),
    ...document.querySelectorAll("[data-map-cover]"),
  ]
  const blocked: Box[] = covers.map((c) => {
    const r = c.getBoundingClientRect()
    return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height }
  })
  const dots = slots.map(({ pin, el }) => ({ pin, el, p: m.project([pin.lng, pin.lat]) }))
  for (const { p } of dots) blocked.push({ x: p.x - DOT / 2, y: p.y - DOT / 2, w: DOT, h: DOT })
  const out: Record<string, Place> = {}
  for (const { pin, el, p } of dots) {
    const label = el.querySelector<HTMLElement>("[data-label]")
    const w = label?.offsetWidth ?? 0
    const h = label?.offsetHeight ?? 0
    const at = (c: Place): Box => ({
      x: c.side === "r" ? p.x + DOT / 2 + GAP : p.x - DOT / 2 - GAP - w,
      y: p.y - h / 2 + c.dy,
      w,
      h,
    })
    const cost = (c: Place) => {
      const b = at(c)
      return w * h - overlap(b, frame) + blocked.reduce((sum, o) => sum + overlap(b, o), 0)
    }
    let best: Place = { side: "r", dy: 0 }
    let bestCost = Infinity
    for (const c of CANDIDATES) {
      const k = cost(c)
      if (k < bestCost) [best, bestCost] = [c, k]
      if (k === 0) break
    }
    blocked.push(at(best))
    out[pin.slug] = best
  }
  return out
}

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function cellsGeoJson(grid: RegionGrid, layer: Layer): GeoJSON.FeatureCollection {
  const [lo, hi] = domain(grid, layer)
  const empty = cssVar("--line")
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
            color: v === null ? empty : layer === "rain" ? rainColor(t) : rampColor(t),
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
  const [places, setPlaces] = useState<Record<string, Place>>({})

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
          paint: { "line-color": cssVar("--ink"), "line-width": 1.5 },
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
    // Label widths are measured once they have rendered, then placed again as the view changes.
    const update = () =>
      setPlaces((prev) => {
        const next = placeLabels(m, slots)
        return JSON.stringify(next) === JSON.stringify(prev) ? prev : next
      })
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
        const place = places[pin.slug] ?? { side: "r", dy: 0 }
        const on = selected === pin.slug
        return createPortal(
          <button
            type="button"
            onClick={() => onSelect(pin.slug)}
            aria-pressed={on}
            className="group relative block h-3.5 w-3.5"
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
                place.side === "r" ? "left-[calc(100%+6px)]" : "right-[calc(100%+6px)]"
              } ${on ? "bg-ink text-bg" : "bg-surface text-ink group-hover:bg-surface-2"}`}
              style={{ transform: `translateY(calc(-50% + ${place.dy}px))` }}
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
