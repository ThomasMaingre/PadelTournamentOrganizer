"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { useFormStatus } from "react-dom"
import { addTeamAction } from "@/app/dashboard/tournaments/[id]/actions"

interface AddTeamFormProps {
  tournamentId: string
  onTeamAdded?: () => void // gardé pour compat, non utilisé avec Server Actions
}

interface Player {
  firstName: string
  lastName: string
  nationalRanking: number | null
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Ajout en cours..." : "Ajouter l'équipe"}
    </Button>
  )
}

export default function AddTeamForm({ tournamentId }: AddTeamFormProps) {
  const [players, setPlayers] = useState<Player[]>([
    { firstName: "", lastName: "", nationalRanking: null },
    { firstName: "", lastName: "", nationalRanking: null },
  ])
  const [teamName, setTeamName] = useState("")

  const updatePlayer = (index: number, field: keyof Player, value: string | number | null) => {
    const next = [...players]
    next[index] = { ...next[index], [field]: value }
    setPlayers(next)
  }

  const generateTeamName = () => {
    const valid = players.filter((p) => p.firstName && p.lastName)
    return valid.length === 2 ? `${valid[0].lastName}/${valid[1].lastName}` : ""
  }

  const calculatePairWeight = () => {
    const ranks = players.map((p) => p.nationalRanking).filter((r): r is number => r !== null && r > 0)
    if (ranks.length !== 2) return null
    return (ranks[0] + ranks[1]) / 2
  }

  const pairWeight = calculatePairWeight()

  // On pré-remplit l’argument tournamentId de la Server Action
  const action = addTeamAction.bind(null, tournamentId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Ajouter une équipe
        </CardTitle>
        <p className="text-sm text-muted-foreground">Inscrivez une équipe de 2 joueurs au tournoi</p>
      </CardHeader>
      <CardContent>
        {/* IMPORTANT : on passe directement la Server Action au form */}
        <form action={action} className="space-y-6">
          {/* Nom d'équipe */}
          <div className="space-y-2">
            <Label htmlFor="teamName">Nom de l'équipe (optionnel)</Label>
            <Input
              id="teamName"
              name="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={generateTeamName() || "ex: Dupont/Martin"}
            />
          </div>

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
                      name={index === 0 ? "player1FirstName" : "player2FirstName"}
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
                      name={index === 0 ? "player1LastName" : "player2LastName"}
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

          {/* Pair weight calculé côté client et envoyé en hidden */}
          <input
            type="hidden"
            name="pairWeight"
            value={pairWeight !== null && pairWeight !== undefined ? String(pairWeight) : ""}
          />

          {pairWeight !== null && pairWeight !== undefined && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Poids de paire calculé:</span>
                <Badge variant="secondary">{pairWeight.toFixed(1)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Utilisé pour calculer les têtes de série (plus bas = meilleur)
              </p>
            </div>
          )}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
