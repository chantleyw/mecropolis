import { errorResponse, json, sameOrigin } from "../../_lib/http"
import { clearedSessionCookie } from "../../_lib/session"

export const onRequestPost: PagesFunction = async ({ request }) => {
  if (!sameOrigin(request)) return errorResponse(403, "Cross-origin request rejected")
  return json({ ok: true }, 200, { "set-cookie": clearedSessionCookie() })
}
