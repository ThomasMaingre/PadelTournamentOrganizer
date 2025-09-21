// "use client"

// import React from "react"
// import { Crown, Clock } from "lucide-react"
// import { cn } from "@/lib/utils"

// type Team = { id: string; name: string | null; seed_position: number | null }
// type Match = {
//   id: string
//   match_type: "round_of_32" | "round_of_16" | "quarter_final" | "semi_final" | "final"
//   status: "scheduled" | "in_progress" | "completed"
//   player1_score: number | null
//   player2_score: number | null
//   team1_id: string | null
//   team2_id: string | null
//   team1?: Team | null
//   team2?: Team | null
//   created_at?: string
// }

// const ORDER: Match["match_type"][] = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"]
// const LABEL: Record<Match["match_type"], string> = {
//   round_of_32: "1/32",
//   round_of_16: "1/16",
//   quarter_final: "1/4",
//   semi_final: "1/2",
//   final: "Finale",
// }

// function TeamBadge({ team }: { team?: Team | null }) {
//   if (!team?.name) return <span className="text-muted-foreground">TBD</span>
//   return (
//     <span className="inline-flex items-center gap-1">
//       {team.name}
//       {team.seed_position ? (
//         <span className="text-xs text-muted-foreground">#{team.seed_position}</span>
//       ) : null}
//     </span>
//   )
// }

// function BracketCard({
//   children,
//   connectUp,
//   connectDown,
// }: React.PropsWithChildren<{ connectUp?: boolean; connectDown?: boolean }>) {
//   return (
//     <div className="relative">
//       <div
//         className={cn(
//           "absolute right-[-24px] top-1/2 w-6 border-t",
//           connectUp || connectDown ? "border-muted-foreground/40" : "border-transparent",
//         )}
//       />
//       {connectUp && (
//         <div className="absolute right-[-24px] top-1/2 h-[calc(50%-16px)] -translate-y-full border-r border-muted-foreground/40" />
//       )}
//       {connectDown && (
//         <div className="absolute right-[-24px] top-1/2 h-[calc(50%-16px)] border-r border-muted-foreground/40" />
//       )}
//       <div className="rounded-xl border bg-card shadow-sm px-3 py-3 w-[260px]">{children}</div>
//     </div>
//   )
// }

// export default function KnockoutBracket({ matches }: { matches: Match[] }) {
//   const grouped = ORDER.map((t) => [t, matches.filter((m) => m.match_type === t)] as const).filter(
//     ([, arr]) => arr.length > 0,
//   )

//   if (grouped.length === 0) {
//     return <div className="text-sm text-muted-foreground">Aucun match. Cliquez « Générer le tableau ».</div>
//   }

//   return (
//     <div className="overflow-x-auto">
//       {/* Astuce largeur colonne : modifie minmax(280px,1fr) */}
//       <div className="grid auto-cols-[minmax(280px,1fr)] grid-flow-col gap-10 py-4">
//         {grouped.map(([type, list], colIdx) => {
//           const step = Math.pow(2, colIdx) * 24 // espacement vertical entre cartes
//           return (
//             <div key={type} className="min-w-[280px]">
//               <div className="flex items-center gap-2 mb-3">
//                 <Crown className="h-4 w-4 text-primary" />
//                 <h3 className="text-sm font-semibold">{LABEL[type]}</h3>
//               </div>
//               <div className="flex flex-col" style={{ gap: `${step}px` }}>
//                 {list.map((m, i) => {
//                   const isTop = i % 2 === 0
//                   const connectUp = !isTop && colIdx < grouped.length - 1
//                   const connectDown = isTop && colIdx < grouped.length - 1

//                   return (
//                     <BracketCard key={m.id} connectUp={connectUp} connectDown={connectDown}>
//                       <div className="flex items-center justify-between mb-2">
//                         <span className="text-xs rounded-full bg-emerald-600/10 text-emerald-700 px-2 py-0.5">
//                           {m.match_type}
//                         </span>
//                         <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
//                           <Clock className="h-3 w-3" />
//                           {m.status === "completed" ? "Terminé" : m.status === "in_progress" ? "En cours" : "Programmé"}
//                         </span>
//                       </div>
//                       <div className="space-y-1">
//                         <div className="flex items-center justify-between">
//                           <TeamBadge team={m.team1} />
//                           <span className="text-sm font-medium">{m.player1_score ?? 0}</span>
//                         </div>
//                         <div className="flex items-center justify-between">
//                           <TeamBadge team={m.team2} />
//                           <span className="text-sm font-medium">{m.player2_score ?? 0}</span>
//                         </div>
//                       </div>
//                     </BracketCard>
//                   )
//                 })}
//               </div>
//             </div>
//           )
//         })}
//       </div>
//     </div>
//   )
// }



