import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Trophy, ArrowLeft, Users, Plus, Settings, Play, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import TournamentTeams from "@/components/tournaments/tournament-teams"
import TournamentMatches from "@/components/tournaments/tournament-matches"
import FinalRankings from "@/components/tournaments/final-rankings"
import AddTeamForm from "@/components/tournaments/add-team-form"

import {
  calculateTeamSeeding,
  generateKnockoutBracket,
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

  // Équipes (avec joueurs)
  const { data: teamsRaw, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name, pair_weight, seed_position")
    .eq("tournament_id", id)
    .order("seed_position", { ascending: true, nullsLast: true })
  if (teamsErr) console.error("Load teams error:", teamsErr.message)

  const { data: playersByTeam } = await supabase
    .from("players")
    .select("id, first_name, last_name, team_id")
    .eq("tournament_id", id)

  const teams =
    (teamsRaw ?? []).map((t) => ({
      ...t,
      players: (playersByTeam ?? []).filter((p) => p.team_id === t.id),
    })) ?? []

  // Matchs (relations équipes)
  // const { data: matches, error: matchesErr } = await supabase
  //   .from("matches")
  //   .select(`
  //     id,
  //     match_type,
  //     round_number,
  //     status,
  //     player1_score,
  //     player2_score,
  //     scheduled_time,
  //     created_at,
  //     team1_id,
  //     team2_id,
  //     winner_team_id,
  //     team1:teams!matches_team1_id_fkey ( id, name, seed_position ),
  //     team2:teams!matches_team2_id_fkey ( id, name, seed_position )
  //   `)
  //   .eq("tournament_id", id)
  //   .order("created_at", { ascending: true })
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
    team1_id,
    team2_id,
    winner_team_id,
    tournament_id,
    created_at,
    team1:teams!matches_team1_id_fkey ( id, name, seed_position ),
    team2:teams!matches_team2_id_fkey ( id, name, seed_position )
  `)
  .eq("tournament_id", id)
  .order("created_at", { ascending: true })

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

  // Server actions
  const calculateSeedingAction = calculateTeamSeeding.bind(null, id)
  const generateBracketAction = generateKnockoutBracket.bind(null, id)
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

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-6 gap-8">
          {/* zone principale élargie */}
          <div className="lg:col-span-4">
            <Tabs defaultValue={tournament.status === "completed" ? "rankings" : "teams"} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="teams">Équipes</TabsTrigger>
                <TabsTrigger value="bracket">Tableau</TabsTrigger>
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

              {/* TABLEAU */}
              <TabsContent value="bracket" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Tableau à élimination directe</h2>
                </div>
                <TournamentMatches matches={matches || []} tournamentId={id} />
              </TabsContent>

              {/* PODIUM */}
              <TabsContent value="rankings" className="mt-6">
                <FinalRankings rankings={finalRankings || []} tournamentName={tournament.name} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
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

                    <form action={generateBracketAction}>
                      <Button className="w-full bg-transparent" variant="outline" disabled={!teams || teams.length < 2}>
                        <Trophy className="h-4 w-4 mr-2" />
                        Générer le tableau
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
                      Clôturer le tournoi
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
