import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Badge, STAGE_LABEL, STAGE_TONE, Stat } from "@/components/ui"
import { loadFarmOverview } from "@/lib/sanity/queries"

export const dynamic = "force-dynamic"

export default async function Home() {
  if (!(await auth())) redirect("/signin")
  const { farm, fields } = await loadFarmOverview()

  const hectares = fields.reduce((sum, f) => sum + (f.hectares ?? 0), 0)
  const seasons = fields.flatMap((f) => f.seasons)
  const active = seasons.filter((s) => s.stage !== "review").length

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <p className="eyebrow">Farm overview</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{farm?.name ?? "Mecropolis"}</h1>
        {farm?.location && <p className="text-muted mt-1">{farm.location}</p>}
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Fields" value={fields.length} />
        <Stat label="Hectares" value={hectares.toLocaleString("en-US")} />
        <Stat label="Active seasons" value={active} hint={`${seasons.length} total`} />
      </div>

      {fields.length === 0 && (
        <p className="card text-muted p-6">
          No fields yet. Run the seed script or add one in the Studio.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <article key={f._id} className="card overflow-hidden">
            <div className="h-1.5" style={{ background: f.colour ?? "var(--brand)" }} />
            <div className="p-5">
              <h2 className="text-lg font-semibold">{f.name}</h2>
              <p className="text-muted text-sm">
                {[f.hectares ? `${f.hectares} ha` : null, f.soilType].filter(Boolean).join(" · ")}
              </p>
              <ul className="divide-line mt-4 divide-y">
                {f.seasons.map((s) => {
                  const stage = s.stage ?? "planning"
                  return (
                    <li key={s._id}>
                      <Link
                        href={`/seasons/${encodeURIComponent(s._id)}`}
                        className="hover:bg-surface-2 -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5"
                      >
                        <span className="font-medium">
                          {s.cropName ?? "Unknown crop"}{" "}
                          <span className="text-muted font-normal">{s.year}</span>
                        </span>
                        <Badge tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage] ?? stage}</Badge>
                      </Link>
                    </li>
                  )
                })}
                {f.seasons.length === 0 && (
                  <li className="text-muted py-2.5 text-sm">No seasons</li>
                )}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}
