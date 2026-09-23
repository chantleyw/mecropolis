import { defineCliConfig } from "sanity/cli"

import { sanityProject } from "./sanity/project"

export default defineCliConfig({
  api: sanityProject,
  typegen: {
    path: "./src/**/*.{ts,tsx}",
    schema: "./sanity/extract.json",
    generates: "./sanity/types.ts",
  },
})
