"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Crown, Users } from "lucide-react"
import { deleteTeam } from "@/lib/tournament-actions"

interface Player {
  id: string
  first_name: string
  last_name: string
  national_ranking: number | null
}

interface Team {
  id: string
  name: string | null
  seed_position: number | null
  pair_weight: number | null
  players: Player[]
}

interface TournamentTeamsProps {
  teams: Team[]
  tournamentId: string
}

export default function TournamentTeams({ teams, tournamentId }: TournamentTeamsProps) {
  const handleDeleteTeam = async (teamId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette équipe ?")) {
      await deleteTeam(teamId)
    }
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Aucune équipe inscrite</h3>
            <p>Commencez par ajouter des équipes à votre tournoi</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {teams.map((team, index) => (
        <Card key={team.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                  {team.seed_position || index + 1}
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {team.name || `Équipe ${index + 1}`}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {team.players.map((player, playerIndex) => (
                      <div key={player.id} className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {player.first_name} {player.last_name}
                          {player.national_ranking && ` (${player.national_ranking})`}
                        </Badge>
                        {playerIndex === 0 && team.players.length > 1 && (
                          <span className="text-muted-foreground">/</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {team.pair_weight && <Badge variant="secondary">Poids: {team.pair_weight.toFixed(1)}</Badge>}
                    {team.seed_position && (
                      <Badge variant="default">
                        <Crown className="h-3 w-3 mr-1" />
                        Tête de série #{team.seed_position}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteTeam(team.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
