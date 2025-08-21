"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Crown } from "lucide-react"
import { deletePlayer } from "@/lib/tournament-actions"

interface Player {
  id: string
  first_name: string
  last_name: string
  national_ranking: number | null
  seed_position: number | null
}

interface TournamentPlayersProps {
  players: Player[]
  tournamentId: string
}

export default function TournamentPlayers({ players, tournamentId }: TournamentPlayersProps) {
  const handleDeletePlayer = async (playerId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce joueur ?")) {
      await deletePlayer(playerId)
    }
  }

  if (players.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Crown className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Aucun joueur inscrit</h3>
            <p>Commencez par ajouter des joueurs à votre tournoi</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {players.map((player, index) => (
        <Card key={player.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                  {player.seed_position || index + 1}
                </div>
                <div>
                  <h3 className="font-semibold">
                    {player.first_name} {player.last_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {player.national_ranking && (
                      <Badge variant="secondary">Classement: {player.national_ranking}</Badge>
                    )}
                    {player.seed_position && (
                      <Badge variant="default">
                        <Crown className="h-3 w-3 mr-1" />
                        Tête de série #{player.seed_position}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeletePlayer(player.id)}
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
