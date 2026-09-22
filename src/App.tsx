// Milestone 0 placeholder: proves the Vite + Tailwind + theme-token scaffold renders correctly
// in both light and dark before auth (Milestone 1) and routing (Milestone 2) are wired in.
export function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="eyebrow">Mecropolis</p>
      <h1 className="text-gradient text-4xl font-semibold">App SDK rebuild scaffold</h1>
      <p className="text-[var(--muted)]">Milestone 0: Vite + Tailwind + theme tokens are live.</p>
      <div className="card card-lift orb float h-16 w-16" />
    </main>
  )
}
