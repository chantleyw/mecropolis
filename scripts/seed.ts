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
  projectId: required("VITE_SANITY_PROJECT_ID"),
  dataset: required("VITE_SANITY_DATASET"),
  apiVersion: "2026-01-01",
  token: required("SANITY_API_WRITE_TOKEN"),
  useCdn: false,
})
const fasApiKey = required("FAS_API_KEY")

const ref = (id: string) => ({ _type: "reference", _ref: id })

// Farm positions are the town centres of real Western Cape grain districts, approximate to about
// 0.05 degrees and not surveyed. Field names, hectares, soil types and colours are operator-entered
// demo values. Fields have no coordinates of their own, so they use their farm's point.
const farms = [
  {
    id: "farm-swartland",
    name: "Swartland Grain Farm",
    slug: "swartland-grain-farm",
    location: "Swartland, Western Cape, South Africa",
    lat: -33.45,
    lng: 18.75,
    description: "Mixed grain and oilseed operation in the Western Cape wheat belt.",
  },
  {
    id: "farm-overberg",
    name: "Overberg Wheat Estate",
    slug: "overberg-wheat-estate",
    location: "Caledon, Overberg, Western Cape, South Africa",
    lat: -34.23,
    lng: 19.43,
    description: "Dryland wheat and canola in the Overberg.",
  },
  {
    id: "farm-ruens",
    name: "Ruens Mixed Farm",
    slug: "ruens-mixed-farm",
    location: "Riversdale, Southern Cape, Western Cape, South Africa",
    lat: -34.09,
    lng: 21.26,
    description: "Wheat, canola and lupin rotation in the Southern Cape Ruens.",
  },
]

const fields = [
  {
    id: "field-north-a",
    farm: "farm-swartland",
    name: "North Block A",
    slug: "north-block-a",
    hectares: 45,
    soilType: "loamy",
    colour: "#4CAF50",
  },
  {
    id: "field-south-b",
    farm: "farm-swartland",
    name: "South Block B",
    slug: "south-block-b",
    hectares: 38,
    soilType: "clay",
    colour: "#FF9800",
  },
  {
    id: "field-east-c",
    farm: "farm-swartland",
    name: "East Block C",
    slug: "east-block-c",
    hectares: 52,
    soilType: "sandy",
    colour: "#2196F3",
  },
  {
    id: "field-west-d",
    farm: "farm-swartland",
    name: "West Block D",
    slug: "west-block-d",
    hectares: 29,
    soilType: "silty",
    colour: "#9C27B0",
  },
  {
    id: "field-ob-hill",
    farm: "farm-overberg",
    name: "Hill Camp",
    slug: "hill-camp",
    hectares: 61,
    soilType: "loamy",
    colour: "#4CAF50",
  },
  {
    id: "field-ob-river",
    farm: "farm-overberg",
    name: "River Camp",
    slug: "river-camp",
    hectares: 34,
    soilType: "silty",
    colour: "#03A9F4",
  },
  {
    id: "field-ob-koppie",
    farm: "farm-overberg",
    name: "Koppie Camp",
    slug: "koppie-camp",
    hectares: 48,
    soilType: "clay",
    colour: "#FF5722",
  },
  {
    id: "field-ob-dam",
    farm: "farm-overberg",
    name: "Dam Camp",
    slug: "dam-camp",
    hectares: 27,
    soilType: "sandy",
    colour: "#FFC107",
  },
  {
    id: "field-ru-home",
    farm: "farm-ruens",
    name: "Homestead Block",
    slug: "homestead-block",
    hectares: 40,
    soilType: "loamy",
    colour: "#8BC34A",
  },
  {
    id: "field-ru-plain",
    farm: "farm-ruens",
    name: "Plain Block",
    slug: "plain-block",
    hectares: 72,
    soilType: "clay",
    colour: "#795548",
  },
  {
    id: "field-ru-ridge",
    farm: "farm-ruens",
    name: "Ridge Block",
    slug: "ridge-block",
    hectares: 33,
    soilType: "sandy",
    colour: "#00BCD4",
  },
  {
    id: "field-ru-vlei",
    farm: "farm-ruens",
    name: "Vlei Block",
    slug: "vlei-block",
    hectares: 25,
    soilType: "peaty",
    colour: "#607D8B",
  },
]

interface CropSeed {
  id: string
  name: string
  species: string
  cultivar: string
  gddModelKey: string
  growthCycleDays: number
  category: string
  commodity: string
  benchmarks: CropBenchmarkConfig
  pestWatch: { pest: string; gbifTaxonKey: number }[]
}

