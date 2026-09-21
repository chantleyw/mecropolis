export const RISK_MARKER = "Weather risk assessment"

const HUMIDITY_LIMIT = 80
const TEMP_LIMIT = 30

// Humid or hot conditions favour pest spread; both inputs come from the 7-day forecast.
export function assessRisk(input: { maxHumidity: number; maxTemp: number }): {
  elevated: boolean
  text: string
} {
  const reasons: string[] = []
  if (input.maxHumidity > HUMIDITY_LIMIT) {
    reasons.push(`relative humidity peaks at ${input.maxHumidity}% (above ${HUMIDITY_LIMIT}%)`)
  }
  if (input.maxTemp > TEMP_LIMIT) {
    reasons.push(`daily maximum reaches ${input.maxTemp} C (above ${TEMP_LIMIT} C)`)
  }
  const elevated = reasons.length > 0
  const verdict = elevated
    ? `Elevated spread risk: ${reasons.join("; ")}.`
    : `No elevated spread risk: humidity peaks at ${input.maxHumidity}% and the daily maximum reaches ${input.maxTemp} C.`
  return { elevated, text: `${RISK_MARKER} (7-day forecast): ${verdict}` }
}
