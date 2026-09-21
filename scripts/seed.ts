// One-time configuration seed: farm, fields, crop catalogue (benchmark sources, pestWatch) and
// seasons at `planning`. Also resolves and stores the regional benchmarks for each crop.
// It never writes stage or stageHistory beyond the initial `planning`, and no yields,
// treatments or observations; the reconciler (/api/advance) walks the seasons.
//
// Run: npm run seed   (reads .env.local; writes to the configured Sanity dataset)
import { createClient } from "@sanity/client"
import { resolveBenchmarks, type CropBenchmarkConfig } from "../src/lib/benchmark/resolve"
import { syncBenchmarks } from "../src/lib/benchmark/sync"
import { CANOLA_PEST, WHEAT_PEST } from "../src/lib/pests/watch"
import { fetchPsdYield } from "../src/lib/data/psd"
import { harvestStatMeta, provinceYield } from "../src/lib/data/harveststat"
import { fetchWorldBankYield } from "../src/lib/data/worldbank"

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

const client = createClient({
  projectId: required("NEXT_PUBLIC_SANITY_PROJECT_ID"),
  dataset: required("NEXT_PUBLIC_SANITY_DATASET"),
  apiVersion: "2026-01-01",
  token: required("SANITY_API_WRITE_TOKEN"),
  useCdn: false,
})
const fasApiKey = required("FAS_API_KEY")

const ref = (id: string) => ({ _type: "reference", _ref: id })

const FARM_ID = "farm.swartland"

const farm = {
  _id: FARM_ID,
  _type: "farm",
  name: "Swartland Grain Farm",
  slug: { _type: "slug", current: "swartland-grain-farm" },
  location: "Swartland, Western Cape, South Africa",
  coordinates: { _type: "geopoint", lat: -33.45, lng: 18.75 },
  description: "Mixed grain and oilseed operation in the Western Cape wheat belt.",
}

const fields = [
  {
    id: "field.north-a",
    name: "North Block A",
    slug: "north-block-a",
    hectares: 45,
    soilType: "loamy",
    colour: "#4CAF50",
  },
  {
    id: "field.south-b",
    name: "South Block B",
    slug: "south-block-b",
    hectares: 38,
    soilType: "clay",
    colour: "#FF9800",
  },
  {
    id: "field.east-c",
    name: "East Block C",
    slug: "east-block-c",
    hectares: 52,
    soilType: "sandy",
    colour: "#2196F3",
  },
]

interface CropSeed {
  id: string
  name: string
  species: string
  cultivar: string
  growthCycleDays: number
  category: string
  commodity: string
  benchmarks: CropBenchmarkConfig
  pestWatch: { pest: string; gbifTaxonKey: number }[]
}

const crops: CropSeed[] = [
  {
    id: "crop.wheat-sst88",
    name: "Wheat (SST 88)",
    species: "Triticum aestivum",
    cultivar: "SST 88",
    growthCycleDays: 150,
    category: "grain",
    commodity: "Wheat",
    benchmarks: {
      psdCommodityCode: "0410000",
      harvestStatProduct: "Wheat",
      worldBankIndicator: "AG.YLD.CREL.KG",
    },
    pestWatch: [WHEAT_PEST],
  },
  {
    id: "crop.canola-hyola555",
    name: "Canola (Hyola 555)",
    species: "Brassica napus",
    cultivar: "Hyola 555",
    growthCycleDays: 140,
    category: "oilseed",
    commodity: "Canola",
    benchmarks: { psdCommodityCode: "2226000", harvestStatProduct: "Canola Seed" },
    pestWatch: [CANOLA_PEST],
  },
  {
    id: "crop.lupins-mandelup",
    name: "Lupins (Mandelup)",
    species: "Lupinus angustifolius",
    cultivar: "Mandelup",
    growthCycleDays: 130,
    category: "legume",
    commodity: "Sweet lupin",
    // PSD has no lupin series; HarvestStat "Sweet Lupin" covers 2000 to 2007 only.
    benchmarks: { harvestStatProduct: "Sweet Lupin" },
    pestWatch: [],
  },
]

// plantingDate is seeded configuration (a plan), not a logged event. Lupins are left unset so the
// planning guard blocks until it is chosen.
const seasons = [
  {
    id: "season.north-a.2026",
    field: "field.north-a",
    crop: "crop.wheat-sst88",
    plantingDate: "2026-06-15",
  },
  {
    id: "season.south-b.2026",
    field: "field.south-b",
    crop: "crop.canola-hyola555",
    plantingDate: "2026-06-01",
  },
  {
    id: "season.east-c.2026",
    field: "field.east-c",
    crop: "crop.lupins-mandelup",
    plantingDate: null,
  },
]

const FROM_YEAR = 2015
const TO_YEAR = 2025

async function main() {
  await client.createOrReplace(farm)

  for (const f of fields) {
    await client.createOrReplace({
      _id: f.id,
      _type: "field",
      name: f.name,
      slug: { _type: "slug", current: f.slug },
      farm: ref(FARM_ID),
      hectares: f.hectares,
      soilType: f.soilType,
      colour: f.colour,
    })
  }

  for (const c of crops) {
    await client.createOrReplace({
      _id: c.id,
      _type: "crop",
      name: c.name,
      species: c.species,
      cultivar: c.cultivar,
      growthCycleDays: c.growthCycleDays,
      category: c.category,
      benchmarks: c.benchmarks,
      pestWatch: c.pestWatch.map((p) => ({
        _key: String(p.gbifTaxonKey),
        _type: "pestWatchItem",
        ...p,
      })),
    })
  }

  // createIfNotExists: a rerun must not reset a season the reconciler has already advanced.
  for (const s of seasons) {
    await client.createIfNotExists({
      _id: s.id,
      _type: "season",
      field: ref(s.field),
      crop: ref(s.crop),
      year: 2026,
      stage: "planning",
      ...(s.plantingDate ? { plantingDate: s.plantingDate } : {}),
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  for (const c of crops) {
    const resolution = await resolveBenchmarks(
      {
        benchmarks: c.benchmarks,
        commodity: c.commodity,
        psdCountryCode: "SF",
        iso3: "ZAF",
        country: "South Africa",
        province: "Western Cape",
        fromYear: FROM_YEAR,
        toYear: TO_YEAR,
      },
      {
        fetchPsd: (params) => fetchPsdYield(params, fasApiKey),
        provinceYield,
        fetchWorldBank: fetchWorldBankYield,
        harvestStatMeta,
        today: () => today,
      },
    )
    const written = await syncBenchmarks(
      {
        createOrReplace: (doc) =>
          client.createOrReplace({ ...doc, _id: String(doc._id), _type: String(doc._type) }),
      },
      c.id,
      resolution,
    )
    const failures =
      resolution.status === "available"
        ? resolution.partialFailures.map((f) => `${f.source}: ${f.reason}`).join("; ")
        : resolution.reason
    process.stdout.write(
      `${c.name}: ${written} benchmark doc(s)${failures ? `; not resolved: ${failures}` : ""}\n`,
    )
  }
  process.stdout.write("Seed complete.\n")
}

main().catch((e: unknown) => {
  process.stderr.write(`Seed failed: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
})
