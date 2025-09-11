// "use client"

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Users } from "lucide-react"

// type SimplePlayer = {
//   id: string
//   first_name: string
//   last_name: string
// }

// type Team = {
//   id: string
//   name: string | null
//   pair_weight: number | null
//   seed_position: number | null
//   // ⚠️ peut être absent selon la requête Supabase
//   players?: SimplePlayer[]
// }

// export default function TournamentTeams({
//   teams = [],
//   tournamentId,
// }: {
//   teams?: Team[]
//   tournamentId: string
// }) {
//   const safeTeams: Team[] = Array.isArray(teams) ? teams : []

//   if (safeTeams.length === 0) {
//     return (
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Users className="h-5 w-5" />
//             Équipes inscrites
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="text-sm text-muted-foreground">
//           Aucune équipe pour le moment.
//         </CardContent>
//       </Card>
//     )
//   }

//   return (
//     <div className="grid gap-4">
//       {safeTeams.map((team) => {
//         const players = Array.isArray(team.players) ? team.players : []
//         const autoName =
//           players.length === 2 ? `${players[0].last_name}/${players[1].last_name}` : null

//         return (
//           <Card key={team.id} className="hover:shadow-sm transition-shadow">
//             <CardHeader className="flex-row items-center justify-between gap-3">
//               <div className="space-y-1">
//                 <CardTitle className="text-base">
//                   {team.name || autoName || "Équipe sans nom"}
//                 </CardTitle>
//                 <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
//                   <Badge variant="outline">
//                     Tête de série&nbsp;{team.seed_position ?? "—"}
//                   </Badge>
//                   <Badge variant="secondary">
//                     Poids de paire&nbsp;{team.pair_weight ?? "—"}
//                   </Badge>
//                 </div>
//               </div>
//             </CardHeader>

//             <CardContent>
//               {players.length > 0 ? (
//                 <ul className="grid gap-2 md:grid-cols-2">
//                   {players.map((p) => (
//                     <li key={p.id} className="rounded-md border p-3 text-sm">
//                       <span className="font-medium">
//                         {p.first_name} {p.last_name}
//                       </span>
//                     </li>
//                   ))}
//                 </ul>
//               ) : (
//                 <p className="text-sm text-muted-foreground">
//                   Aucun joueur lié à cette équipe pour le moment.
//                 </p>
//               )}
//             </CardContent>
//           </Card>
//         )
//       })}
//     </div>
//   )
// }


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
