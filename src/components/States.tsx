import { Link } from "react-router"

import { useI18n } from "@/lib/i18n/store"

// Loading and failure lines shared by the pages. Loading never shows placeholder numbers.
// `what` is already translated by the caller.
export function Loading({ what }: { what: string }) {
  const { t } = useI18n()
  return (
    <p className="text-muted p-6 text-sm" role="status">
      {t("common.loading", { what })}
    </p>
  )
}

export function Failed({ what, error }: { what: string; error: Error }) {
  const { t } = useI18n()
  return (
    <p role="alert" className="bg-warn-soft text-warn rounded-md p-4 text-sm">
      {t("common.couldNotLoad", { what, error: error.message })}
    </p>
  )
}

export function NotFound({ what }: { what?: string }) {
  const { t } = useI18n()
  return (
    <main className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {what ? t("common.notFound.titleWhat", { what }) : t("common.notFound.title")}
      </h1>
      <p className="text-muted mt-3">
        {t("common.notFound.body")}{" "}
        <Link to="/" className="underline">
          {t("common.notFound.home")}
        </Link>
        .
      </p>
    </main>
  )
}
