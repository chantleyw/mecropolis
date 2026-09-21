import { defineField, defineType } from "sanity"

export const field = defineType({
  name: "field",
  title: "Field",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "farm",
      type: "reference",
      to: [{ type: "farm" }],
      validation: (r) => r.required(),
    }),
    defineField({ name: "hectares", type: "number", validation: (r) => r.min(0.1) }),
    defineField({
      name: "soilType",
      type: "string",
      options: { list: ["sandy", "loamy", "clay", "silty", "peaty", "chalky"] },
    }),
    defineField({
      name: "colour",
      type: "string",
      description: "Hex colour for the UI card, e.g. #4CAF50",
      validation: (r) => r.regex(/^#[0-9a-fA-F]{6}$/, { name: "hex colour" }),
    }),
    defineField({ name: "notes", type: "text" }),
  ],
  preview: { select: { title: "name", subtitle: "soilType" } },
})
