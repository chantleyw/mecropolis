import "maplibre-gl/dist/maplibre-gl.css"

import { Map as MapLibre, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl"
import type { GeoJSONSource } from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { COLS, REGION } from "@/lib/public/regionGrid"
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

// On wide screens the hero panel covers the left 30rem; the region is fitted into the rest.
const padding = () =>
  window.matchMedia("(min-width: 768px)").matches
    ? { top: 24, bottom: 24, left: 480, right: 24 }
    : { top: 16, bottom: 16, left: 16, right: 16 }

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

  useEffect(() => {
    const m = new MapLibre({
      container: box.current!,
      style: STYLE,
      bounds: BOUNDS,
      fitBoundsOptions: { padding: padding() },
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    })
    m.touchZoomRotate.disableRotation()
    m.addControl(new NavigationControl({ showCompass: false }), "bottom-right")
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
        // Labels near the east edge sit left of their dot so they stay inside the region.
        flip: (pin.lng - REGION.west) / REGION.step / COLS > 0.7,
      })),
    // pinKey stands in for pins, whose array identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinKey],
  )
  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    const markers = slots.map(({ pin, el, flip }) =>
      new Marker({ element: el, anchor: flip ? "right" : "left", offset: [flip ? 7 : -7, 0] })
        .setLngLat([pin.lng, pin.lat])
        .addTo(m),
    )
    return () => markers.forEach((mk) => mk.remove())
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
        </div>
      )}

      {slots.map(({ pin, el, flip }) =>
        createPortal(
          <button
            type="button"
            onClick={() => onSelect(pin.slug)}
            aria-pressed={selected === pin.slug}
            className={`group flex items-center gap-2 ${flip ? "flex-row-reverse" : ""}`}
          >
            <span
              aria-hidden
              className={`block h-3.5 w-3.5 rounded-full border-[3px] ${
                selected === pin.slug ? "border-surface bg-ink" : "border-ink bg-surface"
              } shadow-[0_1px_3px_rgb(0_0_0/35%)]`}
            />
            <span
              className={`rounded px-2 py-1 text-xs font-semibold whitespace-nowrap shadow-[0_2px_6px_rgb(0_0_0/18%)] ${
                selected === pin.slug
                  ? "bg-ink text-bg"
                  : "bg-surface text-ink group-hover:bg-surface-2"
              }`}
            >
              {pin.name}
            </span>
          </button>,
          el,
          pin.slug,
        ),
      )}
    </div>
  )
}
