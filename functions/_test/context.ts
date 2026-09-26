import { createSessionToken, SESSION_COOKIE } from "../_lib/session"

// Test helpers: a valid env, a signed session cookie, and a Pages Function context.

export const env = {
  SANITY_PROJECT_ID: "test",
  SANITY_DATASET: "test",
  SANITY_API_WRITE_TOKEN: "token",
  SESSION_SECRET: "s".repeat(32),
  DEMO_USER: "demo",
  DEMO_PASSWORD: "pw",
  CRON_SECRET: "c".repeat(32),
}

export const SITE = "https://mecropolis.pages.dev"

export async function sessionCookie(user = "demo"): Promise<string> {
  return `${SESSION_COOKIE}=${await createSessionToken(env.SESSION_SECRET, user)}`
}

export function request(
  path: string,
  {
    method = "GET",
    body,
    headers = {},
  }: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Request {
  return new Request(`${SITE}${path}`, {
    method,
    headers: {
      "cf-connecting-ip": "203.0.113.7",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function run<P extends string>(
  fn: PagesFunction<unknown, P>,
  req: Request,
  params: Record<P, string> = {} as Record<P, string>,
): Promise<Response> {
  const context = { request: req, env, params }
  return Promise.resolve(
    fn(context as unknown as EventContext<unknown, P, Record<string, unknown>>),
  )
}
