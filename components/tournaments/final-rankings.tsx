"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Star } from "lucide-react"

interface Ranking {
  final_position: number
  points_earned: number
  matches_won: number
  matches_lost: number
  teams: {
    id: string
    name: string
    players: {
      id: string
      first_name: string
      last_name: string
    }[]
  } | null
}

interface FinalRankingsProps {
  rankings: Ranking[]
  tournamentName: string
}

export default function FinalRankings({ rankings, tournamentName }: FinalRankingsProps) {
  const getTeamDisplayName = (team: Ranking["teams"] | undefined) => {
    if (!team) {
      return "Équipe inconnue"
    }
    if (team.name) {
      return team.name
    }
    // Si pas de nom d'équipe, utiliser les noms des joueurs
    return team.players.map(p => `${p.first_name} ${p.last_name}`).join(" / ")
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-orange-500" />
      default:
        return <Star className="h-6 w-6 text-muted-foreground" />
    }
  }

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case 2:
        return "bg-gray-100 text-gray-800 border-gray-200"
      case 3:
        return "bg-orange-100 text-orange-800 border-orange-200"
      default:
        return "bg-muted/50 text-foreground border-border"
    }
  }

  const getPositionLabel = (position: number, isExAequo: boolean = false) => {
    const suffix = isExAequo ? " ex æquo" : ""
    switch (position) {
      case 1:
        return "Champion" + suffix
      case 2:
        return "Finaliste" + suffix
      case 3:
        return "3ème place" + suffix
      default:
        return `${position}ème place` + suffix
    }
  }

  const isPositionTied = (position: number) => {
    return rankings.filter(r => r.final_position === position).length > 1
  }

  if (rankings.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Classement final non disponible</h3>
          <p className="text-muted-foreground">Le classement sera calculé une fois le tournoi terminé</p>
        </CardContent>
      </Card>
    )
  }

  // Separate podium (top 3) from the rest
  const podium = rankings.filter((r) => r.final_position <= 3).sort((a, b) => a.final_position - b.final_position)
  const otherRankings = rankings.filter((r) => r.final_position > 3).sort((a, b) => a.final_position - b.final_position)

  return (
    <div className="space-y-8">
      {/* Tournament Title */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">{tournamentName}</h2>
        <p className="text-muted-foreground">Classement final du tournoi</p>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* 2nd Place */}
          {podium.find((p) => p.final_position === 2) && (
            <div className="order-1 md:order-1">
              <Card className={`border-2 ${getPositionColor(2)} transform md:-translate-y-4`}>
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-2">{getPositionIcon(2)}</div>
                  <CardTitle className="text-lg">{getPositionLabel(2, isPositionTied(2))}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="font-bold text-xl mb-2">
                    {podium
                      .filter((p) => p.final_position === 2)
                      .map((ranking) => getTeamDisplayName(ranking.teams))
                      .join(" & ")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {podium.find((p) => p.final_position === 2)?.matches_won}V -{" "}
                    {podium.find((p) => p.final_position === 2)?.matches_lost}D
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    {podium.find((p) => p.final_position === 2)?.points_earned} pts
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 1st Place */}
          {podium.find((p) => p.final_position === 1) && (
            <div className="order-2 md:order-2">
              <Card className={`border-2 ${getPositionColor(1)} transform md:-translate-y-8`}>
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-2">{getPositionIcon(1)}</div>
                  <CardTitle className="text-xl">{getPositionLabel(1, isPositionTied(1))}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="font-bold text-2xl mb-2">
                    {podium
                      .filter((p) => p.final_position === 1)
                      .map((ranking) => getTeamDisplayName(ranking.teams))
                      .join(" & ")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {podium.find((p) => p.final_position === 1)?.matches_won}V -{" "}
                    {podium.find((p) => p.final_position === 1)?.matches_lost}D
                  </div>
                  <Badge variant="default" className="mt-2">
                    {podium.find((p) => p.final_position === 1)?.points_earned} pts
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3rd Place */}
          {podium.find((p) => p.final_position === 3) && (
            <div className="order-3 md:order-3">
              <Card className={`border-2 ${getPositionColor(3)} transform md:-translate-y-2`}>
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-2">{getPositionIcon(3)}</div>
                  <CardTitle className="text-lg">{getPositionLabel(3, isPositionTied(3))}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="font-bold text-xl mb-2">
                    {podium
                      .filter((p) => p.final_position === 3)
                      .map((ranking) => getTeamDisplayName(ranking.teams))
                      .join(" & ")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {podium.find((p) => p.final_position === 3)?.matches_won}V -{" "}
                    {podium.find((p) => p.final_position === 3)?.matches_lost}D
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    {podium.find((p) => p.final_position === 3)?.points_earned} pts
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Complete Rankings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Classement complet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rankings
              .filter((ranking) => ranking.teams) // Filtrer les rankings sans équipe
              .map((ranking) => (
              <div
                key={ranking.teams.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${getPositionColor(ranking.final_position)}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getPositionIcon(ranking.final_position)}
                    <span className="font-bold text-lg">{ranking.final_position}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      {getTeamDisplayName(ranking.teams)}
                    </div>
                    <div className="text-sm text-muted-foreground">{getPositionLabel(ranking.final_position, isPositionTied(ranking.final_position))}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {ranking.matches_won}V - {ranking.matches_lost}D
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {ranking.points_earned} points
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
