import { Link, Navigate, useSearchParams } from "react-router"

import { Failed, Loading } from "@/components/States"
import { rememberedFarm, rememberFarm } from "@/lib/dashboard/farmChoice"
import { loadFarms } from "@/lib/sanity/queries"
import { useLive } from "@/lib/sanity/useLive"
import { useTitle } from "@/lib/useTitle"

const NO_PARAMS = {}

export function FarmPicker() {
  useTitle("Choose a farm")
  const [params] = useSearchParams()
  const farms = useLive(loadFarms, NO_PARAMS)

  if (farms.status === "ready" && !params.has("pick")) {
    const remembered = rememberedFarm()
    const list = farms.data
    const target = list.length === 1 ? list[0] : list.find((f) => f.slug === remembered)
    if (target) return <Navigate to={`/dashboard/${encodeURIComponent(target.slug)}`} replace />
  }

  return (
    <main>
      <section className="border-line bg-surface border-b">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Which farm would you like to visit today?
          </h1>
          <p className="text-muted mt-1">Pick a farm to open its dashboard.</p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-12 sm:px-6">
        {farms.status === "loading" && <Loading what="farms" />}
        {farms.status === "error" && <Failed what="farms" error={farms.error} />}
        {farms.status === "ready" && farms.data.length === 0 && (
          <p className="card text-muted p-6">No farms yet. Run the seed script to add them.</p>
        )}
        {farms.status === "ready" && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {farms.data.map((f) => (
              <Link
                key={f._id}
                to={`/dashboard/${encodeURIComponent(f.slug)}`}
                onClick={() => rememberFarm(f.slug)}
                className="card hover:border-ink block overflow-hidden p-0"
              >
                <span className="block p-6">
                  <span className="eyebrow block">{f.location ?? "Location not set"}</span>
                  <span className="mt-1 block text-xl font-semibold tracking-tight">{f.name}</span>
                  <span className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <span>
                      <span className="block text-2xl font-semibold tabular-nums">
                        {f.fieldCount}
                      </span>
                      <span className="text-muted text-xs">Fields</span>
                    </span>
                    <span>
                      <span className="block text-2xl font-semibold tabular-nums">
                        {Math.round(f.hectares).toLocaleString("en-US")}
                      </span>
                      <span className="text-muted text-xs">Hectares</span>
                    </span>
                    <span>
                      <span className="block text-2xl font-semibold tabular-nums">
                        {f.activeSeasons}
                      </span>
                      <span className="text-muted text-xs">Active seasons</span>
                    </span>
                  </span>
                  <span className="btn btn-primary mt-6">Open dashboard</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
