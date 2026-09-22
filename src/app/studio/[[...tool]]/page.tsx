import type { Metadata } from "next"
import { metadata as studioMetadata } from "next-sanity/studio"

import { Studio } from "./Studio"

export const dynamic = "force-static"

export const metadata: Metadata = { ...studioMetadata, icons: "/studio-icon.svg" }
export { viewport } from "next-sanity/studio"

export default function StudioPage() {
  return <Studio />
}
