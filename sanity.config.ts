import { BasketIcon } from "@sanity/icons/Basket"
import { visionTool } from "@sanity/vision"
import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"

import { publicEnv } from "@/lib/publicEnv"

import { pestSeverityBadge, recommendationStatusBadge, seasonStageBadge } from "./sanity/badges"
import { schemaTypes } from "./sanity/schemaTypes"
import { structure } from "./sanity/structure"
import { Logo } from "./sanity/studio/logo"

export default defineConfig({
  name: "mecropolis",
  title: "Mecropolis",
  icon: BasketIcon,
  basePath: "/studio",
  projectId: publicEnv.projectId,
  dataset: publicEnv.dataset,
  plugins: [structureTool({ structure }), visionTool()],
  schema: { types: schemaTypes },
  studio: { components: { logo: Logo } },
  document: {
    badges: (prev) => [...prev, recommendationStatusBadge, seasonStageBadge, pestSeverityBadge],
  },
})
