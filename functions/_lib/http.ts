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

export function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown"
}
