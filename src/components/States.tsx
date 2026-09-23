import { Link } from "react-router"

// Loading and failure lines shared by the pages. Loading never shows placeholder numbers.
export function Loading({ what }: { what: string }) {
  return (
    <p className="text-muted p-6 text-sm" role="status">
      Loading {what}…
    </p>
  )
}

export function Failed({ what, error }: { what: string; error: Error }) {
  return (
    <p role="alert" className="bg-warn-soft text-warn rounded-md p-4 text-sm">
      Could not load {what}: {error.message}
    </p>
  )
}

export function NotFound({ what = "page" }: { what?: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">No {what} here</h1>
      <p className="text-muted mt-3">
        The link may be out of date.{" "}
        <Link to="/" className="underline">
          Go to the home page
        </Link>
        .
      </p>
    </main>
  )
}
