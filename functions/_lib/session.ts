import { z } from "zod"

import { base64url, fromBase64url, hmacSign, hmacVerify } from "./crypto"

export const SESSION_COOKIE = "mecro_session"
export const SESSION_TTL_SECONDS = 8 * 60 * 60

const payloadSchema = z.object({ u: z.string().min(1), exp: z.number().int() })
export type Session = { user: string; expiresAt: number }

export async function createSessionToken(secret: string, user: string, nowMs = Date.now()): Promise<string> {
  const payload = { u: user, exp: Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS }
  const body = base64url(new TextEncoder().encode(JSON.stringify(payload)))
  return `${body}.${await hmacSign(secret, body)}`
}

export async function verifySessionToken(
  secret: string,
  token: string,
  nowMs = Date.now(),
): Promise<Session | null> {
  const [body, sig, extra] = token.split(".")
  if (!body || !sig || extra !== undefined) return null
  if (!(await hmacVerify(secret, body, sig))) return null
  let json: unknown
  try {
    json = JSON.parse(new TextDecoder().decode(fromBase64url(body)))
  } catch {
    return null // signed by us, so this only happens if the format changes; reject
  }
  const parsed = payloadSchema.safeParse(json)
  if (!parsed.success || parsed.data.exp * 1000 <= nowMs) return null
  return { user: parsed.data.u, expiresAt: parsed.data.exp * 1000 }
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=")
    if (k === name) return v.join("=")
  }
  return null
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
}
