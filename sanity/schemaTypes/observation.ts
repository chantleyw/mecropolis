import { EyeOpenIcon } from "@sanity/icons/EyeOpen"
import { defineField, defineType } from "sanity"

export const observation = defineType({
  name: "observation",
  title: "Observation",
  type: "document",
  icon: EyeOpenIcon,
  readOnly: true,
  description: "Not entered in this build; observations are never typed by an operator here.",
  fields: [
    defineField({
      name: "field",
      type: "reference",
      to: [{ type: "field" }],
      validation: (r) => r.required(),
    }),
    defineField({ name: "season", type: "reference", to: [{ type: "season" }] }),
    defineField({ name: "date", type: "datetime", validation: (r) => r.required() }),
    defineField({ name: "notes", type: "text", validation: (r) => r.required() }),
    defineField({ name: "images", type: "array", of: [{ type: "image" }] }),
    defineField({ name: "tags", type: "array", of: [{ type: "string" }] }),
  ],
  preview: { select: { title: "notes", subtitle: "date" } },
})
