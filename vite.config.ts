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
  },
})
