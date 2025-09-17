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
