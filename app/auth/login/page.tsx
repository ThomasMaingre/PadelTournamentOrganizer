// app/auth/login/page.tsx
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import LoginForm from "@/components/auth/login-form"

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <LoginForm />
    </main>
  )
}
