import { defineField, defineType } from "sanity"

export const treatment = defineType({
  name: "treatment",
  title: "Treatment",
  type: "document",
  fields: [
    defineField({
      name: "season",
      type: "reference",
      to: [{ type: "season" }],
      validation: (r) => r.required(),
    }),
    defineField({ name: "date", type: "date", validation: (r) => r.required() }),
    defineField({
      name: "type",
      type: "string",
      options: {
        list: ["fertiliser", "pesticide", "herbicide", "fungicide", "irrigation", "other"],
      },
    }),
    defineField({ name: "product", type: "string" }),
    defineField({ name: "dosage", type: "string", description: 'e.g. "200 kg/ha"' }),
    defineField({
      name: "method",
      type: "string",
      options: { list: ["broadcast", "foliar", "drip", "spray", "injection"] },
    }),
    defineField({ name: "applicator", type: "string" }),
    defineField({ name: "notes", type: "text" }),
  ],
  preview: { select: { title: "product", subtitle: "date" } },
})
