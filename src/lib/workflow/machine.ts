import type { Stage } from "./types"

export const TRANSITIONS: Record<Stage, readonly Stage[]> = {
  planning: ["planted"],
  planted: ["growing"],
  growing: ["pre-harvest"],
  "pre-harvest": ["harvested", "growing"],
  harvested: ["review"],
  review: [],
}

export type TransitionCheck = { valid: true } | { valid: false; reason: string }

export function validTargets(from: Stage): readonly Stage[] {
  return TRANSITIONS[from]
}

export function checkTransition(from: Stage, to: Stage): TransitionCheck {
  if (TRANSITIONS[from].includes(to)) return { valid: true }
  const targets = TRANSITIONS[from]
  const list = targets.length > 0 ? targets.join(", ") : "none (final stage)"
  return {
    valid: false,
    reason: `Cannot transition from ${from} to ${to}. Valid targets: ${list}`,
  }
}
