import { useEffect } from "react"

const BASE = "Mecropolis: field and crop tracker"

export function useTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} | Mecropolis` : BASE
  }, [title])
}
