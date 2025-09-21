import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trophy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import EditTournamentForm from "@/components/tournaments/edit-tournament-form"

export default async function EditTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()

  // Bypass pour tests
  const isAdminBypass = true

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr) console.error("getUser (edit tournament):", userErr.message)
  if (!user && !isAdminBypass) redirect("/auth/login")

  // Récupérer le tournoi
  const tournamentQuery = supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)

  if (user && !isAdminBypass) {
    tournamentQuery.eq("judge_id", user.id)
  }

  const { data: tournament, error: tErr } = await tournamentQuery.single()
  if (tErr || !tournament) {
    if (tErr) console.error("load tournament error:", tErr.message)
    notFound()
  }

  // Les tournois terminés ne peuvent pas être modifiés
  if (tournament.status === "completed") {
    redirect(`/dashboard/tournaments/${id}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/tournaments/${id}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au tournoi
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-primary" />
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