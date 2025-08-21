"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"

interface Group {
  id: string
  name: string
  group_players: {
    players: {
      id: string
      first_name: string
      last_name: string
      seed_position: number | null
    }
  }[]
}

interface TournamentGroupsProps {
  groups: Group[]
}

export default function TournamentGroups({ groups }: TournamentGroupsProps) {
  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune poule créée</h3>
          <p className="text-muted-foreground">Organisez les poules pour voir la répartition des joueurs</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              {group.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {group.group_players.map((gp, index) => (
                <div key={gp.players.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {gp.players.seed_position || index + 1}
                    </div>
                    <div>
                      <div className="font-medium">
                        {gp.players.first_name} {gp.players.last_name}
                      </div>
                    </div>
                  </div>
                  {gp.players.seed_position && (
                    <Badge variant="secondary" className="text-xs">
                      T.S. #{gp.players.seed_position}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
