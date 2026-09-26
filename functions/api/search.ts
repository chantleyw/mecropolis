import type { SanityClient } from "@sanity/client"
import { z } from "zod"

import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv } from "../_lib/env"
import { errorResponse, guard, issues, json } from "../_lib/http"
import { isRevisionConflict, writeClient } from "../_lib/sanity"

const allow = createRateLimiter(10, 60_000)
// Dataset Embeddings queries share an org-wide quota (Free: 500/month). The per-IP limiter is per
// isolate, so Sanity holds a global daily count: 15/day stays under 500 in a 31-day month.
export const SEARCHES_PER_DAY = 15
export const SEARCH_COUNTER_ID = "rate-search-queries"

const params = z.object({
  q: z.string().trim().min(3, "query must be at least 3 characters").max(200),
  farm: z.string().regex(/^[a-z0-9-]{1,96}$/, "invalid farm slug"),
})

export type SearchHit = {
  _id: string
  _type: "observation" | "treatment"
  date: string | null
  text: string | null
  product: string | null
  seasonId: string | null
  seasonLabel: string | null
  fieldName: string | null
}

// Records one search in the counter document under ifRevisionID, so concurrent searches cannot
// overshoot the cap. Returns false when today's cap is reached. A 409 means another search moved
// the counter first; retry a few times.
async function reserveSearch(client: SanityClient): Promise<boolean> {
  for (let attempt = 1; ; attempt++) {
    try {
      const since = Date.now() - 86_400_000
      const counter = await client.fetch<{ _rev: string; writes: string[] | null } | null>(
        `*[_id == $id][0]{ _rev, writes }`,
        { id: SEARCH_COUNTER_ID },
      )
      const recent = (counter?.writes ?? []).filter((t) => Date.parse(t) > since)
      if (recent.length >= SEARCHES_PER_DAY) return false
      const writes = [...recent, new Date().toISOString()]
      await (counter
        ? client.patch(SEARCH_COUNTER_ID).ifRevisionId(counter._rev).set({ writes }).commit()
        : client.create({ _id: SEARCH_COUNTER_ID, _type: "writeCounter", writes }))
      return true
    } catch (e) {
      if (attempt >= 3 || !isRevisionConflict(e)) throw e
    }
  }
}

// Semantic search over one farm's observations and treatments with Dataset Embeddings
// (text::semanticSimilarity over the embedded notes and product). Signed-in only and capped, so
// the org quota is not drained through this app.
export const onRequestGet: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const authz = await guard(request, env, allow, { write: false })
  if (!authz.ok) return authz.response
  const url = new URL(request.url)
  const parsed = params.safeParse({
    q: url.searchParams.get("q") ?? "",
    farm: url.searchParams.get("farm"),
  })
  if (!parsed.success) return errorResponse(400, issues(parsed.error))

  const client = writeClient(env)
  if (!(await reserveSearch(client))) {
    return errorResponse(429, "Search limit reached for today, try again tomorrow")
  }
  const hits = await client.fetch<SearchHit[]>(
    `*[_type in ["observation", "treatment"]
        && coalesce(field->farm->slug.current, season->field->farm->slug.current) == $farm]
      | score(text::semanticSimilarity($q))
      | order(_score desc)[0...10]{
      _id, _type, date,
      "text": notes,
      "product": select(_type == "treatment" => product, null),
      "seasonId": season._ref,
      "seasonLabel": season->crop->name + " " + string(season->year),
      "fieldName": coalesce(field->name, season->field->name)
    }`,
    { q: parsed.data.q, farm: parsed.data.farm },
    { perspective: "published" },
  )
  return json({ hits })
}