const crops: CropSeed[] = [
  {
    id: "crop-wheat-sst88",
    name: "Wheat (SST 88)",
    species: "Triticum aestivum",
    cultivar: "SST 88",
    gddModelKey: "wheat",
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
    id: "crop-canola-hyola555",
    name: "Canola (Hyola 555)",
    species: "Brassica napus",
    cultivar: "Hyola 555",
    gddModelKey: "canola",
    growthCycleDays: 140,
    category: "oilseed",
    commodity: "Canola",
    benchmarks: { psdCommodityCode: "2226000", harvestStatProduct: "Canola Seed" },
    pestWatch: [CANOLA_PEST],
  },
  {
    id: "crop-lupins-mandelup",
    name: "Lupins (Mandelup)",
    species: "Lupinus angustifolius",
    cultivar: "Mandelup",
    gddModelKey: "narrow-leafed lupin",
    growthCycleDays: 130,
    category: "legume",
    commodity: "Sweet lupin",
    // PSD has no lupin series; HarvestStat "Sweet Lupin" covers 2000 to 2007 only.
    benchmarks: { harvestStatProduct: "Sweet Lupin" },
    pestWatch: [],
  },
]

// plantingDate is seeded configuration (a plan), not a logged event. Lupins on East Block C are
// left unset so the planning guard blocks until it is chosen. Every season starts at `planning`;
// the reconciler (POST /api/advance) derives any later stage from real weather.
const W = "crop-wheat-sst88"
const C = "crop-canola-hyola555"
const L = "crop-lupins-mandelup"
const seasons: {
  id: string
  field: string
  crop: string
  year: number
  plantingDate: string | null
}[] = [
  {
    id: "season-north-a-2026",
    field: "field-north-a",
    crop: W,
    year: 2026,
    plantingDate: "2026-06-15",
  },
  {
    id: "season-south-b-2026",
    field: "field-south-b",
    crop: C,
    year: 2026,
    plantingDate: "2026-06-01",
  },
  { id: "season-east-c-2026", field: "field-east-c", crop: L, year: 2026, plantingDate: null },
  {
    id: "season-west-d-2026",
    field: "field-west-d",
    crop: W,
    year: 2026,
    plantingDate: "2026-06-22",
  },
  {
    id: "season-north-a-2025",
    field: "field-north-a",
    crop: C,
    year: 2025,
    plantingDate: "2025-05-20",
  },
  {
    id: "season-south-b-2025",
    field: "field-south-b",
    crop: W,
    year: 2025,
    plantingDate: "2025-06-10",
  },
  {
    id: "season-ob-hill-2026",
    field: "field-ob-hill",
    crop: W,
    year: 2026,
    plantingDate: "2026-06-08",
  },
  {
    id: "season-ob-river-2026",
    field: "field-ob-river",
    crop: C,
    year: 2026,
    plantingDate: "2026-05-18",
  },
  {
    id: "season-ob-koppie-2026",
    field: "field-ob-koppie",
    crop: W,
    year: 2026,
    plantingDate: "2026-06-25",
  },
  {
    id: "season-ob-dam-2026",
    field: "field-ob-dam",
    crop: L,
    year: 2026,
    plantingDate: "2026-06-12",
  },
  {
    id: "season-ob-hill-2025",
    field: "field-ob-hill",
    crop: C,
    year: 2025,
    plantingDate: "2025-05-15",
  },
  {
    id: "season-ob-koppie-2025",
    field: "field-ob-koppie",
    crop: W,
    year: 2025,
    plantingDate: "2025-06-05",
  },
  {
    id: "season-ru-home-2026",
    field: "field-ru-home",
    crop: C,
    year: 2026,
    plantingDate: "2026-05-25",
  },
  {
    id: "season-ru-plain-2026",
    field: "field-ru-plain",
    crop: W,
    year: 2026,
    plantingDate: "2026-06-18",
  },
  {
    id: "season-ru-ridge-2026",
    field: "field-ru-ridge",
    crop: L,
    year: 2026,
    plantingDate: "2026-06-05",
  },
  {
    id: "season-ru-vlei-2026",
    field: "field-ru-vlei",
    crop: W,
    year: 2026,
    plantingDate: "2026-07-02",
  },
  {
    id: "season-ru-home-2025",
    field: "field-ru-home",
    crop: W,
    year: 2025,
    plantingDate: "2025-06-12",
  },
  {
    id: "season-ru-plain-2025",
    field: "field-ru-plain",
    crop: C,
    year: 2025,
    plantingDate: "2025-05-22",
  },
]

const FROM_YEAR = 2015
const TO_YEAR = 2025

async function main() {
  for (const f of farms) {
    await client.createOrReplace({
      _id: f.id,
      _type: "farm",
      name: f.name,
      slug: { _type: "slug", current: f.slug },
      location: f.location,
      coordinates: { _type: "geopoint", lat: f.lat, lng: f.lng },
      description: f.description,
    })
  }

  // Patch rather than replace: a rerun must keep the photo and soil report uploaded through /api/assets.
  for (const f of fields) {
    const seeded = {
      name: f.name,
      slug: { _type: "slug", current: f.slug },
      farm: ref(f.farm),
      hectares: f.hectares,
      soilType: f.soilType,
      colour: f.colour,
    }
    await client
      .transaction()
      .createIfNotExists({ _id: f.id, _type: "field", ...seeded })
      .patch(f.id, (p) => p.set(seeded))
      .commit()
  }

  for (const c of crops) {
    await client.createOrReplace({
      _id: c.id,
      _type: "crop",
      name: c.name,
      species: c.species,
      cultivar: c.cultivar,
      gddModelKey: c.gddModelKey,
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
      year: s.year,
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
