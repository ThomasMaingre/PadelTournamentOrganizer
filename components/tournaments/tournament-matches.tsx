"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Users } from "lucide-react"
import MatchCard from "@/components/matches/match-card"

interface Match {
  id: string
  match_type: string
  round_number: number
  status: string
  player1_score: number
  player2_score: number
  scheduled_time: string | null
  player1_id: string
  player2_id: string
  winner_id: string | null
  players_player1_idToplayers?: {
    first_name: string
    last_name: string
  }
  players_player2_idToplayers?: {
    first_name: string
    last_name: string
  }
  groups?: {
    name: string
  }
}

interface TournamentMatchesProps {
  matches: Match[]
  tournamentId: string
}

export default function TournamentMatches({ matches, tournamentId }: TournamentMatchesProps) {
  const groupMatches = matches.filter((m) => m.match_type === "group")
  const finalMatches = matches.filter((m) => m.match_type !== "group")

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun match programmé</h3>
          <p className="text-muted-foreground">Organisez d'abord les poules pour générer les matchs</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Group Matches */}
      {groupMatches.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Matchs de poules
          </h3>
          <div className="grid gap-4">
            {groupMatches.map((match) => (
              <MatchCard key={match.id} match={match} tournamentId={tournamentId} />
            ))}
          </div>
        </div>
      )}

      {/* Final Phase Matches */}
      {finalMatches.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Phases finales
          </h3>
          <div className="grid gap-4">
            {finalMatches.map((match) => (
              <MatchCard key={match.id} match={match} tournamentId={tournamentId} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
