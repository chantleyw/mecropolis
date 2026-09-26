import { scheduledEventHandler } from "@sanity/functions"

const ADVANCE_URL = "https://mecropolis.pages.dev/api/advance"

// Nightly walk of every season: the scheduler form of /api/advance (bearer token, no seasonId).
// A failed call throws so it shows in the stack logs.
export const handler = scheduledEventHandler(async () => {
  const secret = process.env.CRON_SECRET
  if (!secret) throw new Error("CRON_SECRET is not set on this function")

  const response = await fetch(ADVANCE_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({}),
  })
  if (!response.ok) {
    throw new Error(`/api/advance returned ${response.status}: ${await response.text()}`)
  }
})
