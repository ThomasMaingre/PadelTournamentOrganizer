import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, ArrowLeft, Users, Plus, Settings, Play, Target, Calendar, CheckCircle } from "lucide-react"
import Link from "next/link"
import TournamentPlayers from "@/components/tournaments/tournament-players"
import TournamentGroups from "@/components/tournaments/tournament-groups"
import TournamentMatches from "@/components/tournaments/tournament-matches"
import GroupStandings from "@/components/tournaments/group-standings"
import FinalRankings from "@/components/tournaments/final-rankings"
import AddPlayerForm from "@/components/tournaments/add-player-form"
import { calculateSeeding, organizeGroups, generateFinalPhase, startTournament } from "@/lib/tournament-actions"
import { completeTournament } from "@/lib/ranking-actions"

interface TournamentPageProps {
  params: {
    id: string
  }
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  // Auth sécurisée (Next 15: client serveur async + getUser)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr) console.error("getUser([id]):", userErr.message)
  if (!user) {
    redirect("/auth/login")
  }

  // Détails du tournoi (protégé par judge_id)
  const { data: tournament, error: tError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", params.id)
    .eq("judge_id", user!.id)
    .maybeSingle()

  if (tError) console.error("tournament load error:", tError.message)
  if (!tournament) {
    notFound()
  }

  // Joueurs du tournoi
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("tournament_id", params.id)
    .order("seed_position", { ascending: true, nullsLast: true })

  // Poules du tournoi
  const { data: groups } = await supabase
    .from("groups")
    .select(`
      id,
      name,
      group_players (
        players (
          id,
          first_name,
          last_name,
          seed_position
        )
      )
    `)
    .eq("tournament_id", params.id)
    .order("name")

  // Matchs du tournoi
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id,
      match_type,
      round_number,
      status,
      player1_score,
      player2_score,
      scheduled_time,
      player1_id,
      player2_id,
      winner_id,
      players_player1_idToplayers:players!matches_player1_id_fkey (
        first_name,
        last_name
      ),
      players_player2_idToplayers:players!matches_player2_id_fkey (
        first_name,
        last_name
      ),
      groups (
        name
      )
    `)
    .eq("tournament_id", params.id)
    .order("match_type")

  // Classement final (si terminé)
  const { data: finalRankings } = await supabase
    .from("tournament_rankings")
    .select(`
      final_position,
      points_earned,
      matches_won,
      matches_lost,
      players (
        id,
        first_name,
        last_name
      )
    `)
    .eq("tournament_id", params.id)
    .order("final_position")

  // Server Actions (inchangées)
  const handleCalculateSeeding = async () => {
    "use server"
    await calculateSeeding(params.id)
  }
  const handleOrganizeGroups = async () => {
    "use server"
    await organizeGroups(params.id)
  }
  const handleGenerateFinalPhase = async () => {
    "use server"
    await generateFinalPhase(params.id)
  }
  const handleStartTournament = async () => {
    "use server"
    await startTournament(params.id)
  }
  const handleCompleteTournament = async () => {
    "use server"
    await completeTournament(params.id)
  }

  const finalMatch = matches?.find((m: any) => m.match_type === "final")
  const canCompleteTournament = finalMatch?.status === "completed" && tournament.status === "in_progress"

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">{tournament.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {players?.length || 0} joueurs inscrits • Max: {tournament.max_players}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </Button>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Tournament Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue={tournament.status === "completed" ? "rankings" : "players"} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="players">Joueurs</TabsTrigger>
                <TabsTrigger value="groups">Poules</TabsTrigger>
                <TabsTrigger value="matches">Matchs</TabsTrigger>
                <TabsTrigger value="standings">Classements</TabsTrigger>
                <TabsTrigger value="rankings">Podium</TabsTrigger>
              </TabsList>

              <TabsContent value="players" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    Joueurs inscrits
                  </h2>
                  {tournament.status === "draft" && (
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un joueur
                    </Button>
                  )}
                </div>
                <TournamentPlayers players={players || []} tournamentId={params.id} />
              </TabsContent>

              <TabsContent value="groups" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Target className="h-6 w-6" />
                    Organisation des poules
                  </h2>
                </div>
                <TournamentGroups groups={groups || []} />
              </TabsContent>

              <TabsContent value="matches" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Calendar className="h-6 w-6" />
                    Matchs du tournoi
                  </h2>
                </div>
                <TournamentMatches matches={matches || []} tournamentId={params.id} />
              </TabsContent>

              <TabsContent value="standings" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Trophy className="h-6 w-6" />
                    Classements des poules
                  </h2>
                </div>
                {groups && groups.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {groups.map((group: any) => (
                      <GroupStandings key={group.id} group={group} tournamentId={params.id} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Aucun classement disponible</h3>
                      <p className="text-muted-foreground">
                        Organisez les poules et jouez des matchs pour voir les classements
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="rankings" className="mt-6">
                <FinalRankings rankings={finalRankings || []} tournamentName={tournament.name} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Add Player Form - only show if tournament is draft */}
            {tournament.status === "draft" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ajouter un joueur</CardTitle>
                  <CardDescription>Inscrivez un nouveau joueur au tournoi</CardDescription>
                </CardHeader>
                <CardContent>
                  <AddPlayerForm tournamentId={params.id} />
                </CardContent>
              </Card>
            )}

            {/* Tournament Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions du tournoi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tournament.status === "draft" && (
                  <>
                    <form action={handleCalculateSeeding}>
                      <Button
                        type="submit"
                        className="w-full bg-transparent"
                        variant="outline"
                        disabled={!players || players.length < 4}
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Calculer les têtes de série
                      </Button>
                    </form>

                    <form action={handleOrganizeGroups}>
                      <Button
                        type="submit"
                        className="w-full bg-transparent"
                        variant="outline"
                        disabled={!players || players.length < 4}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Organiser les poules
                      </Button>
                    </form>

                    <form action={handleGenerateFinalPhase}>
                      <Button
                        type="submit"
                        className="w-full bg-transparent"
                        variant="outline"
                        disabled={!groups || groups.length === 0}
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Générer phases finales
                      </Button>
                    </form>

                    <form action={handleStartTournament}>
                      <Button type="submit" className="w-full" disabled={!matches || matches.length === 0}>
                        <Play className="h-4 w-4 mr-2" />
                        Démarrer le tournoi
                      </Button>
                    </form>
                  </>
                )}

                {tournament.status === "in_progress" && canCompleteTournament && (
                  <form action={handleCompleteTournament}>
                    <Button type="submit" className="w-full">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Clôturer le tournoi
                    </Button>
                  </form>
                )}

                {tournament.status === "completed" && (
                  <div className="text-center py-4">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Tournoi terminé</p>
                  </div>
                )}

                {players && players.length < 4 && tournament.status === "draft" && (
                  <p className="text-xs text-muted-foreground text-center">Minimum 4 joueurs requis pour démarrer</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
