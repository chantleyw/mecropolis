import { z } from "zod"

// Operator-entered field log. The same schemas validate the season page forms and the Functions.

const id = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, "invalid document id")

export const observationSchema = z.object({
  fieldId: id,
  notes: z.string().trim().min(1, "Notes are required").max(2000),
})

export const TREATMENT_TYPES = [
  "fertiliser",
  "pesticide",
  "herbicide",
  "fungicide",
  "irrigation",
  "other",
] as const
export const TREATMENT_METHODS = ["broadcast", "foliar", "drip", "spray", "injection"] as const

const DAY_MS = 86_400_000

// Date.parse rolls impossible days over ("2026-02-31" parses as 3 March), so round-trip the value.
export function isRealDate(s: string): boolean {
  const t = Date.parse(`${s}T00:00:00Z`)
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s
}

// The date is the operator's local calendar day. One day of slack past today (UTC) covers time
// zones ahead of UTC; anything later is a future entry and rejected.
const pastDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date")
  .refine(isRealDate, "Not a real date")
  .refine(
    (s) => Date.parse(`${s}T00:00:00Z`) <= Date.now() + DAY_MS,
    "Date cannot be in the future",
  )

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => (s ? s : undefined))

export const treatmentSchema = z.object({
  seasonId: id,
  date: pastDate,
  type: z.enum(TREATMENT_TYPES),
  product: z.string().trim().min(1, "Product is required").max(200),
  dosage: optionalText(100),
  method: z.enum(TREATMENT_METHODS).optional(),
  notes: optionalText(2000),
})

export type TreatmentInput = z.input<typeof treatmentSchema>
