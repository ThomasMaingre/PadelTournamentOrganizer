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
import { cn } from "@/lib/utils"
import { Crown, Clock, Pencil } from "lucide-react"
import EnterScoreDialog from "@/components/tournaments/enter-score-dialog"
import { Button } from "@/components/ui/button"

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
  tournament_id?: string // utile si ton dialog en a besoin
}

const ORDER: Match["match_type"][] = ["round_of_32","round_of_16","quarter_final","semi_final","final"]
const LABEL: Record<Match["match_type"], string> = {
  round_of_32: "1/32",
  round_of_16: "1/16",
  quarter_final: "1/4",
  semi_final: "1/2",
  final: "Finale",
}

function TeamBadge({ team }: { team?: Team | null }) {
  if (!team?.name) return <span className="text-muted-foreground">TBD</span>
  return (
    <span className="inline-flex items-center gap-1">
      {team.name}
      {team.seed_position ? <span className="text-xs text-muted-foreground">#{team.seed_position}</span> : null}
    </span>
  )
}

function BracketCard({ children, connectUp, connectDown }: React.PropsWithChildren<{
  connectUp?: boolean
  connectDown?: boolean
}>) {
  return (
    <div className="relative">
      <div
        className={cn(
          "absolute right-[-24px] top-1/2 w-6 border-t",
          (connectUp || connectDown) ? "border-muted-foreground/40" : "border-transparent"
        )}
      />
      {connectUp && (
        <div className="absolute right-[-24px] top-1/2 h-[calc(50%-16px)] -translate-y-full border-r border-muted-foreground/40" />
      )}
      {connectDown && (
        <div className="absolute right-[-24px] top-1/2 h-[calc(50%-16px)] border-r border-muted-foreground/40" />
      )}
      <div className="rounded-xl border bg-card shadow-sm px-3 py-3 w-[260px]">
        {children}
      </div>
    </div>
  )
}

export default function KnockoutBracket({ matches }: { matches: Match[] }) {
  const [open, setOpen] = React.useState(false)
  const [current, setCurrent] = React.useState<Match | null>(null)

  const grouped = ORDER
    .map(t => [t, matches.filter(m => m.match_type === t)] as const)
    .filter(([, arr]) => arr.length > 0)

  if (grouped.length === 0) {
    return <div className="text-sm text-muted-foreground">Aucun match généré. Utilisez “Générer le tableau”.</div>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="grid auto-cols-[minmax(300px,1fr)] grid-flow-col gap-10 py-4">
          {grouped.map(([type, list], colIdx) => {
            const step = Math.pow(2, colIdx) * 28
            return (
              <div key={type} className="min-w-[300px]">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">{LABEL[type]}</h3>
                </div>
                <div className="flex flex-col" style={{ gap: `${step}px` }}>
                  {list.map((m, i) => {
                    const isTop = i % 2 === 0
                    const connectUp = !isTop
                    const connectDown = isTop
                    return (
                      <BracketCard key={m.id} connectUp={connectUp && colIdx < grouped.length - 1}
                                   connectDown={connectDown && colIdx < grouped.length - 1}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs rounded-full bg-emerald-600/10 text-emerald-700 px-2 py-0.5">
                            {m.match_type}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {m.status === "completed" ? "Terminé" :
                              m.status === "in_progress" ? "En cours" : "Programmé"}
                          </span>
                        </div>

                        <div className="space-y-1 mb-3">
                          <div className="flex items-center justify-between">
                            <TeamBadge team={m.team1} />
                            <span className="text-sm font-medium">{m.player1_score ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <TeamBadge team={m.team2} />
                            <span className="text-sm font-medium">{m.player2_score ?? 0}</span>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrent(m)
                              setOpen(true)
                            }}
                            className="h-8"
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Saisir le score
                          </Button>
                        </div>
                      </BracketCard>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dialog de saisie — on réutilise ton composant existant */}
      {current && (
        <EnterScoreDialog
          open={open}
          onOpenChange={setOpen}
          matchId={current.id}
          tournamentId={current.tournament_id as string | undefined}
          team1Name={current.team1?.name ?? "TBD"}
          team2Name={current.team2?.name ?? "TBD"}
          initialScore1={current.player1_score ?? 0}
          initialScore2={current.player2_score ?? 0}
        />
      )}
    </>
  )
}
