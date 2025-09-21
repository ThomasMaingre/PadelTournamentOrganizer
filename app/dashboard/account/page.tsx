import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import AccountForm from "@/components/account/account-form"
import DeleteAccountSection from "@/components/account/delete-account-section"

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr) {
    console.error("getUser (account page):", userErr.message)
    redirect("/auth/login")
  }

  if (!user) {
    redirect("/auth/login")
  }

  // Récupérer les informations du profil
  const { data: profile, error: profileError } = await supabase
    .from("judges")
    .select("first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Profile error:", profileError)
  }

  if (!profile) {
    notFound()
  }

  const userData = {
    id: user.id,
    email: user.email || "",
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    avatar_url: profile.avatar_url || null,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold">Gestion du compte</h1>
              <p className="text-sm text-muted-foreground">
                Modifiez vos informations personnelles et paramètres
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Modifiez vos informations de profil et votre mot de passe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountForm user={userData} />
            </CardContent>
          </Card>

          {/* Zone de danger */}
          <DeleteAccountSection userId={user.id} />
        </div>
      </main>
    </div>
  )
}