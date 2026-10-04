import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react"

import { apiUpload } from "@/lib/api"
import { t, useI18n } from "@/lib/i18n/store"
import { photoUrl, type Photo } from "@/lib/sanity/image"

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const FOCUS_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-0.05, 0],
  ArrowRight: [0.05, 0],
  ArrowUp: [0, -0.05],
  ArrowDown: [0, 0.05],
}

const MAX_EDGE = 2048

// Re-encodes in the browser before upload: caps the size and drops EXIF (including GPS), which
// Sanity would otherwise keep in the original file.
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error(t("season.photo.noCanvas"))
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(t("season.photo.encodeFailed")))),
      "image/jpeg",
      0.85,
    ),
  )
}

// The stored photo: the LQIP and the dominant palette colour hold the space while the cropped
// image loads.
function StoredPhoto({ photo, alt }: { photo: Photo; alt: string }) {
  const src = photoUrl(photo, 1200, 480)
  if (!src) return null
  return (
    <div
      className="border-line aspect-[5/2] overflow-hidden rounded-md border bg-cover bg-center"
      style={{
        backgroundColor: photo.asset?.dominant ?? "var(--surface-2)",
        backgroundImage: photo.asset?.lqip ? `url(${photo.asset.lqip})` : undefined,
      }}
    >
      <img
        src={src}
        srcSet={`${photoUrl(photo, 600, 240)} 600w, ${src} 1200w`}
        sizes="(min-width: 72rem) 70rem, 100vw"
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </div>
  )
}

type Message = { text: string; error: boolean } | null

export function FieldPhoto({
  fieldId,
  fieldName,
  photo,
}: {
  fieldId: string
  fieldName: string
  photo: Photo | null
}) {
  useI18n()
  // The re-encoded file and its object URL; the URL is revoked when replaced or on unmount.
  const [picked, setPicked] = useState<{ blob: Blob; url: string } | null>(null)
  const [focus, setFocus] = useState({ x: 0.5, y: 0.5 })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message>(null)

  useEffect(() => (picked ? () => URL.revokeObjectURL(picked.url) : undefined), [picked])

  async function choose(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ""
    if (!file) return
    setMessage(null)
    try {
      const blob = await prepare(file)
      setPicked({ blob, url: URL.createObjectURL(blob) })
      setFocus({ x: 0.5, y: 0.5 })
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : t("season.photo.readFailed"),
        error: true,
      })
    }
  }

  // A keyboard click (Enter or Space) has detail 0 and no pointer position, so it keeps the current
  // point; arrow keys move it instead. The API rejects values outside 0-1.
  function pickFocus(e: MouseEvent<HTMLButtonElement>) {
    if (e.detail === 0) return
    const r = e.currentTarget.getBoundingClientRect()
    setFocus({
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    })
  }

  function nudgeFocus(e: KeyboardEvent<HTMLButtonElement>) {
    const step = FOCUS_KEYS[e.key]
    if (!step) return
    e.preventDefault()
    setFocus((f) => ({ x: clamp01(f.x + step[0]), y: clamp01(f.y + step[1]) }))
  }

  async function upload() {
    if (!picked) return
    setBusy(true)
    setMessage(null)
    try {
      const q = new URLSearchParams({ fieldId, x: focus.x.toFixed(3), y: focus.y.toFixed(3) })
      await apiUpload(`/api/assets?${q}`, picked.blob)
      setPicked(null)
      setMessage({ text: t("season.photo.saved"), error: false })
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : t("season.uploadFailed"), error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {photo?.asset && !picked && (
        <StoredPhoto photo={photo} alt={t("season.photo.alt", { field: fieldName })} />
      )}
      {!photo?.asset && !picked && <p className="text-muted text-sm">{t("season.photo.none")}</p>}

      {picked && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={pickFocus}
            onKeyDown={nudgeFocus}
            aria-label={t("season.photo.focusLabel")}
            className="relative block w-full cursor-crosshair overflow-hidden rounded-md"
          >
            <img src={picked.url} alt="" className="w-full" />
            <span
              aria-hidden
              className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }}
            />
          </button>
          <p className="text-muted text-sm">{t("season.photo.focusHelp")}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="btn cursor-pointer">
          {photo?.asset ? t("season.photo.replace") : t("season.photo.choose")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => void choose(e.currentTarget)}
          />
        </label>
        {picked && (
          <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={upload}>
              {busy ? t("season.uploading") : t("season.photo.upload")}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => setPicked(null)}>
              {t("season.cancel")}
            </button>
          </>
        )}
        {message && (
          <span
            role={message.error ? "alert" : "status"}
            className={`text-sm ${message.error ? "text-warn" : "text-muted"}`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}
