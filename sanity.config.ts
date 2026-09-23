import { defineConfig } from "sanity"

import { sanityProject } from "./sanity/project"
import { schemaTypes } from "./sanity/schemaTypes"

// Schema only: there is no Studio. The CLI loads this for `schema extract` and `schema deploy`.
export default defineConfig({
  name: "mecropolis",
  title: "Mecropolis",
  ...sanityProject,
  schema: { types: schemaTypes },
})
