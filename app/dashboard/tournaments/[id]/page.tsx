import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Trophy, ArrowLeft, Users, Plus, Settings, Play, Target, Calendar, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import TournamentTeams from "@/components/tournaments/tournament-teams"
import TournamentGroups from "@/components/tournaments/tournament-groups"
import TournamentMatches from "@/components/tournaments/tournament-matches"
import GroupStandings from "@/components/tournaments/group-standings"
import FinalRankings from "@/components/tournaments/final-rankings"
import AddTeamForm from "@/components/tournaments/add-team-form"

import {
  calculateTeamSeeding,
  organizeGroups,
  generateFinalPhase,
  startTournament,
} from "@/lib/tournament-actions"
import { completeTournament } from "@/lib/ranking-actions"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr) console.error("getUser (tournament page):", userErr.message)
  if (!user) redirect("/auth/login")

  // Tournoi
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .eq("judge_id", user.id)
    .single()
  if (tErr || !tournament) {
    if (tErr) console.error("load tournament error:", tErr.message)
    notFound()
  }

  // Équipes (séparé des joueurs pour éviter l'erreur de relation manquante)
  const { data: teamsRaw, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name, pair_weight, seed_position")
    .eq("tournament_id", id)
    .order("seed_position", { ascending: true, nullsLast: true })
  if (teamsErr) console.error("Load teams error:", teamsErr.message)

  const { data: playersByTeam, error: playersErr } = await supabase
    .from("players")
    .select("id, first_name, last_name, team_id")
    .eq("tournament_id", id)
  if (playersErr) console.error("Load players for teams error:", playersErr.message)

  const teams =
    (teamsRaw ?? []).map((t) => ({
      ...t,
      players: (playersByTeam ?? []).filter((p) => p.team_id === t.id),
    })) ?? []

  // Poules (toujours basées joueurs pour le moment)
  const { data: groups, error: groupsErr } = await supabase
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
    .eq("tournament_id", id)
    .order("name")
  if (groupsErr) console.error("Load groups error:", groupsErr.message)

  // Matchs (encore basés joueurs)
  const { data: matches, error: matchesErr } = await supabase
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
      groups ( name )
    `)
    .eq("tournament_id", id)
    .order("match_type")
  if (matchesErr) console.error("Load matches error:", matchesErr.message)

  // Classement final
  const { data: finalRankings } = await supabase
    .from("tournament_rankings")
    .select(`
      final_position,
      points_earned,
      matches_won,
      matches_lost,
      players ( id, first_name, last_name )
    `)
    .eq("tournament_id", id)
    .order("final_position")

  // Server Actions (liaison d'id pour éviter d'accéder à params dans les closures)
  const calculateSeedingAction = calculateTeamSeeding.bind(null, id)
  const organizeGroupsAction = organizeGroups.bind(null, id)
  const generateFinalPhaseAction = generateFinalPhase.bind(null, id)
  const startTournamentAction = startTournament.bind(null, id)
  const completeTournamentAction = completeTournament.bind(null, id)

  const finalMatch = matches?.find((m) => m.match_type === "final")
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
                    {teams.length} équipes inscrites • Max: {Math.floor((tournament.max_players ?? 0) / 2)}
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
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tournament.status === "completed"
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
        <div className="grid lg:grid-cols-6 gap-8">
          {/* Main */}
          <div className="lg:col-span-3">
            <Tabs defaultValue={tournament.status === "completed" ? "rankings" : "teams"} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="teams">Équipes</TabsTrigger>
                <TabsTrigger value="groups">Poules</TabsTrigger>
                <TabsTrigger value="matches">Matchs</TabsTrigger>
                <TabsTrigger value="standings">Classements</TabsTrigger>
                <TabsTrigger value="rankings">Podium</TabsTrigger>
              </TabsList>

              {/* ÉQUIPES */}
              <TabsContent value="teams" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    Équipes inscrites
                  </h2>
                  {tournament.status === "draft" && (
                    <Button size="sm" asChild>
                      <Link href="#add-team">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une équipe
                      </Link>
                    </Button>
                  )}
                </div>
                <TournamentTeams teams={teams} tournamentId={id} />
              </TabsContent>

              {/* POULES */}
              <TabsContent value="groups" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Target className="h-6 w-6" />
                    Organisation des poules
                  </h2>
                </div>
                <TournamentGroups groups={groups || []} />
              </TabsContent>

              {/* MATCHS */}
              <TabsContent value="matches" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Calendar className="h-6 w-6" />
                    Matchs du tournoi
                  </h2>
                </div>
                <TournamentMatches matches={matches || []} tournamentId={id} />
              </TabsContent>

              {/* CLASSEMENTS POULES */}
              <TabsContent value="standings" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Trophy className="h-6 w-6" />
                    Classements des poules
                  </h2>
                </div>
                {groups && groups.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {groups.map((group) => (
                      <GroupStandings key={group.id} group={group} tournamentId={id} />
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

              {/* PODIUM */}
              <TabsContent value="rankings" className="mt-6">
                <FinalRankings rankings={finalRankings || []} tournamentName={tournament.name} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Ajout équipe */}
            {tournament.status === "draft" && (
              <Card id="add-team">
                <CardHeader>
                  <CardTitle className="text-lg">Ajouter une équipe</CardTitle>
                  <CardDescription>Inscrivez une nouvelle équipe au tournoi</CardDescription>
                </CardHeader>
                <CardContent>
                  <AddTeamForm tournamentId={id} />
                </CardContent>
              </Card>
            )}

            {/* Actions tournoi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions du tournoi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tournament.status === "draft" && (
                  <>
                    <form action={calculateSeedingAction}>
                      <Button className="w-full bg-transparent" variant="outline" disabled={!teams || teams.length < 2}>
                        <Target className="h-4 w-4 mr-2" />
                        Calculer les têtes de série
                      </Button>
                    </form>

                    <form action={organizeGroupsAction}>
                      <Button className="w-full bg-transparent" variant="outline" disabled={!teams || teams.length < 4}>
                        <Users className="h-4 w-4 mr-2" />
                        Organiser les poules
                      </Button>
                    </form>

                    <form action={generateFinalPhaseAction}>
                      <Button className="w-full bg-transparent" variant="outline" disabled={!groups || groups.length === 0}>
                        <Trophy className="h-4 w-4 mr-2" />
                        Générer phases finales
                      </Button>
                    </form>

                    <form action={startTournamentAction}>
                      <Button className="w-full" disabled={!matches || matches.length === 0}>
                        <Play className="h-4 w-4 mr-2" />
                        Démarrer le tournoi
                      </Button>
                    </form>
                  </>
                )}

                {tournament.status === "in_progress" && canCompleteTournament && (
                  <form action={completeTournamentAction}>
                    <Button className="w-full">
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

                {teams && teams.length < 2 && tournament.status === "draft" && (
                  <p className="text-xs text-muted-foreground text-center">
                    Minimum 2 équipes requis pour démarrer
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
