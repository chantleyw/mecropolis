// The farm the picker opens by default, kept per browser. Storage can be blocked (private mode,
// site data cleared); then the picker simply asks again.
const KEY = "mecropolis-farm"

export function rememberedFarm(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function rememberFarm(slug: string): void {
  try {
    localStorage.setItem(KEY, slug)
  } catch {
    // Storage blocked: the choice is not remembered and the picker asks next time.
  }
}
