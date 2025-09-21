import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trophy } from "lucide-react"
import Logo from "@/components/ui/logo"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import EditTournamentForm from "@/components/tournaments/edit-tournament-form"
import { createSlug } from "@/lib/utils/slug"

export default async function EditTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: tournamentSlug } = await params

  const supabase = await createSupabaseServerClient()

  // Bypass pour tests
  const isAdminBypass = true

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr) console.error("getUser (edit tournament):", userErr.message)
  if (!user && !isAdminBypass) redirect("/auth/login")

  // Récupérer tous les tournois pour trouver celui qui correspond au slug
  let allTournamentsQuery = supabase
    .from("tournaments")
    .select("*")

  // Pour les tests, on skip la vérification judge_id
  if (user && !isAdminBypass) {
    allTournamentsQuery = allTournamentsQuery.eq("judge_id", user.id)
  }

  const { data: allTournaments, error: tErr } = await allTournamentsQuery

  // Trouver le tournoi qui correspond au slug
  const tournament = allTournaments?.find(t => createSlug(t.name) === tournamentSlug)
  if (tErr) {
    console.error("load tournament error:", tErr.message)
    console.error("Tournament Slug:", tournamentSlug)
    console.error("User:", user?.id)
    console.error("Admin bypass:", isAdminBypass)
    notFound()
  }

  if (!tournament) {
    console.log("Tournament not found or access denied:", tournamentSlug)
    notFound()
  }

  // Les tournois terminés ne peuvent pas être modifiés
  if (tournament.status === "completed") {
    redirect(`/dashboard/tournaments/${tournamentSlug}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/tournaments/${tournamentSlug}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au tournoi
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <Logo size={32} />
                <div>
                  <h1 className="text-xl font-bold">Modifier le tournoi</h1>
                  <p className="text-sm text-muted-foreground">
                    {tournament.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du tournoi</CardTitle>
              <CardDescription>
                Modifiez les informations de votre tournoi.
                Ces paramètres ne pourront plus être changés une fois le tournoi démarré.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditTournamentForm tournament={tournament} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}