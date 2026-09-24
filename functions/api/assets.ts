import { z } from "zod"

import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv } from "../_lib/env"
import { docId, errorResponse, guard, issues, json, readBytesBody } from "../_lib/http"
import { writeClient } from "../_lib/sanity"

const allow = createRateLimiter(10, 60_000)
// Global cap across isolates, counted in Sanity: uploads grow the dataset and the demo login is
// published. Check-then-upload can overshoot by the number of concurrent requests.
const UPLOADS_PER_HOUR = 20
const MAX_BYTES = 5 * 1024 * 1024

// Magic bytes per accepted type, so the declared content-type must match the file.
const SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v),
  "image/webp": (b) =>
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP",
}

const focus = z.coerce.number().min(0).max(1).default(0.5)
const querySchema = z.object({ fieldId: docId, x: focus, y: focus })

// Hotspot size around the operator's focus point; image-url crops toward it.
const HOTSPOT_SIZE = 0.4

// Field photo upload. The body is the image itself; ?fieldId= names the field and ?x=&y= the
// focus point (0-1). Sanity extracts LQIP and palette on upload. The new photo replaces the old
// one and the old asset is deleted in the same transaction.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const guarded = await guard(request, env, allow, { write: true })
  if (!guarded.ok) return guarded.response

  const url = new URL(request.url)
  const query = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!query.success) return errorResponse(400, issues(query.error))

  const type = (request.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? ""
  const matches = SIGNATURES[type]
  if (!matches) return errorResponse(415, "Upload a JPEG, PNG or WebP image")

  const body = await readBytesBody(request, MAX_BYTES)
  if (!body.ok) return body.response
  if (!matches(body.value)) return errorResponse(415, "File content does not match its type")

  const client = writeClient(env)
  const { field, recent } = await client.fetch<{
    field: { _id: string; oldAsset: string | null } | null
    recent: number
  }>(
    `{
      "field": *[_type == "field" && _id == $id][0]{ _id, "oldAsset": photo.asset._ref },
      "recent": count(*[_type == "photoUpload" && dateTime(_createdAt) > dateTime($since)])
    }`,
    { id: query.data.fieldId, since: new Date(Date.now() - 3_600_000).toISOString() },
  )
  if (!field) return errorResponse(404, "Unknown field")
  if (recent >= UPLOADS_PER_HOUR) {
    return errorResponse(429, "Photo upload limit reached for this hour, try again later")
  }
  // The cap counts these log documents, not image assets: replacing a photo deletes the old
  // asset, which would otherwise drop out of the count.
  await client.create({
    _id: `photoUpload-${crypto.randomUUID()}`,
    _type: "photoUpload",
    field: { _type: "reference", _ref: field._id, _weak: true },
    user: guarded.user,
  })

  const asset = await client.assets.upload("image", new Blob([body.value], { type }), {
    filename: `field-${field._id}`,
    contentType: type,
    extract: ["lqip", "palette"],
  })

  const half = HOTSPOT_SIZE / 2
  const tx = client.transaction().patch(field._id, (p) =>
    p.set({
      photo: {
        _type: "image",
        asset: { _type: "reference", _ref: asset._id },
        hotspot: {
          _type: "sanity.imageHotspot",
          x: Math.min(1 - half, Math.max(half, query.data.x)),
          y: Math.min(1 - half, Math.max(half, query.data.y)),
          width: HOTSPOT_SIZE,
          height: HOTSPOT_SIZE,
        },
      },
    }),
  )
  if (field.oldAsset && field.oldAsset !== asset._id) tx.delete(field.oldAsset)
  await tx.commit()

  return json({ assetId: asset._id }, 201)
}
