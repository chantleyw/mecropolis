import { defineArrayMember, defineField, defineType } from "sanity"

import { STAGES } from "@/lib/workflow/types"

export const season = defineType({
  name: "season",
  title: "Season",
  type: "document",
  groups: [
    { name: "refs", title: "Field and crop", default: true },
    { name: "timeline", title: "Timeline" },
    { name: "state", title: "State" },
    { name: "outcome", title: "Outcome" },
    { name: "notes", title: "Notes" },
  ],
  fields: [
    defineField({
      name: "field",
      type: "reference",
      group: "refs",
      to: [{ type: "field" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "crop",
      type: "reference",
      group: "refs",
      to: [{ type: "crop" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "year",
      type: "number",
      group: "timeline",
      validation: (r) => r.required().integer().min(2020).max(2030),
    }),
    defineField({ name: "plantingDate", type: "date", group: "timeline" }),
    defineField({
      name: "expectedHarvest",
      type: "date",
      group: "timeline",
      description: "Set by the workflow as plantingDate + crop cycle when empty; editable.",
    }),
    defineField({ name: "actualHarvest", type: "date", group: "timeline" }),
    defineField({
      name: "derivedMaturityDate",
      type: "date",
      group: "timeline",
      readOnly: true,
      description:
        "First date accumulated GDD reached the crop maturity threshold; set by the workflow.",
    }),
    defineField({
      name: "stage",
      type: "string",
      group: "state",
      options: { list: [...STAGES] },
      initialValue: "planning",
      readOnly: true,
      description: "Changed only through the workflow API.",
    }),
    defineField({
      name: "stageHistory",
      type: "array",
      group: "state",
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
      group: "outcome",
      readOnly: true,
      description:
        "kg per hectare. Empty in this build: no field yield is recorded, and regional benchmarks are never written here.",
      validation: (r) => r.min(0),
    }),
    defineField({ name: "yieldNotes", type: "text", group: "outcome" }),
    defineField({
      name: "aiSummary",
      type: "object",
      group: "notes",
      readOnly: true,
      description:
        "AI-generated digest of this season's stored records (Sanity Agent Actions); written only by /api/summary. Not advice.",
      fields: [
        defineField({ name: "text", type: "text" }),
        defineField({ name: "generatedAt", type: "datetime" }),
      ],
    }),
    defineField({
      name: "notes",
      type: "array",
      group: "notes",
      description:
        "Separate operator notes, each dated and signed; the body is Portable Text (paragraphs, bullets, bold).",
      of: [
        defineArrayMember({
          name: "seasonNote",
          type: "object",
          fields: [
            defineField({ name: "createdAt", type: "datetime", validation: (r) => r.required() }),
            defineField({ name: "updatedAt", type: "datetime" }),
            defineField({ name: "author", type: "string" }),
            defineField({
              name: "ownerId",
              type: "string",
              description: "Account that wrote the note; only it may edit, delete or restore it.",
            }),
            defineField({
              name: "body",
              type: "array",
              validation: (r) => r.required(),
              of: [
                {
                  type: "block",
                  styles: [{ title: "Normal", value: "normal" }],
                  lists: [{ title: "Bullet", value: "bullet" }],
                  marks: { decorators: [{ title: "Strong", value: "strong" }], annotations: [] },
                },
              ],
            }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: { field: "field.name", crop: "crop.name", year: "year", stage: "stage" },
    prepare: ({ field, crop, year, stage }) => ({
      title: `${field ?? "?"} - ${crop ?? "?"} ${year ?? ""}`.trim(),
      subtitle: stage,
    }),
  },
})
