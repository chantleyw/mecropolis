// Usage: node scripts/hash-password.mjs '<password>'
// Prints a bcrypt hash escaped for .env.local ($ becomes \$ so @next/env's dotenv-expand
// keeps it literal instead of treating $2b / $12 / ... as variable references).
import bcrypt from "bcryptjs"

const password = process.argv[2]
if (!password) {
  throw new Error("Usage: node scripts/hash-password.mjs '<password>'")
}
const hash = bcrypt.hashSync(password, 12)
process.stdout.write(hash.split("$").join("\\$") + "\n")
