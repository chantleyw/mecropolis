import { Link } from "react-router"

import { Badge, Section, STAGE_LABEL, STAGE_TONE } from "@/components/ui"
import { Aurora } from "@/components/Aurora"
import { LiveConditions } from "@/components/LiveConditions"
import { YieldPanel } from "@/components/YieldPanel"
import { CROP_MODELS } from "@/lib/agronomy/cropModel"
import { Failed, Loading } from "@/components/States"
import { api } from "@/lib/api"
import type { Landing as LandingData } from "@/lib/public/landingData"
import { useAsync } from "@/lib/useAsync"
import { useTitle } from "@/lib/useTitle"
import { STAGES } from "@/lib/workflow/types"

const STEPS = [
  {
    n: "1",
    title: "Record what the farmer knows",
    body: "Farms, fields, crops and planting dates are stored in Sanity.",
  },
  {
    n: "2",
    title: "Fetch the weather that happened",
    body: "Daily temperatures for the field's coordinates come from the Open-Meteo archive, from planting to today.",
  },
  {
    n: "3",
    title: "Accumulate degree days",
    body: "Growing degree days (GDD) are summed against the crop model. When a threshold is crossed, the reconciler moves the season to the next stage and records the basis.",
  },
]

const HONESTY = [
  {
    title: "Yield is entered by the operator",
    body: "Until an operator records a yield, the app shows “Not recorded”.",
  },
  {
    title: "Benchmarks are separate records",
    body: "Regional and national statistics are stored in their own documents with source and unit. They are not compared with a field's yield.",
  },
  {
    title: "Pest records are regional",
    body: "GBIF occurrence records are shown as sightings within 100 km, with the distance.",
  },
  {
    title: "Weather is live",
    body: "Temperatures are fetched from the Open-Meteo archive at request time.",
  },
]

// Weather, soil, pests and yields come from functions/api/landing.ts (PSD needs a server key).
const fetchLanding = () => api<LandingData>("/api/landing")

export function Landing() {
  useTitle(null)
  const landing = useAsync(fetchLanding, {})
  const models = Object.entries(CROP_MODELS)
  const maxGdd = Math.max(...models.map(([, m]) => m.gddToMaturity))

  return (
    <main>
      <section className="relative overflow-hidden">
        <Aurora />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28">
          <Badge tone="brand">Western Cape · live agronomy</Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Track field seasons by growing degree days
          </h1>
          <p className="text-muted mt-5 max-w-2xl text-lg text-pretty">
            Mecropolis calculates the growth stage of Western Cape fields from live temperature data
            and lists published yield statistics separately.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/dashboard" className="btn btn-primary !px-5 !py-2.5">
              Open the dashboard
            </Link>
            <Link to="/docs" className="btn !px-5 !py-2.5">
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

      <div className="mx-auto max-w-6xl space-y-20 px-4 pt-16 sm:px-6">
        <section aria-labelledby="problem">
          <p className="eyebrow">The problem</p>
          <h2 id="problem" className="mt-2 text-3xl font-semibold tracking-tight">
            Stage records go out of date
          </h2>
          <p className="text-muted mt-3 max-w-2xl text-lg text-pretty">
            Stage is usually entered by hand and is only as current as the last update.
          </p>
        </section>

        <section id="how" aria-labelledby="how-title" className="scroll-mt-20">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="mt-2 text-3xl font-semibold tracking-tight">
            From planting date to stage
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

        <section>
          <Section title="Crop models in use" aside={<Badge tone="warn">Not validated</Badge>}>
            <p className="text-muted mb-5 text-sm">Degree days needed to reach thermal maturity.</p>
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
              These parameters are hand-authored and have no citations yet.
            </p>
          </Section>
        </section>

        <section aria-labelledby="honesty">
          <p className="eyebrow">Data rules</p>
          <h2 id="honesty" className="mt-2 text-3xl font-semibold tracking-tight">
            How data is handled
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

        <section aria-labelledby="live">
          <p className="eyebrow">Live data</p>
          <h2 id="live" className="mt-2 text-3xl font-semibold tracking-tight">
            Live conditions
          </h2>
          <p className="text-muted mt-3 max-w-2xl">
            Readings for the demo farm&apos;s region from public sources, refreshed every 30
            minutes.
          </p>
          <div className="mt-8">
            {landing.status === "ready" ? (
              <LiveConditions
                site={landing.data.site}
                radiusKm={landing.data.radiusKm}
                weather={landing.data.weather}
                soil={landing.data.soil}
                pests={landing.data.pests}
              />
            ) : landing.status === "error" ? (
              <Failed what="live conditions" error={landing.error} />
            ) : (
              <Loading what="live conditions" />
            )}
          </div>
        </section>

        <section aria-labelledby="yields">
          <p className="eyebrow">Regional yield statistics</p>
          <h2 id="yields" className="mt-2 text-3xl font-semibold tracking-tight">
            Published benchmarks
          </h2>
          <div className="mt-8">
            {landing.status === "ready" ? (
              <YieldPanel yields={landing.data.yields} />
            ) : landing.status === "error" ? (
              <Failed what="yield statistics" error={landing.error} />
            ) : (
              <Loading what="yield statistics" />
            )}
          </div>
        </section>

        <section className="card bg-brand-soft p-8 text-center sm:p-12">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">Open a season</h2>
          <p className="text-muted mx-auto mt-3 max-w-xl">
            Sign in to the demo dashboard to view a season&apos;s GDD curve and reconcile its stage.
          </p>
          <Link to="/dashboard" className="btn btn-primary mt-6 !px-5 !py-2.5">
            Open the dashboard
          </Link>
        </section>
      </div>
    </main>
  )
}
