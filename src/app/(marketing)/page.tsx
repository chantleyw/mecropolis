import Link from "next/link"
import { Badge, Section, STAGE_LABEL, STAGE_TONE } from "@/components/ui"
import { CROP_MODELS } from "@/lib/agronomy/cropModel"
import { STAGES } from "@/lib/workflow/types"

const STEPS = [
  {
    n: "1",
    title: "Record what the farmer knows",
    body: "Farms, fields, crops and a planting date live in Sanity. That is the only input the season needs.",
  },
  {
    n: "2",
    title: "Fetch the weather that happened",
    body: "Daily temperatures for the field's coordinates come from the Open-Meteo archive, from planting to today.",
  },
  {
    n: "3",
    title: "Accumulate degree days, derive the stage",
    body: "Growing degree days (GDD) build up against the crop's model. A reconciler walks the stage machine when a threshold is crossed and records the evidence.",
  },
]

const HONESTY = [
  {
    title: "Yield is never invented",
    body: "Nothing in the system writes a field's yield. Until someone records one, the app says “Not recorded”.",
  },
  {
    title: "Benchmarks stay benchmarks",
    body: "Regional and national statistics sit in their own documents, labelled with source and unit, and are never turned into a ratio or percentage against a field.",
  },
  {
    title: "Pests are regional, and say so",
    body: "GBIF occurrence records are shown as sightings within 100 km, with the distance. They are not observations on the field.",
  },
  {
    title: "Weather is live",
    body: "Temperatures come from the Open-Meteo archive at request time. There is no bundled or synthetic weather data.",
  },
]

const SOURCES = [
  {
    name: "Open-Meteo",
    use: "Daily temperature archive, forecast and climate projections",
    href: "https://open-meteo.com",
  },
  {
    name: "SoilGrids",
    use: "Sand, silt and clay fractions converted to a texture class",
    href: "https://soilgrids.org",
  },
  {
    name: "GBIF",
    use: "Species occurrence records within a radius of the farm",
    href: "https://www.gbif.org",
  },
  {
    name: "USDA FAS PSD",
    use: "National production, supply and distribution series",
    href: "https://apps.fas.usda.gov/psdonline",
  },
  {
    name: "HarvestStat Africa",
    use: "Sub-national crop statistics for South African provinces",
    href: "https://github.com/HarvestStat/HarvestStat-Africa",
  },
  {
    name: "World Bank",
    use: "National cereal yield indicator, kg per hectare",
    href: "https://data.worldbank.org",
  },
]

export default function Landing() {
  const models = Object.entries(CROP_MODELS)
  const maxGdd = Math.max(...models.map(([, m]) => m.gddToMaturity))

  return (
    <main>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-[28rem] opacity-70"
          style={{
            background: "radial-gradient(60% 60% at 50% 0%, var(--brand-soft), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28">
          <Badge tone="brand">DEV.to Sanity challenge entry</Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            The season stage comes from the weather, not from a form.
          </h1>
          <p className="text-muted mt-5 max-w-2xl text-lg text-pretty">
            Mecropolis tracks Western Cape fields by accumulating growing degree days from live
            weather, and keeps published yield statistics clearly apart from what a field actually
            produced.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn btn-primary !px-5 !py-2.5">
              Open the dashboard
            </Link>
            <Link href="/docs" className="btn !px-5 !py-2.5">
              Read the docs
            </Link>
          </div>
          <ol
            className="mt-14 flex flex-wrap items-center gap-2 text-sm"
            aria-label="Season stages"
          >
            {STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <Badge tone={STAGE_TONE[s]}>{STAGE_LABEL[s]}</Badge>
                {i < STAGES.length - 1 && (
                  <span aria-hidden className="text-muted">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-20 px-4 sm:px-6">
        <section aria-labelledby="problem" className="grid gap-6 md:grid-cols-2 md:gap-12">
          <h2 id="problem" className="text-3xl font-semibold tracking-tight text-balance">
            Farm records drift from reality, and benchmarks flatter them.
          </h2>
          <p className="text-muted text-lg text-pretty">
            Stage is usually typed in by hand and goes stale. Regional yield figures get placed next
            to a single field&apos;s numbers as if they were comparable. Mecropolis derives the
            first from evidence and refuses to do the second.
          </p>
        </section>

        <section id="how" aria-labelledby="how-title" className="scroll-mt-20">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="mt-2 text-3xl font-semibold tracking-tight">
            Three steps from planting date to stage
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="card p-6">
                <span className="bg-brand-soft text-brand grid h-8 w-8 place-items-center rounded-full text-sm font-bold">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="text-muted mt-2 text-sm">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="models">
          <Section title="Crop models in use" aside={<Badge tone="warn">Not validated</Badge>}>
            <p id="models" className="text-muted mb-5 text-sm">
              Degree days needed to reach thermal maturity, read straight from the model constants
              in the code.
            </p>
            <ul className="space-y-4">
              {models.map(([name, m]) => (
                <li key={name}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium capitalize">{name}</span>
                    <span className="text-muted tabular-nums">
                      base {m.baseTempC} °C · {m.gddToMaturity.toLocaleString("en-US")} GDD
                    </span>
                  </div>
                  <span className="bg-line mt-1.5 block h-2.5 rounded-full">
                    <span
                      className="bg-brand block h-2.5 rounded-full"
                      style={{ width: `${(m.gddToMaturity / maxGdd) * 100}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted mt-5 text-xs">
              These parameters are hand-authored and their citations are still pending. They are
              modelling assumptions, not measured values for any field.
            </p>
          </Section>
        </section>

        <section aria-labelledby="honesty">
          <p className="eyebrow">Data honesty</p>
          <h2 id="honesty" className="mt-2 text-3xl font-semibold tracking-tight">
            Four rules the app will not break
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {HONESTY.map((h) => (
              <li key={h.title} className="card p-6">
                <h3 className="font-semibold">{h.title}</h3>
                <p className="text-muted mt-2 text-sm">{h.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sources">
          <p className="eyebrow">Data sources</p>
          <h2 id="sources" className="mt-2 text-3xl font-semibold tracking-tight">
            Public data, attributed
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOURCES.map((s) => (
              <li key={s.name} className="card p-5">
                <a
                  href={s.href}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="font-semibold hover:underline"
                >
                  {s.name} ↗
                </a>
                <p className="text-muted mt-1.5 text-sm">{s.use}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="card bg-brand-soft p-8 text-center sm:p-12">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            See a season reason its way to a stage
          </h2>
          <p className="text-muted mx-auto mt-3 max-w-xl">
            Sign in to the demo dashboard to open a season, read its GDD curve and reconcile it
            against live weather.
          </p>
          <Link href="/dashboard" className="btn btn-primary mt-6 !px-5 !py-2.5">
            Open the dashboard
          </Link>
        </section>
      </div>
    </main>
  )
}
