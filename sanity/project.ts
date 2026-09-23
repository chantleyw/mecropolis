// Read by the Sanity CLI under Node (source .env.local first; the CLI does not load it).
const projectId = process.env.VITE_SANITY_PROJECT_ID
const dataset = process.env.VITE_SANITY_DATASET

if (!projectId || !dataset) {
  throw new Error(
    "Set VITE_SANITY_PROJECT_ID and VITE_SANITY_DATASET before running the Sanity CLI",
  )
}

export const sanityProject = { projectId, dataset }
