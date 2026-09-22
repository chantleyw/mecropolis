import { BarChartIcon } from "@sanity/icons/BarChart"
import { defineField, defineType } from "sanity"

export const benchmark = defineType({
  name: "benchmark",
  title: "Regional benchmark",
  type: "document",
  icon: BarChartIcon,
  readOnly: true,
  description: "Regional or national yield statistics from public sources. Not this field's yield.",
  fields: [
    defineField({
      name: "source",
      type: "string",
      options: { list: ["psd", "harveststat", "worldbank"] },
    }),
    defineField({ name: "scope", type: "string", options: { list: ["national", "provincial"] } }),
    defineField({ name: "region", type: "string" }),
    defineField({ name: "commodity", type: "string" }),
    defineField({ name: "crop", type: "reference", to: [{ type: "crop" }] }),
    defineField({ name: "unit", type: "string", initialValue: "kg/ha" }),
    defineField({
      name: "observations",
      type: "array",
      of: [
        defineField({
          name: "observation",
          type: "object",
          fields: [
            defineField({ name: "year", type: "number" }),
            defineField({ name: "value", type: "number" }),
          ],
          preview: { select: { title: "year", subtitle: "value" } },
        }),
      ],
    }),
    defineField({ name: "sourceUrl", type: "url" }),
    defineField({ name: "licence", type: "string" }),
    defineField({ name: "retrievedAt", type: "datetime" }),
  ],
  preview: { select: { title: "commodity", subtitle: "region" } },
})
