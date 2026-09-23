import type { Env } from "./env"
import { readCookie, SESSION_COOKIE, verifySessionToken, type Session } from "./session"

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  })
}

export function errorResponse(status: number, message: string): Response {
  return json({ error: message }, status)
}

// CSRF defence in depth on top of SameSite=Strict: a state-changing request must carry an Origin
// header whose host matches the host it was sent to.
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

export async function getSession(request: Request, env: Env): Promise<Session | null> {
  const token = readCookie(request, SESSION_COOKIE)
  return token ? verifySessionToken(env.SESSION_SECRET, token) : null
}

// Cloudflare sets CF-Connecting-IP on every request it proxies. Without it there is no per-client
// rate-limit key, so callers reject the request rather than share one bucket. IPv6 clients usually
// hold a whole /64, so they are keyed on that prefix; otherwise one host could rotate addresses.
export function clientIp(request: Request): string | null {
  const ip = request.headers.get("cf-connecting-ip")
  return ip && ip.includes(":") ? ipv6Prefix64(ip) : ip
}

function ipv6Prefix64(ip: string): string {
  const [head, tail] = ip.toLowerCase().split("::")
  const groups = (part: string | undefined) => (part ? part.split(":") : [])
  // An embedded IPv4 tail (e.g. ::ffff:192.0.2.1) takes two 16-bit groups.
  const width = (parts: string[]) => parts.reduce((n, g) => n + (g.includes(".") ? 2 : 1), 0)
  const h = groups(head)
  const t = groups(tail)
  const full = tail === undefined ? h : [...h, ...Array<string>(8 - width(h) - width(t)).fill("0"), ...t]
  const prefix = full.slice(0, 4).map((g) => parseInt(g, 16).toString(16))
  return `${prefix.join(":")}::/64`
}

export const MAX_JSON_BYTES = 8 * 1024

export type JsonBody = { ok: true; value: unknown } | { ok: false; response: Response }

// Reads a JSON body of at most `maxBytes`. Checks content-type and content-length first, then
// counts bytes while streaming, since content-length can be absent (chunked) or wrong.
export async function readJsonBody(request: Request, maxBytes = MAX_JSON_BYTES): Promise<JsonBody> {
  const type = request.headers.get("content-type") ?? ""
  if (!/^application\/json\s*(;|$)/i.test(type)) {
    return { ok: false, response: errorResponse(415, "Expected content-type application/json") }
  }
  const tooLarge = { ok: false as const, response: errorResponse(413, "Request body too large") }
  const declared = Number(request.headers.get("content-length") ?? "0")
  if (declared > maxBytes) return tooLarge
  if (!request.body) return { ok: false, response: errorResponse(400, "Missing request body") }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      return tooLarge
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) }
  } catch {
    return { ok: false, response: errorResponse(400, "Malformed JSON") }
  }
}
