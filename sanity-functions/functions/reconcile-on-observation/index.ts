import { documentEventHandler } from "@sanity/functions"

const ADVANCE_URL = "https://mecropolis.pages.dev/api/advance"

// Reconciles the season of a newly created observation, treatment or weather snapshot via the Pages
// Function, so the Open-Meteo fetch, guards and transaction stay in one place. The blueprint's
// projection is { "seasonId": season._ref }. A failed call throws so it shows in the stack logs.
export const handler = documentEventHandler<{ seasonId?: string | null }>(async ({ event }) => {
  const seasonId = event.data.seasonId
  if (!seasonId) return
  const secret = process.env.CRON_SECRET
  if (!secret) throw new Error("CRON_SECRET is not set on this function")

  const response = await fetch(ADVANCE_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ seasonId }),
  })
  if (!response.ok) {
    throw new Error(`/api/advance returned ${response.status}: ${await response.text()}`)
  }
})
