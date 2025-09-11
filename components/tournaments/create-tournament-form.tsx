// "use client"

// import { useActionState } from "react"
// import { useFormStatus } from "react-dom"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Label } from "@/components/ui/label"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Loader2 } from "lucide-react"
// import { useRouter } from "next/navigation"
// import { useEffect } from "react"
// import { createTournament } from "@/lib/tournament-actions"

// function SubmitButton() {
//   const { pending } = useFormStatus()

//   return (
//     <Button type="submit" disabled={pending} className="w-full" size="lg">
//       {pending ? (
//         <>
//           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//           Création du tournoi...
//         </>
//       ) : (
//         "Créer le tournoi"
//       )}
//     </Button>
//   )
// }

// interface CreateTournamentFormProps {
//   judgeId: string
// }

// export default function CreateTournamentForm({ judgeId }: CreateTournamentFormProps) {
//   const router = useRouter()
//   const [state, formAction] = useActionState(createTournament, null)

//   // Handle successful tournament creation
//   useEffect(() => {
//     if (state?.success && state?.tournamentId) {
//       router.push(`/dashboard/tournaments/${state.tournamentId}`)
//     }
//   }, [state, router])

//   return (
//     <Card className="max-w-2xl mx-auto">
//       <CardHeader>
//         <CardTitle className="text-2xl">Créer un nouveau tournoi</CardTitle>
//         <CardDescription>Configurez les paramètres de base de votre tournoi de padel</CardDescription>
//       </CardHeader>
//       <CardContent>
//         <form action={formAction} className="space-y-6">
//           <input type="hidden" name="judgeId" value={judgeId} />

//           {state?.error && (
//             <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
//               {state.error}
//             </div>
//           )}

//           <div className="space-y-2">
//             <Label htmlFor="name">Nom du tournoi</Label>
//             <Input
//               id="name"
//               name="name"
//               type="text"
//               placeholder="Tournoi de Padel - Janvier 2025"
//               required
//               className="h-11"
//             />
//           </div>

//           <div className="grid grid-cols-2 gap-4">
//             <div className="space-y-2">
//               <Label htmlFor="startDate">Date de début</Label>
//               <Input id="startDate" name="startDate" type="date" required className="h-11" />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="endDate">Date de fin (optionnel)</Label>
//               <Input id="endDate" name="endDate" type="date" className="h-11" />
//             </div>
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="maxPlayers">Nombre maximum de joueurs</Label>
//             <Select name="maxPlayers" defaultValue="32">
//               <SelectTrigger className="h-11">
//                 <SelectValue placeholder="Sélectionnez le nombre de joueurs" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="8">8 joueurs</SelectItem>
//                 <SelectItem value="16">16 joueurs</SelectItem>
//                 <SelectItem value="32">32 joueurs</SelectItem>
//                 <SelectItem value="64">64 joueurs</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           <SubmitButton />
//         </form>
//       </CardContent>
//     </Card>
//   )
// }

// "use client"

// import * as React from "react"
// import { useFormState, useFormStatus } from "react-dom"
// import { createTournament } from "@/lib/tournament-actions" // <-- Server Action (dans un fichier "use server")
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// type Props = {
//   judgeId: string
// }

// function SubmitButton() {
//   const { pending } = useFormStatus()
//   return (
//     <Button type="submit" disabled={pending} className="w-full">
//       {pending ? "Création..." : "Créer le tournoi"}
//     </Button>
//   )
// }

// export default function CreateTournamentForm({ judgeId }: Props) {
//   // on utilise la Server Action exportée (signature: (prevState, formData) => ...)
//   const [state, formAction] = useFormState<any, FormData>(createTournament as any, null)

//   return (
//     <Card className="max-w-3xl mx-auto">
//       <CardHeader>
//         <CardTitle>Créer un nouveau tournoi</CardTitle>
//         <CardDescription>Configurez les paramètres de base de votre tournoi de padel</CardDescription>
//       </CardHeader>
//       <CardContent>
//         <form action={formAction} className="space-y-6">
//           {/* On passe le judgeId à l’action via un champ caché */}
//           <input type="hidden" name="judgeId" value={judgeId} />

//           <div className="space-y-2">
//             <label className="block text-sm font-medium">Nom du tournoi</label>
//             <input
//               name="name"
//               required
//               placeholder="Ex: P1000"
//               className="w-full rounded-md border px-3 py-2"
//             />
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="space-y-2">
//               <label className="block text-sm font-medium">Date de début</label>
//               <input
//                 type="date"
//                 name="startDate"
//                 required
//                 className="w-full rounded-md border px-3 py-2"
//               />
//             </div>

//             <div className="space-y-2">
//               <label className="block text-sm font-medium">Date de fin (optionnel)</label>
//               <input
//                 type="date"
//                 name="endDate"
//                 className="w-full rounded-md border px-3 py-2"
//               />
//             </div>
//           </div>

