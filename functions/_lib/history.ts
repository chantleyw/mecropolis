import type { Env } from "./env"
import { SANITY_API_VERSION } from "./sanity"

// Sanity History API (needs the token, so only Functions call it).
export class HistoryError extends Error {
  constructor(readonly status: number) {
    super(`Sanity History API returned ${status}`)
  }
}

function historyBase(env: Env): string {
  return `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/history/${env.SANITY_DATASET}`
}

export async function historyGet(env: Env, path: string): Promise<string> {
  const res = await fetch(`${historyBase(env)}${path}`, {
    headers: { authorization: `Bearer ${env.SANITY_API_WRITE_TOKEN}` },
  })
  if (!res.ok) throw new HistoryError(res.status)
  return res.text()
}

// The document as it was at `rev`, or null when the History API has no such document.
export async function documentAt(
  env: Env,
  id: string,
  rev: string,
): Promise<Record<string, unknown> | null> {
  const { documents } = JSON.parse(
    await historyGet(env, `/documents/${id}?revision=${encodeURIComponent(rev)}`),
  ) as { documents: Record<string, unknown>[] }
  return documents[0] ?? null
}
