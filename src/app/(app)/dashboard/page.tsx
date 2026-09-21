import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Aurora } from "@/components/Aurora"
import { chooseFarm } from "@/app/(app)/dashboard/actions"
import { FARM_COOKIE } from "@/lib/dashboard/farmCookie"
import { loadFarms } from "@/lib/sanity/queries"

export const dynamic = "force-dynamic"

export default async function FarmPicker({
  searchParams,
}: {
  searchParams: Promise<{ pick?: string }>
}) {
  if (!(await auth())) redirect("/signin")
  const { pick } = await searchParams
  const farms = await loadFarms()

  if (!pick) {
    const remembered = (await cookies()).get(FARM_COOKIE)?.value
    const target = farms.length === 1 ? farms[0] : farms.find((f) => f.slug === remembered)
    if (target) redirect(`/dashboard/${encodeURIComponent(target.slug)}`)
  }

  return (
    <main>
      <section className="relative overflow-hidden">
        <Aurora />
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">
          <p className="eyebrow">Welcome back</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Which farm would you like to visit today?
          </h1>
          <p className="text-muted mt-1">Pick a farm to open its dashboard.</p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-12 sm:px-6">
        {farms.length === 0 && (
          <p className="card text-muted p-6">
            No farms yet. Run the seed script or add one in the Studio.
          </p>
        )}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {farms.map((f) => (
            <form key={f._id} action={chooseFarm}>
              <input type="hidden" name="farm" value={f.slug} />
              <button
                type="submit"
                className="card card-lift block w-full cursor-pointer overflow-hidden p-0 text-left"
              >
                <span className="from-brand-2 via-sky to-heat block h-2 bg-gradient-to-r" />
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
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  )
}
