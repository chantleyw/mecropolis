import { z } from "zod"
import { fetchJson } from "@/lib/http/fetchJson"

const HOST = "https://rest.isric.org/soilgrids/v2.0/properties/query"

const schema = z.object({
  properties: z.object({
    layers: z.array(
      z.object({
        name: z.string(),
        depths: z.array(z.object({ values: z.object({ mean: z.number().nullable() }) })),
      }),
    ),
  }),
})

export type TextureClass =
  | "sand"
  | "loamy sand"
  | "sandy loam"
  | "loam"
  | "silt loam"
  | "silt"
  | "sandy clay loam"
  | "clay loam"
  | "silty clay loam"
  | "sandy clay"
  | "silty clay"
  | "clay"

// USDA texture triangle (percentages summing to about 100).
export function classifyTexture(sand: number, silt: number, clay: number): TextureClass {
  if (silt + 1.5 * clay < 15) return "sand"
  if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) return "loamy sand"
  if (
    (clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) ||
    (clay < 7 && silt < 50 && silt + 2 * clay >= 30)
  ) {
    return "sandy loam"
  }
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return "loam"
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) {
    return "silt loam"
  }
  if (silt >= 80 && clay < 12) return "silt"
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return "sandy clay loam"
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return "clay loam"
  if (clay >= 27 && clay < 40 && sand <= 20) return "silty clay loam"
  if (clay >= 35 && sand > 45) return "sandy clay"
  if (clay >= 40 && silt >= 40) return "silty clay"
  return "clay"
}

// The Sanity field.soilType list is coarse; map a texture class onto it.
export function toFieldSoilType(t: TextureClass): "sandy" | "loamy" | "clay" | "silty" {
  if (t === "sand" || t === "loamy sand" || t === "sandy loam") return "sandy"
  if (t === "silt" || t === "silt loam" || t === "silty clay loam") return "silty"
  if (t === "loam" || t === "sandy clay loam" || t === "clay loam") return "loamy"
  return "clay"
}

export async function fetchSoilTexture(lat: number, lon: number) {
  const url =
    `${HOST}?lon=${lon}&lat=${lat}&property=sand&property=silt&property=clay` +
    `&depth=0-5cm&value=mean`
  const r = await fetchJson(url, schema, { timeoutMs: 20_000 })
  const get = (name: string) => {
    const v = r.properties.layers.find((l) => l.name === name)?.depths[0]?.values.mean
    if (v === null || v === undefined) throw new Error(`SoilGrids returned no ${name} value`)
    return v / 10 // g/kg to %
  }
  const sand = get("sand")
  const silt = get("silt")
  const clay = get("clay")
  const texture = classifyTexture(sand, silt, clay)
  return { sand, silt, clay, texture, soilType: toFieldSoilType(texture) }
}
