import { redirect } from "next/navigation"
import { AuthError } from "next-auth"
import { auth, signIn } from "@/auth"

function safeCallback(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"
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
    <main className="grid min-h-[calc(100vh-3.5rem)] place-items-center px-4">
      <div className="card w-full max-w-sm p-7">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted mt-1 text-sm">Field and crop tracker</p>
        <form action={login} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Username
            <input name="username" autoComplete="username" required className="input mt-1.5" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input mt-1.5"
            />
          </label>
          {error ? (
            <p role="alert" className="bg-warn-soft text-warn rounded-lg p-3 text-sm">
              Invalid username or password.
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary w-full justify-center">
            Sign in
          </button>
        </form>
      </div>
    </main>
  )
}