"use client"

import React from "react"
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
  tournament_id?: string
  round_number?: number
  winner_team_id?: string | null
}

const LABEL: Record<string, string> = {
  round_of_32: "1/32",
  round_of_16: "1er tour",
  round_of_8: "1/8 de finale",
  quarter_final: "Quarts de finale",
  semi_final: "Demi-finales",
  final: "Finale",
}

export default function KnockoutBracket({ matches, tournamentId }: { matches: Match[]; tournamentId?: string }) {
  // Filtrer les BYE matches du 1er tour (ne pas les afficher)
  const filteredMatches = matches.filter(m => {
    // Enlever les BYE matches du round_of_16 (1er tour)
    if (m.match_type === "round_of_16" && m.team1_id === m.team2_id) {
      return false
    }
    return true
  })

  // Grouper les matchs par rounds selon la logique du tournoi
  const byRound: Record<string, Match[]> = {}

  filteredMatches.forEach(m => {
    if (m.match_type === "round_of_16") {
      byRound["round_of_16"] ||= []
      byRound["round_of_16"].push(m)
    } else if (m.match_type === "quarter_final") {
      byRound["quarter_final"] ||= []
      byRound["quarter_final"].push(m)
    } else if (m.match_type === "semi_final") {
      byRound["semi_final"] ||= []
      byRound["semi_final"].push(m)
    } else if (m.match_type === "final") {
      byRound["final"] ||= []
      byRound["final"].push(m)
    }
  })

  const order = ["round_of_16", "quarter_final", "semi_final", "final"]
  const roundsWithMatches = order.filter(r => byRound[r]?.length)

  if (roundsWithMatches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucun match généré. Utilisez "Générer le tableau".</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {roundsWithMatches.map((round) => (
        <section key={round} className="space-y-4">
          <h3 className="text-lg font-semibold">{LABEL[round]}</h3>

          <div className="grid md:grid-cols-2 gap-4">
            {byRound[round]!.map(m => {
              const hasTBD = m.team1?.name === 'TBD' || m.team2?.name === 'TBD'

              return (
                <div key={m.id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary">{LABEL[round]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {m.status === "completed" ? "Terminé" : m.status === "in_progress" ? "En cours" : "Programmé"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <Row
                      team={m.team1}
                      score={hasTBD ? null : m.player1_score}
                      isWinner={m.status === "completed" && m.winner_team_id === m.team1_id}
                      forceTBD={false}
                      isBye={false}
                      showTBDForQuarters={false}
                      hideScore={hasTBD}
                    />
                    <Row
                      team={m.team2}
                      score={hasTBD ? null : m.player2_score}
                      isWinner={m.status === "completed" && m.winner_team_id === m.team2_id}
                      forceTBD={false}
                      isBye={m.team1_id === m.team2_id && m.status === "completed"}
                      showTBDForQuarters={
                        (m.match_type === "quarter_final" || m.match_type === "semi_final" || m.match_type === "final") &&
                        m.team1_id === m.team2_id &&
                        m.status === "scheduled"
                      }
                      hideScore={hasTBD}
                    />
                  </div>

                  {m.status !== "completed" && !hasTBD && (
                    <div className="mt-4">
                      <EnterScoreDialog match={m} tournamentId={tournamentId || m.tournament_id || ""} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function Row({ team, score, isWinner, forceTBD, isBye, showTBDForQuarters, hideScore }: { team?: Team | null; score: number | null; isWinner?: boolean; forceTBD?: boolean; isBye?: boolean; showTBDForQuarters?: boolean; hideScore?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${isWinner ? 'font-semibold text-green-700 bg-green-50 px-2 py-1 rounded' : ''}`}>
      <div className="truncate flex items-center gap-2">
        {forceTBD ? (
          <span className="text-muted-foreground">À définir</span>
        ) : isBye ? (
          <span className="text-muted-foreground">BYE</span>
        ) : showTBDForQuarters ? (
          <span className="text-muted-foreground">À définir</span>
        ) : team?.name === 'TBD' ? (
          <span className="text-muted-foreground">À définir</span>
        ) : (
          team?.name ?? <span className="text-muted-foreground">À définir</span>
        )}
        {!forceTBD && !isBye && !showTBDForQuarters && team?.name !== 'TBD' && team?.seed_position ? <span className="ml-2 text-xs text-muted-foreground">#{team.seed_position}</span> : null}
        {isWinner && !isBye && !showTBDForQuarters && team?.name !== 'TBD' && <span className="text-green-600 text-xs font-bold">VAINQUEUR</span>}
      </div>
      <div className="text-sm font-medium">{hideScore ? '' : (isBye ? 0 : (team?.name === 'TBD' ? '' : (score ?? 0)))}</div>
    </div>
  )
}
