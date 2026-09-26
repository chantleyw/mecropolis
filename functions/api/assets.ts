import { z } from "zod"

import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv } from "../_lib/env"
import { docId, errorResponse, guard, issues, json, readBytesBody } from "../_lib/http"
import { writeClient } from "../_lib/sanity"

const allow = createRateLimiter(10, 60_000)
// Global cap across isolates, counted in Sanity: uploads grow the dataset and the demo login is
// published. Check-then-upload can overshoot by the number of concurrent requests.
const UPLOADS_PER_HOUR = 20

type Signature = (b: Uint8Array) => boolean

// Per upload kind: the accepted types with their magic bytes (so the declared content-type must
// match the file), the size cap and the 415 message.
const KINDS = {
  photo: {
    maxBytes: 5 * 1024 * 1024,
    refuse: "Upload a JPEG, PNG or WebP image",
    signatures: {
      "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
      "image/png": (b) =>
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v),
      "image/webp": (b) =>
        String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...b.slice(8, 12)) === "WEBP",
    } as Record<string, Signature>,
  },
  soilReport: {
    maxBytes: 10 * 1024 * 1024,
    refuse: "Upload a PDF",
    signatures: {
      "application/pdf": (b) => String.fromCharCode(...b.slice(0, 5)) === "%PDF-",
    } as Record<string, Signature>,
  },
}

const focus = z.coerce.number().min(0).max(1).default(0.5)
const querySchema = z.object({
  fieldId: docId,
  kind: z.enum(["photo", "soilReport"]).default("photo"),
  x: focus,
  y: focus,
  // Shown as the download name; plain characters only.
  name: z
    .string()
    .regex(/^[\w .()-]{1,96}\.pdf$/i, "Use a plain file name ending in .pdf")
    .default("soil-report.pdf"),
})

// Hotspot size around the operator's focus point; image-url crops toward it.
const HOTSPOT_SIZE = 0.4

// Field photo or soil test report upload. The body is the file itself; ?fieldId= names the field.
// Photos (default ?kind=photo): ?x=&y= is the focus point (0-1) and Sanity extracts LQIP and
// palette on upload. Soil reports (?kind=soilReport): a PDF stored as a file asset, ?name= is its
// download name. The new file replaces the old one and the old asset is deleted in the same
// transaction.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const guarded = await guard(request, env, allow, { write: true })
  if (!guarded.ok) return guarded.response

  const url = new URL(request.url)
  const query = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!query.success) return errorResponse(400, issues(query.error))

  const kind = KINDS[query.data.kind]

  const type = (request.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? ""
  const matches = kind.signatures[type]
  if (!matches) return errorResponse(415, kind.refuse)

  const body = await readBytesBody(request, kind.maxBytes)
  if (!body.ok) return body.response
  if (!matches(body.value)) return errorResponse(415, "File content does not match its type")

  const client = writeClient(env)
  const { field, recent } = await client.fetch<{
    field: { _id: string; oldAsset: string | null; oldAssetShared: boolean } | null
    recent: number
  }>(
    `{
      "field": *[_type == "field" && _id == $id][0]{
        _id,
        "oldAsset": ${query.data.kind}.asset._ref,
        "oldAssetShared": count(*[_id != ^._id && references(^.${query.data.kind}.asset._ref)]) > 0
      },
      "recent": count(*[_type == "photoUpload" && dateTime(_createdAt) > dateTime($since)])
    }`,
    { id: query.data.fieldId, since: new Date(Date.now() - 3_600_000).toISOString() },
  )
  if (!field) return errorResponse(404, "Unknown field")
  if (recent >= UPLOADS_PER_HOUR) {
    return errorResponse(429, "Upload limit reached for this hour, try again later")
  }
  // The cap counts these log documents (photos and soil reports alike), not assets: replacing a
  // file deletes the old asset, which would otherwise drop out of the count.
  await client.create({
    _id: `photoUpload-${crypto.randomUUID()}`,
    _type: "photoUpload",
    kind: query.data.kind,
    field: { _type: "reference", _ref: field._id, _weak: true },
    user: guarded.user,
  })

  const blob = new Blob([body.value], { type })
  let value: Record<string, unknown>
  let assetId: string
  if (query.data.kind === "soilReport") {
    const asset = await client.assets.upload("file", blob, {
      filename: query.data.name,
      contentType: type,
    })
    assetId = asset._id
    value = { soilReport: { _type: "file", asset: { _type: "reference", _ref: asset._id } } }
  } else {
    const asset = await client.assets.upload("image", blob, {
      filename: `field-${field._id}`,
      contentType: type,
      extract: ["lqip", "palette"],
    })
    assetId = asset._id
    const half = HOTSPOT_SIZE / 2
    value = {
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
    }
  }

  // Assets are content-addressed, so another field can hold the same file: deleting it then would
  // fail the whole transaction. A shared old asset is left in place.
  const tx = client.transaction().patch(field._id, (p) => p.set(value))
  if (field.oldAsset && field.oldAsset !== assetId && !field.oldAssetShared)
    tx.delete(field.oldAsset)
  await tx.commit()

  return json({ assetId }, 201)
}
