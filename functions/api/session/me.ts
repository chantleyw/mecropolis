import { parseEnv } from "../../_lib/env"
import { getSession, json } from "../../_lib/http"

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const session = await getSession(request, parseEnv(env))
  return json(session ? { user: session.user } : { user: null })
}
