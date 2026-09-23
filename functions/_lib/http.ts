import { z } from "zod"

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
// A malformed address also returns null.
export function clientIp(request: Request): string | null {
  const ip = request.headers.get("cf-connecting-ip")
  return ip && ip.includes(":") ? ipv6Key(ip.toLowerCase()) : ip
}

const HEXTET = /^[0-9a-f]{1,4}$/
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

function ipv6Key(ip: string): string | null {
  const halves = ip.split("::")
  if (halves.length > 2) return null
  const parts = (half: string | undefined) => (half ? half.split(":") : [])
  const head = parts(halves[0])
  const tail = parts(halves[1])
  // An IPv4-mapped address (::ffff:192.0.2.1) is an IPv4 client; key it as one.
  const last = tail.at(-1) ?? ""
  if (IPV4.test(last)) {
    return head.length === 0 && tail.length === 2 && tail[0] === "ffff" ? last : null
  }
  if (![...head, ...tail].every((g) => HEXTET.test(g))) return null
  const missing = 8 - head.length - tail.length
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null
  const full = [...head, ...Array<string>(missing).fill("0"), ...tail]
  return `${full
    .slice(0, 4)
    .map((g) => parseInt(g, 16).toString(16))
    .join(":")}::/64`
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

export type Guarded = { ok: true; user: string } | { ok: false; response: Response }

// Checks shared by signed-in Functions: a valid session and a per-IP rate limit. State-changing
// requests (`write`) must also be same-origin.
export async function guard(
  request: Request,
  env: Env,
  allow: (key: string) => boolean,
  { write }: { write: boolean },
): Promise<Guarded> {
  const fail = (status: number, message: string): Guarded => ({
    ok: false,
    response: errorResponse(status, message),
  })
  if (write && !sameOrigin(request)) return fail(403, "Cross-origin request rejected")
  const session = await getSession(request, env)
  if (!session) return fail(401, "Sign in required")
  const ip = clientIp(request)
  if (!ip) return fail(400, "Missing client address")
  if (!allow(ip)) return fail(429, "Too many requests, slow down")
  return { ok: true, user: session.user }
}

export const issues = (error: { issues: { message: string; path: PropertyKey[] }[] }) =>
  error.issues
    .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
    .join("; ")

// Sanity document id as accepted from clients. No dots: dotted ids are drafts or sub-path docs.
export const docId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, "invalid document id")
