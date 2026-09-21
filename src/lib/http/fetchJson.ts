import type { z } from "zod"

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = "HttpError"
  }
}

interface Options {
  timeoutMs?: number
  headers?: Record<string, string>
}

// Typed GET: timeout, one retry on 5xx or network failure, response validated by Zod.
export async function fetchJson<T>(
  url: string,
  schema: z.ZodType<T>,
  { timeoutMs = 8000, headers }: Options = {},
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response
    try {
      res = await fetch(url, {
        headers: { accept: "application/json", ...headers },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      })
    } catch (e) {
      lastError = new HttpError(`Request failed: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }
    if (res.status >= 500) {
      lastError = new HttpError(`Upstream error ${res.status}`, res.status)
      continue
    }
    if (!res.ok) throw new HttpError(`Upstream returned ${res.status}`, res.status)
    const body: unknown = await res.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      throw new HttpError(`Unexpected response shape: ${parsed.error.issues[0]?.message ?? ""}`)
    }
    return parsed.data
  }
  throw lastError
}
