import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ["functions/**/*.ts"],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ["scripts/**", "*.config.{ts,mjs}", "sanity.cli.ts", "sanity/project.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      "no-console": "error",
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Browser config goes through src/lib/publicEnv.ts; Functions read context.env.",
        },
      ],
    },
  },
  {
    // The Sanity CLI (typegen, schema deploy), the seed, migration and translation scripts run under
    // Node, not Vite.
    files: [
      "sanity/project.ts",
      "scripts/seed.ts",
      "scripts/migrate-notes.ts",
      "scripts/migrate-note-owners.ts",
      "scripts/translate.ts",
    ],
    rules: { "no-restricted-properties": "off" },
  },
  {
    // Sanity Functions run on Node and read their env (CRON_SECRET) from process.env.
    files: ["sanity-functions/functions/**/*.ts"],
    languageOptions: { globals: globals.node },
    rules: { "no-restricted-properties": "off" },
  },
  globalIgnores(["dist/**", ".wrangler/**", "sanity/types.ts", "sanity-functions/**/.build/**"]),
])
