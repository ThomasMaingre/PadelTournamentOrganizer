import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, LogOut, Plus, Calendar, Users } from "lucide-react"
import { signOut } from "@/lib/actions"
import Link from "next/link"

export default async function DashboardPage() {
  // Session utilisateur (SSR)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr) {
    console.error("getUser (dashboard):", userErr.message)
  }

  // Si pas connecté → login
  if (!user) {
    redirect("/auth/login")
  }

  // Profil juge
  const { data: judge } = await supabase
    .from("judges")
    .select("id, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle()

  // Tournois de l'utilisateur
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, status, created_at")
    .eq("judge_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Padel Tournament Organizer</h1>
                <p className="text-sm text-muted-foreground">
                  Bienvenue, {judge?.first_name ?? ""} {judge?.last_name ?? ""}
                </p>
              </div>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Actions rapides</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <Link href="/dashboard/tournaments/new">
                  <Plus className="h-12 w-12 text-primary mx-auto mb-2" />
                  <CardTitle className="text-lg">Nouveau tournoi</CardTitle>
                  <CardDescription>Créer et organiser un nouveau tournoi</CardDescription>
                </Link>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <Calendar className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Tournois en cours</CardTitle>
                <CardDescription>Gérer vos tournois actifs</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Historique</CardTitle>
                <CardDescription>Consulter les tournois terminés</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Recent Tournaments */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Mes tournois</h2>
            <Button asChild>
              <Link href="/dashboard/tournaments/new">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau tournoi
              </Link>
            </Button>
          </div>

          {tournaments && tournaments.length > 0 ? (
            <div className="grid gap-4">
              {tournaments.map((tournament: any) => (
                <Card key={tournament.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          <Link href={`/dashboard/tournaments/${tournament.id}`} className="hover:text-primary">
                            {tournament.name}
                          </Link>
                        </CardTitle>
                        <CardDescription>
                          Créé le {new Date(tournament.created_at).toLocaleDateString("fr-FR")}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tournament.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : tournament.status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {tournament.status === "completed"
                            ? "Terminé"
                            : tournament.status === "in_progress"
                              ? "En cours"
                              : "Brouillon"}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun tournoi pour le moment</h3>
                <p className="text-muted-foreground mb-4">Créez votre premier tournoi pour commencer</p>
                <Button asChild>
                  <Link href="/dashboard/tournaments/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un tournoi
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
