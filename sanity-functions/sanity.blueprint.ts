import {
  defineBlueprint,
  defineDocumentFunction,
  defineScheduledFunction,
} from "@sanity/blueprints"

// Org-scoped stack (scheduled functions need it), so each document function names its project.
// CRON_SECRET is set per function with `npx sanity functions env add`, never in this file.
const PROJECT_ID = "mns0vhec"

export default defineBlueprint({
  resources: [
    defineDocumentFunction({
      name: "reconcile-on-observation",
      project: PROJECT_ID,
      event: {
        on: ["create"],
        // Snapshots written by reconcile itself are skipped: the season was just reconciled.
        filter:
          '_type == "observation" || (_type == "weatherSnapshot" && triggeredBy != "reconcile")',
        projection: '{ "seasonId": season._ref }',
        resource: { type: "dataset", id: `${PROJECT_ID}.production` },
      },
    }),
    defineScheduledFunction({
      name: "nightly-reconcile",
      event: { expression: "0 2 * * *" },
      timezone: "UTC",
    }),
  ],
})
