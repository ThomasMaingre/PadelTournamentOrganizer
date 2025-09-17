"use client"

import EnterScoreDialog from "./enter-score-dialog"
import { Badge } from "@/components/ui/badge"

type Team = { id: string; name: string | null; seed_position: number | null }
type Match = {
  id: string
  match_type: "round_of_32" | "round_of_16" | "quarter_final" | "semi_final" | "final"
  status: "scheduled" | "in_progress" | "completed"
  player1_score: number | null
  player2_score: number | null
  team1_id: string | null
  team2_id: string | null
  team1?: Team | null
  team2?: Team | null
}

const LABEL: Record<Match["match_type"], string> = {
  round_of_32: "1/32",
  round_of_16: "1/16",
  quarter_final: "1/4",
  semi_final: "1/2",
  final: "Finale",
}

export default function TournamentMatches({
  matches,
  tournamentId,
}: {
  matches: Match[]
  tournamentId: string
}) {
  const byRound = matches.reduce<Record<string, Match[]>>((acc, m) => {
    acc[m.match_type] ||= []
    acc[m.match_type].push(m)
    return acc
  }, {})

  const order: Match["match_type"][] = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"]

  return (
    <div className="space-y-8">
      {order.filter(r => byRound[r]?.length).map((round) => (
        <section key={round} className="space-y-4">
          <h3 className="text-lg font-semibold">{LABEL[round]}</h3>

          <div className="grid md:grid-cols-2 gap-4">
            {byRound[round]!.map(m => (
              <div key={m.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">{round}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {m.status === "completed" ? "Terminé" : m.status === "in_progress" ? "En cours" : "Programmé"}
                  </span>
                </div>

                <div className="space-y-1">
                  <Row team={m.team1} score={m.player1_score} />
                  <Row team={m.team2} score={m.player2_score} />
                </div>

                {m.status !== "completed" && (
                  <div className="mt-4">
                    <EnterScoreDialog match={m} tournamentId={tournamentId} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Row({ team, score }: { team?: Team | null; score: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <div className="truncate">
        {team?.name ?? <span className="text-muted-foreground">TBD</span>}
        {team?.seed_position ? <span className="ml-2 text-xs text-muted-foreground">#{team.seed_position}</span> : null}
      </div>
      <div className="text-sm font-medium">{score ?? 0}</div>
    </div>
  )
}
