const KG_PER_HA_FACTOR: Record<string, number> = {
  "kg/ha": 1,
  "mt/ha": 1000,
}

// Converts a yield to kg/ha. Throws on an unknown unit rather than guessing a factor.
export function toKgPerHa(value: number, unit: string): number {
  const factor = KG_PER_HA_FACTOR[unit]
  if (factor === undefined) throw new Error(`Unknown yield unit: ${unit}`)
  return value * factor
}
