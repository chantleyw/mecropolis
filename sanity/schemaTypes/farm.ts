import { PinIcon } from "@sanity/icons/Pin"
import { defineField, defineType } from "sanity"

export const farm = defineType({
  name: "farm",
  title: "Farm",
  type: "document",
  icon: PinIcon,
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "location", type: "string" }),
    defineField({ name: "coordinates", type: "geopoint" }),
    defineField({ name: "description", type: "text" }),
  ],
  preview: { select: { title: "name", subtitle: "location" } },
})
