"use client"

import { useId, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createTournament } from "@/lib/tournament-actions"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type Props = { judgeId: string }

export default function CreateTournamentForm({ judgeId }: Props) {
  // juste pour ids accessibles
  const nameId = useId()
  const startId = useId()
  const endId = useId()

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Date d'aujourd'hui au format YYYY-MM-DD pour l'input date
  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData(e.target as HTMLFormElement)

    startTransition(async () => {
      try {
        toast.loading("Création du tournoi en cours...", { id: "create-tournament" })
        const result = await createTournament(formData)

        if (result?.error) {
          toast.error(result.error, { id: "create-tournament" })
        } else if (result?.success && result?.tournamentSlug) {
          toast.success("Tournoi créé avec succès ! Redirection...", { id: "create-tournament" })
          // Redirection immédiate - le spinner continue jusqu'à la navigation
          router.push(`/dashboard/tournaments/${result.tournamentSlug}`)
          // Ne pas arrêter isPending ici - la transition se termine automatiquement après la navigation
          return
        }
      } catch (error) {
        console.error("Erreur création tournoi:", error)
        toast.error("Erreur lors de la création du tournoi", { id: "create-tournament" })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
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
              <Input id={startId} name="startDate" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={endId}>Date de fin (optionnel)</Label>
              <Input id={endId} name="endDate" type="date" />
            </div>
          </div>

          {/* Nombre d'équipes fixé à 16 par défaut */}
          <input type="hidden" name="maxTeams" value="16" />

          <div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Création en cours..." : "Créer le tournoi"}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  )
}
