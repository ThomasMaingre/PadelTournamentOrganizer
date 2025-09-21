import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CreateTournamentForm from "@/components/tournaments/create-tournament-form"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Logo from "@/components/ui/logo"

export default async function NewTournamentPage() {
  // Auth SSR (Next 15)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error("getUser (/dashboard/tournaments/new):", error.message)
  }
  if (!user) {
    redirect("/auth/login")
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
                Retour
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <Logo size={32} />
              <div>
                <h1 className="text-xl font-bold">Nouveau tournoi</h1>
                <p className="text-sm text-muted-foreground">Créez et configurez votre tournoi de padel</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <CreateTournamentForm judgeId={user!.id} />
      </main>
    </div>
  )
}
