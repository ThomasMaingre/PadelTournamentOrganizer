"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Users, Zap } from "lucide-react"
import { addTeam } from "@/lib/tournament-actions"

interface BulkTeamFormProps {
  tournamentId: string
  onTeamsAdded?: () => void
  maxTeams: number
  currentTeamsCount: number
}

export default function BulkTeamForm({ tournamentId, onTeamsAdded, maxTeams, currentTeamsCount }: BulkTeamFormProps) {
  const availableSlots = Math.max(0, maxTeams - currentTeamsCount)
  const [numberOfTeams, setNumberOfTeams] = useState<number>(Math.min(4, availableSlots))
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Noms d'équipes prédéfinis pour les tests
  const defaultTeamNames = [
    ["Pierre", "Dupont", "Marie", "Martin"],
    ["Jean", "Durand", "Sophie", "Bernard"],
    ["Michel", "Moreau", "Claire", "Petit"],
    ["Philippe", "Laurent", "Nathalie", "Robert"],
    ["François", "Leroy", "Isabelle", "Richard"],
    ["Alain", "Roux", "Sylvie", "Dubois"],
    ["Daniel", "Vincent", "Catherine", "Thomas"],
    ["Patrick", "Rousseau", "Monique", "Morel"],
    ["Thierry", "Blanc", "Nicole", "Fournier"],
    ["André", "Guerin", "Françoise", "Girard"],
    ["Christian", "Muller", "Brigitte", "Andre"],
    ["Olivier", "Lefebvre", "Martine", "Mercier"],
    ["Bruno", "Lopez", "Dominique", "Dupuis"],
    ["Serge", "Gautier", "Chantal", "Delmas"],
    ["Claude", "Garcia", "Jacqueline", "Payet"],
    ["Bernard", "Perrin", "Denise", "Clement"]
  ]

  const generateRandomRanking = () => Math.floor(Math.random() * 150) + 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (numberOfTeams < 1 || numberOfTeams > availableSlots) {
      alert(`Veuillez entrer un nombre entre 1 et ${availableSlots}`)
      return
    }

    setIsSubmitting(true)
    try {
      for (let i = 0; i < numberOfTeams; i++) {
        const teamData = defaultTeamNames[i] || [`Joueur${i*2+1}`, `Nom${i*2+1}`, `Joueur${i*2+2}`, `Nom${i*2+2}`]

        const players = [
          {
            firstName: teamData[0],
            lastName: teamData[1],
            nationalRanking: generateRandomRanking()
          },
          {
            firstName: teamData[2],
            lastName: teamData[3],
            nationalRanking: generateRandomRanking()
          }
        ]

        const teamName = `${players[0].lastName}/${players[1].lastName}`
        const pairWeight = players[0].nationalRanking + players[1].nationalRanking

        await addTeam(tournamentId, {
          name: teamName,
          players,
          pairWeight,
        })
      }

      // Reset
      setNumberOfTeams(Math.min(4, availableSlots - numberOfTeams))
      onTeamsAdded?.()
    } catch (err) {
      console.error("Erreur lors de la création automatique des équipes:", err)
      alert("Erreur lors de la création des équipes")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (availableSlots === 0) {
    return (
      <Card className="border-dashed border-gray-200 bg-gray-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <Zap className="h-5 w-5" />
            Création automatique
          </CardTitle>
          <p className="text-sm text-gray-600">
            Le tournoi est complet ({currentTeamsCount}/{maxTeams} équipes)
          </p>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-gray-100/50 rounded-lg text-center">
            <p className="text-sm text-gray-700">
              Aucune place disponible pour créer de nouvelles équipes.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-dashed border-orange-200 bg-orange-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <Zap className="h-5 w-5" />
          Création automatique
        </CardTitle>
        <p className="text-sm text-orange-600">
          Générer plusieurs équipes de test automatiquement
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="numberOfTeams" className="text-sm font-medium">
              Nombre d'équipes à créer
            </Label>
            <Input
              id="numberOfTeams"
              type="number"
              min="1"
              max={availableSlots}
              value={numberOfTeams.toString()}
              onChange={(e) => {
                const value = e.target.value
                const defaultValue = Math.min(4, availableSlots)
                const numValue = value === '' ? defaultValue : Number.parseInt(value, 10)
                const clampedValue = Math.min(Math.max(1, isNaN(numValue) ? defaultValue : numValue), availableSlots)
                setNumberOfTeams(clampedValue)
              }}
              placeholder={`ex: 1, ${Math.min(4, availableSlots)}, ${availableSlots}...`}
              className="w-full"
              required
              disabled={availableSlots === 0}
            />
          </div>

          <div className="p-3 bg-orange-100/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-800">Aperçu :</span>
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                {numberOfTeams} équipes
              </Badge>
            </div>
            <p className="text-xs text-orange-700 mb-1">
              Places disponibles : {availableSlots} / {maxTeams}
            </p>
            <p className="text-xs text-orange-700">
              Chaque équipe aura 2 joueurs avec des classements aléatoires (1-150).
              Noms prédéfinis : Pierre/Dupont, Marie/Martin, etc.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || numberOfTeams < 1 || numberOfTeams > availableSlots || availableSlots === 0}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {availableSlots === 0
              ? "Tournoi complet"
              : isSubmitting
                ? "Création en cours..."
                : `Créer ${numberOfTeams} équipes`
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}