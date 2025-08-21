"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp } from "lucide-react"
import { calculateGroupStandings } from "@/lib/match-actions"

interface GroupStandingsProps {
  group: {
    id: string
    name: string
  }
  tournamentId: string
}

interface Standing {
  player: {
    id: string
    first_name: string
    last_name: string
  }
  matches_played: number
  matches_won: number
  matches_lost: number
  points_for: number
  points_against: number
  points_difference: number
}

export default function GroupStandings({ group, tournamentId }: GroupStandingsProps) {
  const [standings, setStandings] = useState<Standing[]>([])

  useEffect(() => {
    const loadStandings = async () => {
      const result = await calculateGroupStandings(tournamentId, group.id)
      setStandings(result)
    }
    loadStandings()
  }, [tournamentId, group.id])

  if (standings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{group.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Aucun résultat disponible</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {group.name} - Classement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {standings.map((standing, index) => (
            <div key={standing.player.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                    index === 0
                      ? "bg-yellow-100 text-yellow-800"
                      : index === 1
                        ? "bg-gray-100 text-gray-800"
                        : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {index + 1}
                  {index === 0 && <Trophy className="h-3 w-3 ml-1" />}
                </div>
                <div>
                  <div className="font-semibold">
                    {standing.player.first_name} {standing.player.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {standing.matches_won}V - {standing.matches_lost}D
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {standing.points_for} - {standing.points_against}
                </div>
                <Badge variant={standing.points_difference >= 0 ? "default" : "secondary"} className="text-xs">
                  {standing.points_difference >= 0 ? "+" : ""}
                  {standing.points_difference}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
