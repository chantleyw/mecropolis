import { redirect } from "next/navigation"
import { AuthError } from "next-auth"
import { auth, signIn } from "@/auth"

function safeCallback(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/"
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const { callbackUrl, error } = await searchParams
  const target = safeCallback(callbackUrl)
  if (await auth()) redirect(target)

  async function login(formData: FormData) {
    "use server"
    try {
      await signIn("credentials", {
        username: formData.get("username"),
        password: formData.get("password"),
        redirectTo: target,
      })
    } catch (e) {
      if (e instanceof AuthError) {
        redirect(`/signin?error=1&callbackUrl=${encodeURIComponent(target)}`)
      }
      throw e
    }
  }

  return (
    <main>
      <h1>Sign in to Mecropolis</h1>
      <form action={login}>
        <label>
          Username
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error ? <p role="alert">Invalid username or password.</p> : null}
        <button type="submit">Sign in</button>
      </form>
    </main>
  )
}
