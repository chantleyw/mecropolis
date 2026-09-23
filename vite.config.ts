import { fileURLToPath, URL } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    // Skip auto-discovery of the root postcss.config.mjs: it targets Next's @tailwindcss/postcss
    // with string plugin names, which Vite's own PostCSS loader can't consume directly. The
    // @tailwindcss/vite plugin above needs no PostCSS config of its own.
    postcss: { plugins: [] },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Pages Functions run under `npm run dev:api` (wrangler) on 8788. Keep the browser's Host
    // (the string shorthand sets changeOrigin: true) so the same-origin check in
    // functions/_lib/http.ts sees Origin and Host both as localhost:5173.
    proxy: { "/api": { target: "http://localhost:8788", changeOrigin: false } },
  },
})
