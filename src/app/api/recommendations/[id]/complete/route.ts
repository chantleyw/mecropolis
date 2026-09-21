import { transition } from "@/lib/recommendations/http"

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/recommendations/[id]/complete">,
) {
  const { id } = await ctx.params
  return transition(request, id, "completed")
}
