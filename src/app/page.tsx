import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { loadFarmOverview } from "@/lib/sanity/queries"

export const dynamic = "force-dynamic"

export default async function Home() {
  if (!(await auth())) redirect("/signin")
  const { farm, fields } = await loadFarmOverview()

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">{farm?.name ?? "Mecropolis"}</h1>
        {farm?.location && <p className="text-sm opacity-70">{farm.location}</p>}
      </header>
      {fields.length === 0 && <p>No fields yet. Run the seed script or add one in the Studio.</p>}
      <ul className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <li
            key={f._id}
            className="rounded border p-4"
            style={f.colour ? { borderLeft: `6px solid ${f.colour}` } : undefined}
          >
            <h2 className="font-medium">{f.name}</h2>
            <p className="text-sm opacity-70">
              {[f.hectares ? `${f.hectares} ha` : null, f.soilType].filter(Boolean).join(", ")}
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {f.seasons.map((s) => (
                <li key={s._id}>
                  <Link className="underline" href={`/seasons/${encodeURIComponent(s._id)}`}>
                    {s.year} {s.cropName ?? "Unknown crop"}
                  </Link>{" "}
                  <span className="opacity-70">({s.stage ?? "planning"})</span>
                </li>
              ))}
              {f.seasons.length === 0 && <li className="opacity-70">No seasons</li>}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  )
}
