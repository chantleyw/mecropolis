import { useSyncExternalStore } from "react"

const KEY = "mecropolis-theme"

type Theme = "light" | "dark"

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

// The current theme is whatever the root element says; the inline script in the root layout sets it
// before first paint, and this component updates it.
function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme
  return set === "light" || set === "dark" ? set : systemTheme()
}

const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function ThemeToggle() {
  // The server cannot know the theme, so it renders a neutral label; the client corrects it.
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null)

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark"
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Storage blocked: the choice applies for this page view only.
    }
    listeners.forEach((cb) => cb())
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn !px-2.5"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  )
}
