import { defineField, defineType } from "sanity"

export const RECOMMENDATION_TYPES = [
  "scout_pest",
  "monitor",
  "review_benchmark",
  "review_data",
  "custom",
] as const

export const RECOMMENDATION_STATUSES = [
  "proposed",
  "approved",
  "rejected",
  "completed",
  "expired",
] as const

export const agronomyRecommendation = defineType({
  name: "agronomyRecommendation",
  title: "Agronomy recommendation",
  type: "document",
  // Status changes only through /api/recommendations; Studio is a read-only view.
  readOnly: true,
  fields: [
    defineField({
      name: "season",
      type: "reference",
      to: [{ type: "season" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "field",
      type: "reference",
      to: [{ type: "field" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "type",
      type: "string",
      options: { list: [...RECOMMENDATION_TYPES] },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "status",
      type: "string",
      options: { list: [...RECOMMENDATION_STATUSES] },
      initialValue: "proposed",
      validation: (r) => r.required(),
    }),
    defineField({ name: "rationale", type: "text", validation: (r) => r.required() }),
    defineField({
      name: "evidence",
      type: "array",
      of: [
        {
          type: "object",
          name: "evidenceItem",
          fields: [
            defineField({ name: "kind", type: "string" }),
            defineField({ name: "label", type: "string" }),
            defineField({ name: "ref", type: "string", description: "Document id or URL." }),
            defineField({ name: "detail", type: "text" }),
          ],
        },
      ],
    }),
    defineField({ name: "createdAt", type: "datetime" }),
    defineField({ name: "createdBy", type: "string", description: "Display name or source." }),
    defineField({ name: "reviewedAt", type: "datetime" }),
    defineField({ name: "reviewedBy", type: "string", description: "Display name only." }),
    defineField({ name: "decisionNote", type: "text" }),
    defineField({ name: "expiresAt", type: "datetime" }),
  ],
  preview: {
    select: { type: "type", status: "status", field: "field.name" },
    prepare: ({ type, status, field }) => ({
      title: `${type ?? "?"} - ${field ?? "?"}`,
      subtitle: status,
    }),
  },
})
