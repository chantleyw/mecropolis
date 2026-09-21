import { defineField, defineType } from "sanity"

export const crop = defineType({
  name: "crop",
  title: "Crop",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "species", type: "string" }),
    defineField({ name: "cultivar", type: "string" }),
    defineField({ name: "growthCycleDays", type: "number", validation: (r) => r.min(1) }),
    defineField({
      name: "category",
      type: "string",
      options: { list: ["grain", "oilseed", "legume", "fruit", "vegetable", "pasture", "other"] },
    }),
    defineField({ name: "notes", type: "text" }),
  ],
  preview: { select: { title: "name", subtitle: "category" } },
})
