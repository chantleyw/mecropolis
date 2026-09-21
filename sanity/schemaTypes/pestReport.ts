import { defineField, defineType } from "sanity"

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
    defineField({ name: "pest", type: "string" }),
    defineField({
      name: "severity",
      type: "string",
      options: { list: ["low", "medium", "high", "critical"] },
    }),
    defineField({ name: "affectedArea", type: "string" }),
    defineField({ name: "images", type: "array", of: [{ type: "image" }] }),
    defineField({ name: "recommendedAction", type: "text" }),
    defineField({ name: "resolved", type: "boolean", initialValue: false }),
    defineField({ name: "resolutionNotes", type: "text" }),
  ],
  preview: { select: { title: "pest", subtitle: "severity" } },
})
