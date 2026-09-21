import { defineField, defineType } from "sanity"

export const STAGES = [
  "planning",
  "planted",
  "growing",
  "pre-harvest",
  "harvested",
  "review",
] as const

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
            defineField({ name: "timestamp", type: "datetime" }),
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
      description: "kg per hectare",
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
