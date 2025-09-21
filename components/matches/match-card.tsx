"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Clock, Trophy, Play, Edit } from "lucide-react"
import MatchScoreForm from "./match-score-form"
import { startMatch } from "@/lib/match-actions"

interface MatchCardProps {
  match: {
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
    retired_team_id?: string | null
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
  tournamentId: string
}

export default function MatchCard({ match, tournamentId }: MatchCardProps) {
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false)

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case "group":
        return "Poule"
      case "quarter_final":
        return "Quart de finale"
      case "semi_final":
        return "Demi-finale"
      case "final":
        return "Finale"
      case "third_place":
        return "3ème place"
      default:
        return type
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "scheduled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleStartMatch = async () => {
    try {
      await startMatch(match.id, tournamentId)
    } catch (error) {
      console.error("Erreur démarrage match:", error)
    }
  }

  const player1Name = match.players_player1_idToplayers
    ? `${match.players_player1_idToplayers.first_name} ${match.players_player1_idToplayers.last_name}`
    : "TBD"
  const player2Name = match.players_player2_idToplayers
    ? `${match.players_player2_idToplayers.first_name} ${match.players_player2_idToplayers.last_name}`
    : "TBD"

  const isWinner1 = match.winner_id === match.player1_id
  const isWinner2 = match.winner_id === match.player2_id

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <Badge variant={match.match_type === "group" ? "outline" : "default"}>
                {getMatchTypeLabel(match.match_type)}
              </Badge>
              {match.groups && (
                <Badge variant="secondary" className="text-xs">
                  {match.groups.name}
                </Badge>
              )}
            </div>
            <div className="text-center">
              <div className={`font-semibold ${isWinner1 ? "text-primary" : ""}`}>
                {player1Name}
                {isWinner1 && <Trophy className="inline h-4 w-4 ml-1" />}
              </div>
              <div className="text-sm text-muted-foreground">vs</div>
              <div className={`font-semibold ${isWinner2 ? "text-primary" : ""}`}>
                {player2Name}
                {isWinner2 && <Trophy className="inline h-4 w-4 ml-1" />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {match.status === "completed" ? (
              <div className="text-center">
                <div className="text-lg font-bold">
                  {match.retired_team_id ? "DNF" : `${match.player1_score} - ${match.player2_score}`}
                </div>
                <Dialog open={isScoreDialogOpen} onOpenChange={setIsScoreDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <MatchScoreForm
                      match={match}
                      tournamentId={tournamentId}
                      onClose={() => setIsScoreDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            ) : match.status === "in_progress" ? (
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {match.retired_team_id ? "DNF" : `${match.player1_score} - ${match.player2_score}`}
                  </div>
                </div>
                <Dialog open={isScoreDialogOpen} onOpenChange={setIsScoreDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Score
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <MatchScoreForm
                      match={match}
                      tournamentId={tournamentId}
                      onClose={() => setIsScoreDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">À jouer</span>
                </div>
                {match.player1_id && match.player2_id && (
                  <Button size="sm" onClick={handleStartMatch}>
                    <Play className="h-4 w-4 mr-2" />
                    Démarrer
                  </Button>
                )}
              </div>
            )}

            <Badge className={getStatusColor(match.status)}>
              {match.status === "completed" ? "Terminé" : match.status === "in_progress" ? "En cours" : "Programmé"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
