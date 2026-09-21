// Regenerates src/lib/data/harveststat-za.json from the HarvestStat-Africa South Africa CSV.
// Usage: node scripts/extract-harveststat.mjs [path-to-csv]   (downloads the CSV when no path is given)
// Keeps province-level (admin_1) yield rows only, converts mt/ha to kg/ha, drops all month and
// planting columns (HarvestStat's own docs say planting_month is not phenology).
import { readFileSync, writeFileSync } from "node:fs"

const URL_ =
  "https://raw.githubusercontent.com/HarvestStat/HarvestStat-Africa/main/data/crop/adm_crop_production_ZA.csv"
const OUT = new URL("../src/lib/data/harveststat-za.json", import.meta.url)

const csv = process.argv[2]
  ? readFileSync(process.argv[2], "utf8")
  : await fetch(URL_).then((r) => {
      if (!r.ok) throw new Error(`Download failed: ${r.status}`)
      return r.text()
    })

const [head, ...lines] = csv.trim().split(/\r?\n/)
const cols = head.split(",")
const need = (n) => {
  const i = cols.indexOf(n)
  if (i < 0) throw new Error(`Missing column: ${n}`)
  return i
}
const ix = {
  admin1: need("admin_1"),
  admin2: need("admin_2"),
  product: need("product"),
  year: need("harvest_year"),
  indicator: need("indicator"),
  value: need("value"),
}

const rows = []
for (const line of lines) {
  const f = line.split(",")
  if (f.length !== cols.length) throw new Error(`Unexpected field count: ${line.slice(0, 80)}`)
  if (f[ix.indicator] !== "yield" || f[ix.admin2] !== "none") continue
  const mtPerHa = Number(f[ix.value])
  if (!Number.isFinite(mtPerHa) || mtPerHa <= 0) continue
  rows.push({
    province: f[ix.admin1],
    product: f[ix.product],
    year: Number(f[ix.year]),
    kgPerHa: Math.round(mtPerHa * 1000 * 10) / 10,
  })
}
rows.sort(
  (a, b) =>
    a.province.localeCompare(b.province) || a.product.localeCompare(b.product) || a.year - b.year,
)

const keys = new Set(rows.map((r) => `${r.province}|${r.product}|${r.year}`))
if (keys.size !== rows.length) throw new Error("Duplicate province/product/year rows")

writeFileSync(
  OUT,
  JSON.stringify(
    {
      meta: {
        source: "HarvestStat-Africa, South Africa, province level (admin_1), commercial production",
        sourceUrl: URL_,
        licence: "MIT",
        unit: "kg/ha",
        retrievedAt: new Date().toISOString().slice(0, 10),
      },
      rows,
    },
    null,
    0,
  ) + "\n",
)
process.stdout.write(`Wrote ${rows.length} rows\n`)
