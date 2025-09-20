"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { addTeam } from "@/lib/tournament-actions"

interface AddTeamFormProps {
  tournamentId: string
  onTeamAdded?: () => void
}

interface Player {
  firstName: string
  lastName: string
  nationalRanking: number | null
}

export default function AddTeamForm({ tournamentId, onTeamAdded }: AddTeamFormProps) {
  const [players, setPlayers] = useState<Player[]>([
    { firstName: "", lastName: "", nationalRanking: null },
    { firstName: "", lastName: "", nationalRanking: null },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updatePlayer = (index: number, field: keyof Player, value: string | number | null) => {
    const next = [...players]
    next[index] = { ...next[index], [field]: value }
    setPlayers(next)
  }

  const calculatePairWeight = () => {
    const rankings = players
      .map((p) => p.nationalRanking)
      .filter((r): r is number => r !== null && r > 0)
    if (rankings.length !== 2) return null
    return rankings[0] + rankings[1]
  }

  // Nom auto basé sur les noms de famille : "Dupont/Martin"
  const generateTeamName = () => {
    const ok = players.every((p) => p.firstName.trim() && p.lastName.trim())
    if (!ok) return ""
    return `${players[0].lastName.trim()}/${players[1].lastName.trim()}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validPlayers = players.filter((p) => p.firstName.trim() && p.lastName.trim())
    if (validPlayers.length !== 2) {
      alert("Veuillez renseigner les deux joueurs de l'équipe")
      return
    }

    setIsSubmitting(true)
    try {
      const finalTeamName = generateTeamName()
      const pairWeight = calculatePairWeight()

      await addTeam(tournamentId, {
        name: finalTeamName, // ← on envoie le nom auto
        players: validPlayers,
        pairWeight,
      })

      // reset
      setPlayers([
        { firstName: "", lastName: "", nationalRanking: null },
        { firstName: "", lastName: "", nationalRanking: null },
      ])

      onTeamAdded?.()
    } catch (err) {
      console.error("Erreur lors de l'ajout de l'équipe:", err)
      alert("Erreur lors de l'ajout de l'équipe")
    } finally {
      setIsSubmitting(false)
    }
  }

  const pairWeight = calculatePairWeight()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Ajouter une équipe
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Inscrivez une équipe de 2 joueurs au tournoi
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plus de champ "Nom de l'équipe" ici → totalement retiré */}

          {/* Joueurs */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Joueurs de l'équipe</Label>
            {players.map((player, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">Joueur {index + 1}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`firstName-${index}`}>Prénom</Label>
                    <Input
                      id={`firstName-${index}`}
                      value={player.firstName}
                      onChange={(e) => updatePlayer(index, "firstName", e.target.value)}
                      placeholder="Prénom"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`lastName-${index}`}>Nom</Label>
                    <Input
                      id={`lastName-${index}`}
                      value={player.lastName}
                      onChange={(e) => updatePlayer(index, "lastName", e.target.value)}
                      placeholder="Nom"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`ranking-${index}`}>Classement national</Label>
                    <Input
                      id={`ranking-${index}`}
                      type="number"
                      min="1"
                      value={player.nationalRanking ?? ""}
                      onChange={(e) =>
                        updatePlayer(
                          index,
                          "nationalRanking",
                          e.target.value ? Number.parseInt(e.target.value, 10) : null,
                        )
                      }
                      placeholder="ex: 1, 50, 150..."
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Poids de paire */}
          {pairWeight !== null && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Poids de paire calculé :</span>
                <Badge variant="secondary">{pairWeight.toFixed(1)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Utilisé pour calculer les têtes de série (plus bas = meilleur).
              </p>
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Ajout en cours..." : "Ajouter l'équipe"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
