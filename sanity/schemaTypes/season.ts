import { defineField, defineType } from "sanity"

import { STAGES } from "@/lib/workflow/types"

export const season = defineType({
  name: "season",
  title: "Season",
  type: "document",
  fields: [
    defineField({
      name: "field",
      type: "reference",
      to: [{ type: "field" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "crop",
      type: "reference",
      to: [{ type: "crop" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "year",
      type: "number",
      validation: (r) => r.required().integer().min(2020).max(2030),
    }),
    defineField({ name: "plantingDate", type: "date" }),
    defineField({
      name: "expectedHarvest",
      type: "date",
      description: "Set by the workflow as plantingDate + crop cycle when empty; editable.",
    }),
    defineField({ name: "actualHarvest", type: "date" }),
    defineField({
      name: "derivedMaturityDate",
      type: "date",
      readOnly: true,
      description:
        "First date accumulated GDD reached the crop maturity threshold; set by the workflow.",
    }),
    defineField({
      name: "stage",
      type: "string",
      options: { list: [...STAGES] },
      initialValue: "planning",
      readOnly: true,
      description: "Changed only through the workflow API.",
    }),
    defineField({
      name: "stageHistory",
      type: "array",
      readOnly: true,
      of: [
        {
          type: "object",
          name: "stageChange",
          fields: [
            defineField({ name: "stage", type: "string" }),
            defineField({ name: "previousStage", type: "string" }),
            defineField({
              name: "effectiveDate",
              type: "date",
              description: "When the world changed (from planting or the GDD crossing).",
            }),
            defineField({
              name: "timestamp",
              type: "datetime",
              description: "When the system noticed the change.",
            }),
            defineField({ name: "basis", type: "string", description: "Evidence for the change." }),
            defineField({
              name: "gddTotal",
              type: "number",
              description: "Accumulated GDD at the crossing.",
            }),
            defineField({
              name: "derivedFrom",
              type: "string",
              options: { list: ["plantingDate", "gdd-model", "regional-benchmark"] },
            }),
            defineField({ name: "triggeredBy", type: "string", description: "Display name only" }),
            defineField({ name: "notes", type: "text" }),
            defineField({ name: "weatherFetched", type: "boolean" }),
            defineField({ name: "weatherSnapshotId", type: "string" }),
          ],
        },
      ],
    }),
    defineField({
      name: "yieldAmount",
      type: "number",
      readOnly: true,
      description:
        "kg per hectare. Empty in this build: no field yield is recorded, and regional benchmarks are never written here.",
      validation: (r) => r.min(0),
    }),
    defineField({ name: "yieldNotes", type: "text" }),
  ],
  preview: {
    select: { field: "field.name", crop: "crop.name", year: "year", stage: "stage" },
    prepare: ({ field, crop, year, stage }) => ({
      title: `${field ?? "?"} - ${crop ?? "?"} ${year ?? ""}`.trim(),
      subtitle: stage,
    }),
  },
})
