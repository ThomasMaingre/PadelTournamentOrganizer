"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { createTournament } from "@/lib/tournament-actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full" size="lg">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Création du tournoi...
        </>
      ) : (
        "Créer le tournoi"
      )}
    </Button>
  )
}

interface CreateTournamentFormProps {
  judgeId: string
}

export default function CreateTournamentForm({ judgeId }: CreateTournamentFormProps) {
  const router = useRouter()
  const [state, formAction] = useActionState(createTournament, null)

  // Handle successful tournament creation
  useEffect(() => {
    if (state?.success && state?.tournamentId) {
      router.push(`/dashboard/tournaments/${state.tournamentId}`)
    }
  }, [state, router])

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Créer un nouveau tournoi</CardTitle>
        <CardDescription>Configurez les paramètres de base de votre tournoi de padel</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="judgeId" value={judgeId} />

          {state?.error && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nom du tournoi</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Tournoi de Padel - Janvier 2025"
              required
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début</Label>
              <Input id="startDate" name="startDate" type="date" required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin (optionnel)</Label>
              <Input id="endDate" name="endDate" type="date" className="h-11" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPlayers">Nombre maximum de joueurs</Label>
            <Select name="maxPlayers" defaultValue="32">
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Sélectionnez le nombre de joueurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8 joueurs</SelectItem>
                <SelectItem value="16">16 joueurs</SelectItem>
                <SelectItem value="32">32 joueurs</SelectItem>
                <SelectItem value="64">64 joueurs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
