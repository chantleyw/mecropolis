import { visionTool } from "@sanity/vision"
import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"

import { publicEnv } from "@/lib/publicEnv"

import { schemaTypes } from "./sanity/schemaTypes"

export default defineConfig({
  name: "mecropolis",
  title: "Mecropolis",
  basePath: "/studio",
  projectId: publicEnv.projectId,
  dataset: publicEnv.dataset,
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
})
