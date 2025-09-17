"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Player = { id: string; first_name: string; last_name: string }
type Team = {
  id: string
  name: string | null
  pair_weight: number | null
  seed_position: number | null
  players?: Player[]
}

export default function TournamentTeams({
  teams,
}: {
  teams: Team[]
  tournamentId: string
}) {
  if (!teams || teams.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Aucune équipe inscrite pour le moment.
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => (
        <Card key={team.id} className="p-3 md:p-4">
          {/* En-tête compact */}
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-medium text-sm md:text-base">
              {team.name || "Équipe sans nom"}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-6 px-2 text-[10px] md:text-xs">
                Tête de série {team.seed_position ?? "—"}
              </Badge>
              <Badge variant="secondary" className="h-6 px-2 text-[10px] md:text-xs">
                Poids de paire {team.pair_weight ?? "—"}
              </Badge>
            </div>
          </div>

          {/* Joueurs – boxes compactes */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(team.players ?? []).slice(0, 2).map((p) => (
              <div
                key={p.id}
                className="rounded-md border bg-background px-3 py-2 text-sm"
                title={`${p.first_name} ${p.last_name}`}
              >
                <span className="truncate block">
                  {p.first_name} {p.last_name}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
