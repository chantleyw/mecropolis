# Environment

## Variables (`.env.local`, template in `.env.example`)

| Name                                            | Purpose                                                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_SANITY_PROJECT_ID`, `VITE_SANITY_DATASET` | Sanity project (public: `mns0vhec`, `production`, prefilled in `.env.example` and CI); browser reads via `src/lib/publicEnv.ts`, CLI via `sanity/project.ts` |
| `SESSION_SECRET`, `DEMO_USER`, `DEMO_PASSWORD`  | Pages Functions session cookie and the published demo login (`functions/_lib/env.ts`)                                                                        |
| `SANITY_API_WRITE_TOKEN`                        | Write token; Pages Functions secret and `npm run seed` only                                                                                                  |
| `SANITY_WEBHOOK_SECRET`                         | 32+ chars, optional; verifies `/api/webhook/sanity` (unset: webhook returns 404)                                                                             |
| `CRON_SECRET`                                   | 32+ chars; Bearer token for `/api/advance` (unset: bearer path off)                                                                                          |
| `FAS_API_KEY`                                   | USDA PSD                                                                                                                                                     |

Never commit or log these values.

## Sanity typegen

```bash
set -a; . ./.env.local; set +a; rm -f sanity/extract.json; npm run typegen
```

The CLI ignores `.env.local`, and extract fails if `sanity/extract.json` exists.

## Notes

- Windows: Git Bash; a running `.exe` locks files.
- Vitest 5 needs `@types/node` 24.
- `package.json` `overrides` pin adm-zip, js-yaml, smol-toml, uuid to keep `npm audit` at 0.
- `format:check` currently flags 17 committed files (pre-existing); CI does not run it.
- Sanity CORS allows only known local origins, so serve the built site with `npx wrangler pages dev dist --port 8788 --env-file .env.local` (any other port fails every Sanity read). This is how `public/_headers` (CSP) is checked locally; `npm run dev:api` serves `public/` and Vite dev sends no CSP.
- CI: `.github/workflows/ci.yml` (Node 24): `npm ci`, typecheck, lint, test, build, `npm audit`.