//           {/* Pour l’instant on garde le champ attendu par l’action: maxPlayers.
//              (On pourra le renommer/adapter à “équipes” lorsque le schéma DB passera à teams.) */}
//           <div className="space-y-2">
//             <label className="block text-sm font-medium">Nombre maximum de joueurs</label>
//             <select name="maxPlayers" defaultValue="32" className="w-full rounded-md border px-3 py-2">
//               <option value="8">8 joueurs</option>
//               <option value="12">12 joueurs</option>
//               <option value="16">16 joueurs</option>
//               <option value="24">24 joueurs</option>
//               <option value="32">32 joueurs</option>
//               <option value="48">48 joueurs</option>
//               <option value="64">64 joueurs</option>
//             </select>
//           </div>

//           {state?.error && (
//             <p className="text-sm text-red-600">{state.error}</p>
//           )}

//           <SubmitButton />
//         </form>
//       </CardContent>
//     </Card>
//   )
// }


// "use client"

// import * as React from "react"
// import { useFormState, useFormStatus } from "react-dom"
// import { createTournament } from "@/lib/tournament-actions"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// type Props = {
//   judgeId: string
// }

// function SubmitButton() {
//   const { pending } = useFormStatus()
//   return (
//     <Button type="submit" disabled={pending} className="w-full">
//       {pending ? "Création..." : "Créer le tournoi"}
//     </Button>
//   )
// }

// export default function CreateTournamentForm({ judgeId }: Props) {
//   const [state, formAction] = useFormState<any, FormData>(createTournament as any, null)

//   return (
//     <Card className="max-w-3xl mx-auto">
//       <CardHeader>
//         <CardTitle>Créer un nouveau tournoi</CardTitle>
//         <CardDescription>Configurez les paramètres de base de votre tournoi de padel</CardDescription>
//       </CardHeader>

//       <CardContent>
//         <form action={formAction} className="space-y-6">
//           <input type="hidden" name="judgeId" value={judgeId} />

//           <div className="space-y-2">
//             <label className="block text-sm font-medium">Nom du tournoi</label>
//             <input name="name" required placeholder="Ex: P1000" className="w-full rounded-md border px-3 py-2" />
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="space-y-2">
//               <label className="block text-sm font-medium">Date de début</label>
//               <input type="date" name="startDate" required className="w-full rounded-md border px-3 py-2" />
//             </div>

//             <div className="space-y-2">
//               <label className="block text-sm font-medium">Date de fin (optionnel)</label>
//               <input type="date" name="endDate" className="w-full rounded-md border px-3 py-2" />
//             </div>
//           </div>

//           {/* --- ICI: on passe en "équipes" --- */}
//           <div className="space-y-2">
//             <label className="block text-sm font-medium">Nombre maximum d’équipes</label>
//             <select name="maxTeams" defaultValue="16" className="w-full rounded-md border px-3 py-2">
//               <option value="8">8 équipes</option>
//               <option value="12">12 équipes</option>
//               <option value="16">16 équipes</option>
//               <option value="24">24 équipes</option>
//               <option value="32">32 équipes</option>
//             </select>
//           </div>

//           {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

//           <SubmitButton />
//         </form>
//       </CardContent>
//     </Card>
//   )
// }


"use client"

import { useId } from "react"
import { createTournament } from "@/lib/tournament-actions"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = { judgeId: string }

export default function CreateTournamentForm({ judgeId }: Props) {
  // juste pour ids accessibles
  const nameId = useId()
  const startId = useId()
  const endId = useId()
  const teamsId = useId()

  // IMPORTANT : on branche directement l'action server
  return (
    <form action={createTournament}>
      {/* on passe le judgeId via un champ caché */}
      <input type="hidden" name="judgeId" value={judgeId} />

      <Card>
        <CardHeader>
          <CardTitle>Créer un nouveau tournoi</CardTitle>
          <CardDescription>Configurez les paramètres de base de votre tournoi de padel</CardDescription>
        </CardHeader>
        <div className="p-6 space-y-6">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor={nameId}>Nom du tournoi</Label>
            <Input id={nameId} name="name" placeholder="Ex: P1000" required />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor={startId}>Date de début</Label>
              <Input id={startId} name="startDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={endId}>Date de fin (optionnel)</Label>
              <Input id={endId} name="endDate" type="date" />
            </div>
          </div>

          {/* Limite d’équipes (et NON de joueurs) */}
          <div className="space-y-2">
            <Label htmlFor={teamsId}>Nombre maximum d’équipes</Label>
            {/* on envoie maxTeams ; côté serveur on fera max_players = maxTeams * 2 */}
            <Select name="maxTeams" defaultValue="16">
              <SelectTrigger id={teamsId}>
                <SelectValue placeholder="Sélectionnez" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8 équipes</SelectItem>
                <SelectItem value="12">12 équipes</SelectItem>
                <SelectItem value="16">16 équipes</SelectItem>
                <SelectItem value="24">24 équipes</SelectItem>
                <SelectItem value="32">32 équipes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button type="submit" className="w-full">Créer le tournoi</Button>
          </div>
        </div>
      </Card>
    </form>
  )
}
