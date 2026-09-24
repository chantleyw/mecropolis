import { createImageUrlBuilder } from "@sanity/image-url"

import { publicEnv } from "../publicEnv"

const builder = createImageUrlBuilder({
  projectId: publicEnv.projectId,
  dataset: publicEnv.dataset,
})

// The PHOTO projection in queries.ts: hotspot and crop from the image field, LQIP and the
// dominant palette colour from the asset metadata Sanity extracted on upload.
export type Photo = {
  hotspot: { x?: number; y?: number; width?: number; height?: number } | null
  crop: { top?: number; bottom?: number; left?: number; right?: number } | null
  asset: { _id: string; lqip: string | null; dominant: string | null } | null
}

type ImageSource = Parameters<typeof builder.image>[0]

// Cropped toward the hotspot at the requested size, in the browser's best format.
export function photoUrl(photo: Photo, width: number, height: number): string | null {
  if (!photo.asset) return null
  return builder
    .image(photo as ImageSource)
    .width(width)
    .height(height)
    .fit("crop")
    .auto("format")
    .url()
}
