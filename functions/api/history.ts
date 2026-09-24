import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv, type Env } from "../_lib/env"
import { docId, errorResponse, guard, json } from "../_lib/http"
import { readClient, SANITY_API_VERSION } from "../_lib/sanity"

const allow = createRateLimiter(30, 60_000)
// Each entry costs one extra History API call (the document at that revision); Workers allow 50
// subrequests per invocation.
const LIMIT = 12

// The field each type's timeline shows at every revision.
const STATE_FIELD: Record<string, string> = {
  season: "stage",
  agronomyRecommendation: "status",
}

type Transaction = {
  id: string
  timestamp: string
  mutations: Record<string, unknown>[]
}

export type HistoryEntry = {
  rev: string
  timestamp: string
  action: "created" | "updated" | "deleted"
  state: string | null
}

function actionOf(tx: Transaction): HistoryEntry["action"] {
  const kinds = tx.mutations.flatMap((m) => Object.keys(m))
  if (kinds.includes("delete")) return "deleted"
  if (kinds.some((k) => k.startsWith("create"))) return "created"
  return "updated"
}

function historyBase(env: Env): string {
  return `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/history/${env.SANITY_DATASET}`
}

async function historyGet(env: Env, path: string): Promise<string> {
  const res = await fetch(`${historyBase(env)}${path}`, {
    headers: { authorization: `Bearer ${env.SANITY_API_WRITE_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Sanity History API returned ${res.status}`)
  return res.text()
}

// Audit timeline of a season or recommendation from the Sanity History API (token only, so it
// runs here). Newest first; each entry carries the stage or status at that revision. Authors are
// not returned: every write uses the same token, and who acted is recorded on the document.
export const onRequestGet: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const guarded = await guard(request, env, allow, { write: false })
  if (!guarded.ok) return guarded.response

  const id = docId.safeParse(new URL(request.url).searchParams.get("id"))
  if (!id.success) return errorResponse(400, "Expected ?id=<document id>")

  const type = await readClient(env).fetch<string | null>(`*[_id == $id][0]._type`, {
    id: id.data,
  })
  const field = type ? STATE_FIELD[type] : undefined
  if (!field) return errorResponse(404, "No history for this document")

  let entries: HistoryEntry[]
  try {
    const ndjson = await historyGet(
      env,
      `/transactions/${id.data}?excludeContent=true&reverse=true&limit=${LIMIT}`,
    )
    const transactions = ndjson
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as Transaction)

    entries = await Promise.all(
      transactions.map(async (tx) => {
        const action = actionOf(tx)
        let state: string | null = null
        if (action !== "deleted") {
          const { documents } = JSON.parse(
            await historyGet(env, `/documents/${id.data}?revision=${tx.id}`),
          ) as { documents: Record<string, unknown>[] }
          const value = documents[0]?.[field]
          state = typeof value === "string" ? value : null
        }
        return { rev: tx.id, timestamp: tx.timestamp, action, state }
      }),
    )
  } catch (e) {
    return errorResponse(502, e instanceof Error ? e.message : "Sanity History API failed")
  }
  return json({ entries })
}
