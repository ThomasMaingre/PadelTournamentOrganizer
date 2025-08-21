import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import SignUpForm from "@/components/auth/sign-up-form"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default async function SignUpPage() {
  console.log("🔎 /auth/sign-up loaded")

  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser()

  // "Auth session missing!" = normal si non connecté
  if (userErr && userErr.message !== "Auth session missing!") {
    console.error("Supabase getUser error (sign-up):", userErr.message)
  }

  if (userData?.user) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <CardDescription>Inscrivez-vous pour organiser vos tournois</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
      </Card>
    </main>
  )
}
