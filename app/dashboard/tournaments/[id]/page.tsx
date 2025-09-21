import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Trophy, ArrowLeft, Users, Plus, Settings, Edit, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import TournamentTeams from "@/components/tournaments/tournament-teams"
import KnockoutBracket from "@/components/tournaments/knockout-bracket"
import FinalRankings from "@/components/tournaments/final-rankings"
import AddTeamForm from "@/components/tournaments/add-team-form"
import BulkTeamForm from "@/components/tournaments/bulk-team-form"
import TournamentActions from "@/components/tournaments/tournament-actions"
import RemoveAllTeamsButton from "@/components/tournaments/remove-all-teams-button"
import DeleteTournamentButton from "@/components/tournaments/delete-tournament-button"

import {
  calculateTeamSeeding,
  generateKnockoutBracket,
  startTournament,
  resetTournament,
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

  // 🔓 BYPASS pour tests
  const isAdminBypass = true; // Bypass temporaire pour tests

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr) console.error("getUser (tournament page):", userErr.message)
  if (!user && !isAdminBypass) redirect("/auth/login")

  // Tournoi
  let tournamentQuery = supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)

  // Pour les tests, on skip la vérification judge_id
  if (user && !isAdminBypass) {
    tournamentQuery = tournamentQuery.eq("judge_id", user.id)
  }

  const { data: tournament, error: tErr } = await tournamentQuery.maybeSingle()
  if (tErr) {
    console.error("load tournament error:", tErr.message)
    console.error("Tournament ID:", id)
    console.error("User:", user?.id)
    console.error("Admin bypass:", isAdminBypass)
    notFound()
  }

  if (!tournament) {
    console.log("Tournament not found or access denied:", id)
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
    .select("id, first_name, last_name, team_id, national_ranking")
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
  const resetTournamentAction = resetTournament.bind(null, id)

  const finalMatch = matches?.find((m) => m.match_type === "final")
  const canCompleteTournament = finalMatch?.status === "completed" && tournament.status === "in_progress"

  // Vérifier si les équipes ont des positions de tête de série
  const teamsWithSeeds = teams.some(team => team.seed_position !== null && team.name !== 'TBD')

  // Formater les dates
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const startDate = formatDate(tournament.start_date)
  const endDate = formatDate(tournament.end_date)

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
                    {teams.filter(t => t.name !== 'TBD').length} équipes inscrites • Max: {Math.floor((tournament.max_players ?? 0) / 2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {startDate ? `Du ${startDate}` : 'Date de début non définie'}
                    {' • '}
                    {endDate ? `au ${endDate}` : 'Date de fin non définie'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tournament.status !== "completed" ? (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/tournaments/${id}/edit`}>
                      <Edit className="h-4 w-4 mr-2" />
                      {tournament.status === "draft" ? "Modifier" : "Modifier les dates"}
                    </Link>
                  </Button>
                  <DeleteTournamentButton
                    tournamentId={id}
                    tournamentName={tournament.name}
                  />
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/50 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">Tournoi terminé</span>
                </div>
              )}
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
                    <div className="flex items-center gap-2">
                      <RemoveAllTeamsButton
                        tournamentId={id}
                        teamsCount={teams.filter(t => t.name !== 'TBD').length}
                      />
                      <Button size="sm" asChild>
                        <Link href="#add-team">
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter une équipe
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
                <TournamentTeams teams={teams} tournamentId={id} tournamentStatus={tournament.status} />
              </TabsContent>

              {/* TABLEAU */}
              <TabsContent value="bracket" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Tableau à élimination directe</h2>
                </div>
                <KnockoutBracket matches={matches || []} tournamentId={id} tournamentStatus={tournament.status} />
              </TabsContent>

              {/* PODIUM */}
              <TabsContent value="rankings" className="mt-6">
                <FinalRankings rankings={finalRankings || []} tournamentName={tournament.name} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Actions tournoi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions du tournoi</CardTitle>
              </CardHeader>
              <CardContent>
                <TournamentActions
                  tournamentId={id}
                  status={tournament.status}
                  hasMatches={!!(matches && matches.length > 0)}
                  hasTeams={!!(teams && teams.filter(t => t.name !== 'TBD').length >= 2)}
                  canComplete={canCompleteTournament}
                  teamsWithSeeds={teamsWithSeeds}
                  currentTeamsCount={teams.filter(t => t.name !== 'TBD').length}
                  maxTeams={Math.floor((tournament.max_players ?? 0) / 2)}
                  calculateSeedingAction={calculateSeedingAction}
                  generateBracketAction={generateBracketAction}
                  startTournamentAction={startTournamentAction}
                  completeTournamentAction={completeTournamentAction}
                  resetTournamentAction={resetTournamentAction}
                />
              </CardContent>
            </Card>

            {/* Ajout équipe */}
            {tournament.status === "draft" && (
              <>
                <Card id="add-team">
                  <CardHeader>
                    <CardTitle className="text-lg">Ajouter une équipe</CardTitle>
                    <CardDescription>Inscrivez une nouvelle équipe au tournoi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AddTeamForm tournamentId={id} />
                  </CardContent>
                </Card>

                {/* Création automatique d'équipes */}
                <BulkTeamForm
                  tournamentId={id}
                  maxTeams={Math.floor((tournament.max_players ?? 0) / 2)}
                  currentTeamsCount={teams.filter(t => t.name !== 'TBD').length}
                />
              </>
            )}

            {/* Informations tournoi démarré */}
            {tournament.status !== "draft" && (
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                    <Lock className="h-5 w-5" />
                    Tournoi en cours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-700 mb-3">
                    Ce tournoi a été démarré et ne peut plus être modifié.
                    Les paramètres du tournoi et la liste des équipes sont verrouillés.
                  </p>
                  <div className="text-xs text-amber-600">
                    <p>• Impossible de modifier le nom ou les paramètres</p>
                    <p>• Impossible d'ajouter ou supprimer des équipes</p>
                    <p>• Seule la réinitialisation peut remettre à zéro</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
