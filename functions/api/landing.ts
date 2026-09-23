import { z } from "zod"

import { loadLanding } from "../../src/lib/public/landingData"
import { json } from "../_lib/http"

const keySchema = z.object({ FAS_API_KEY: z.string().min(1) })

// Public landing data for the fixed demo site. Runs here rather than in the browser because USDA
// PSD needs FAS_API_KEY; the loaders cache in memory per isolate for 30 minutes and the response
// may be cached by browsers for 5.
export const onRequestGet: PagesFunction = async ({ env }) => {
  const key = keySchema.safeParse(env)
  const data = await loadLanding(key.success ? key.data.FAS_API_KEY : null)
  return json(data, 200, { "cache-control": "public, max-age=300" })
}
