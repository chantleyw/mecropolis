export const STATUSES = ["proposed", "approved", "rejected", "completed", "expired"] as const
export type RecommendationStatus = (typeof STATUSES)[number]

export const TRANSITIONS: Record<RecommendationStatus, readonly RecommendationStatus[]> = {
  proposed: ["approved", "rejected", "expired"],
  approved: ["completed", "expired"],
  rejected: [],
  completed: [],
  expired: [],
}

export type TransitionCheck = { valid: true } | { valid: false; reason: string }

export function checkTransition(
  from: RecommendationStatus,
  to: RecommendationStatus,
): TransitionCheck {
  if (TRANSITIONS[from].includes(to)) return { valid: true }
  const targets = TRANSITIONS[from]
  const list = targets.length > 0 ? targets.join(", ") : "none (final status)"
  return {
    valid: false,
    reason: `Cannot change a ${from} recommendation to ${to}. Valid targets: ${list}`,
  }
}

export const isStatus = (s: string): s is RecommendationStatus =>
  (STATUSES as readonly string[]).includes(s)
