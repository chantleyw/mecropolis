import { SunIcon } from "@sanity/icons/Sun"
import { defineField, defineType } from "sanity"

export const weatherSnapshot = defineType({
  name: "weatherSnapshot",
  title: "Weather snapshot",
  type: "document",
  icon: SunIcon,
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
    defineField({ name: "fetchedAt", type: "datetime" }),
    defineField({ name: "triggeredBy", type: "string", description: 'e.g. "planning-to-planted"' }),
    defineField({ name: "forecastDays", type: "number" }),
    defineField({
      name: "data",
      type: "text",
      readOnly: true,
      description:
        "Normalised Open-Meteo series (JSON string); parsed behind a Zod schema on read.",
    }),
    defineField({
      name: "summary",
      type: "object",
      fields: [
        defineField({ name: "avgTempMax", type: "number" }),
        defineField({ name: "avgTempMin", type: "number" }),
        defineField({ name: "totalPrecipitation", type: "number" }),
        defineField({ name: "avgSoilTemp", type: "number" }),
        defineField({ name: "avgSoilMoisture", type: "number" }),
        defineField({ name: "totalET0", type: "number" }),
      ],
    }),
    defineField({
      name: "period",
      type: "object",
      fields: [
        defineField({ name: "start", type: "date" }),
        defineField({ name: "end", type: "date" }),
      ],
    }),
  ],
  preview: { select: { title: "triggeredBy", subtitle: "fetchedAt" } },
})
