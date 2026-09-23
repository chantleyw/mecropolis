// The meteorological ramp from globals.css (--r0 to --r6), as RGB for per-cell interpolation.
const RAMP: [number, number, number][] = [
  [59, 76, 192],
  [62, 159, 214],
  [76, 195, 166],
  [155, 214, 90],
  [240, 212, 58],
  [243, 154, 43],
  [216, 69, 42],
]

// Rain is one hue, pale to deep blue.
const RAIN: [number, number, number][] = [
  [236, 243, 250],
  [27, 100, 196],
]

function interpolate(stops: [number, number, number][], t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1)
  const i = Math.min(Math.floor(x), stops.length - 2)
  const f = x - i
  const a = stops[i]!
  const b = stops[i + 1]!
  const c = a.map((v, k) => Math.round(v + (b[k]! - v) * f))
  return `rgb(${c[0]} ${c[1]} ${c[2]})`
}

export const rampColor = (t: number) => interpolate(RAMP, t)
export const rainColor = (t: number) => interpolate(RAIN, t)

export const RAMP_CSS = `linear-gradient(90deg, ${RAMP.map((_, i) => rampColor(i / (RAMP.length - 1))).join(", ")})`
export const RAIN_CSS = `linear-gradient(90deg, ${rainColor(0)}, ${rainColor(1)})`
