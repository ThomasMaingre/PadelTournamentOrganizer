"use client"

import { useId } from "react"
import { createTournament } from "@/lib/tournament-actions"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = { judgeId: string }

export default function CreateTournamentForm({ judgeId }: Props) {
  // juste pour ids accessibles
  const nameId = useId()
  const startId = useId()
  const endId = useId()

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

          {/* Nombre d'équipes fixé à 16 par défaut */}
          <input type="hidden" name="maxTeams" value="16" />

          <div>
            <Button type="submit" className="w-full">Créer le tournoi</Button>
          </div>
        </div>
      </Card>
    </form>
  )
}
