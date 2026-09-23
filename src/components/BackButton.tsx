import { useLocation, useNavigate } from "react-router"

const ROOTS = new Set(["/", "/dashboard"])

export function BackButton() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  if (ROOTS.has(pathname)) return null

  function goBack() {
    // React Router stores its history index in history.state; 0 means this is the first entry.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) void navigate(-1)
    else void navigate("/")
  }

  return (
    <button type="button" onClick={goBack} className="btn" aria-label="Go back">
      <span aria-hidden="true">←</span> Back
    </button>
  )
}
