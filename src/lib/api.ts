// Thin wrapper over the Pages Functions. Throws with the server's error message on non-2xx.
export async function api<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    headers: init.body === undefined ? {} : { "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!res.ok) {
    // Error bodies may be non-JSON (proxy or platform pages); fall back to the status code.
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

// Sends a file as the raw request body; the query string carries the other parameters.
export async function apiUpload<T>(path: string, file: Blob): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": file.type },
    body: file,
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? `Upload failed (${res.status})`)
  }
  return (await res.json()) as T
}
