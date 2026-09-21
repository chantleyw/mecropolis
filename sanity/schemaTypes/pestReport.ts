import { defineField, defineType, type ConditionalPropertyCallbackContext } from "sanity"

const isGbif = ({ document }: ConditionalPropertyCallbackContext) => document?.source === "gbif"

export const pestReport = defineType({
  name: "pestReport",
  title: "Pest report",
  type: "document",
  fields: [
    defineField({
      name: "field",
      type: "reference",
      to: [{ type: "field" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "season",
      type: "reference",
      to: [{ type: "season" }],
      validation: (r) => r.required(),
    }),
    defineField({ name: "date", type: "date", validation: (r) => r.required() }),
    defineField({
      name: "source",
      type: "string",
      options: { list: ["gbif", "manual"] },
      initialValue: "gbif",
      readOnly: true,
      validation: (r) => r.required(),
    }),
    defineField({ name: "sourceId", type: "string", readOnly: true }),
    defineField({ name: "sourceUrl", type: "url", readOnly: true }),
    defineField({
      name: "distanceKm",
      type: "number",
      description: "Distance from the field to the occurrence record.",
      readOnly: true,
    }),
    defineField({
      name: "scope",
      type: "string",
      description: "regional: reported near the field. field: observed on the field itself.",
      options: { list: ["regional", "field"] },
      readOnly: true,
      validation: (r) => r.required(),
    }),
    defineField({ name: "severityBasis", type: "string", readOnly: isGbif }),
    defineField({ name: "pest", type: "string" }),
    defineField({
      name: "severity",
      type: "string",
      options: { list: ["low", "medium", "high", "critical"] },
      readOnly: isGbif,
    }),
    defineField({ name: "affectedArea", type: "string", readOnly: isGbif }),
    defineField({ name: "images", type: "array", of: [{ type: "image" }], readOnly: isGbif }),
    defineField({ name: "recommendedAction", type: "text", readOnly: isGbif }),
    defineField({ name: "resolved", type: "boolean", initialValue: false, readOnly: isGbif }),
    defineField({ name: "resolutionNotes", type: "text", readOnly: isGbif }),
  ],
  preview: { select: { title: "pest", subtitle: "severity" } },
})
