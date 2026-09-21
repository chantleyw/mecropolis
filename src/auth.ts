import "server-only"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { env } from "@/lib/env"

const credentialsSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
})

// Session carries a display name only (public-dataset constraint).
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null
        const { username, password } = parsed.data
        const userOk = username === env.AUTH_DEMO_USER
        // Always run the hash comparison so timing does not reveal the username.
        const passOk = await bcrypt.compare(password, env.AUTH_DEMO_PASSWORD_HASH)
        if (!userOk || !passOk) return null
        return { id: "demo", name: env.AUTH_DEMO_USER }
      },
    }),
  ],
})
