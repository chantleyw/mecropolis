import { defineCliConfig } from "sanity/cli"

import { publicEnv } from "@/lib/publicEnv"

export default defineCliConfig({
  api: { projectId: publicEnv.projectId, dataset: publicEnv.dataset },
  typegen: {
    path: "./src/**/*.{ts,tsx}",
    schema: "./sanity/extract.json",
    generates: "./sanity/types.ts",
  },
})
