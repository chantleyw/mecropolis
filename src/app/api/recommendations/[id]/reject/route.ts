import { transition } from "@/lib/recommendations/http"

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/recommendations/[id]/reject">,
) {
  const { id } = await ctx.params
  return transition(request, id, "rejected")
}
