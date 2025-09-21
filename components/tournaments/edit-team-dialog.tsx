"use client"

import { useState } from "react"
import { Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { updateTeam } from "@/lib/tournament-actions"
import { toast } from "sonner"

type Player = { id: string; first_name: string; last_name: string; national_ranking?: number | null }
type Team = {
  id: string
  name: string | null
  players?: Player[]
}

interface EditTeamDialogProps {
  tournamentId: string
  team: Team
  tournamentStatus: string
}

export default function EditTeamDialog({
  tournamentId,
  team,
  tournamentStatus
}: EditTeamDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    player1: {
      firstName: team.players?.[0]?.first_name || "",
      lastName: team.players?.[0]?.last_name || "",
      nationalRanking: team.players?.[0]?.national_ranking || null,
    },
    player2: {
      firstName: team.players?.[1]?.first_name || "",
      lastName: team.players?.[1]?.last_name || "",
      nationalRanking: team.players?.[1]?.national_ranking || null,
    },
  })

  // Générer automatiquement le nom de l'équipe
  const teamName = `${formData.player1.lastName}/${formData.player2.lastName}`

  // N'afficher le bouton que si le tournoi est en brouillon
  if (tournamentStatus !== "draft") {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.player1.firstName.trim() || !formData.player1.lastName.trim()) {
      toast.error("Le nom et prénom du joueur 1 sont requis")
      return
    }

    if (!formData.player2.firstName.trim() || !formData.player2.lastName.trim()) {
      toast.error("Le nom et prénom du joueur 2 sont requis")
      return
    }

    setIsSubmitting(true)
    try {
      await updateTeam(tournamentId, team.id, {
        teamName: teamName.trim(),
        player1: {
          firstName: formData.player1.firstName.trim(),
          lastName: formData.player1.lastName.trim(),
          nationalRanking: formData.player1.nationalRanking,
        },
        player2: {
          firstName: formData.player2.firstName.trim(),
          lastName: formData.player2.lastName.trim(),
          nationalRanking: formData.player2.nationalRanking,
        },
      })

      toast.success("Équipe modifiée avec succès")
      setIsOpen(false)
    } catch (error) {
      console.error("Erreur lors de la modification:", error)
      toast.error("Erreur lors de la modification de l'équipe")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700">
          <Edit2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier l'équipe</DialogTitle>
          <DialogDescription>
            Modifiez les informations de l'équipe et de ses joueurs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom de l'équipe (auto-généré) */}
          <div className="space-y-2">
            <Label>Nom de l'équipe</Label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm">
              {teamName || "Nom d'équipe généré automatiquement"}
            </div>
            <p className="text-xs text-muted-foreground">
              Le nom de l'équipe est généré automatiquement à partir des noms de famille des joueurs
            </p>
          </div>

          {/* Joueur 1 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Joueur 1 *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={formData.player1.firstName}
                onChange={(e) => setFormData({
                  ...formData,
                  player1: { ...formData.player1, firstName: e.target.value }
                })}
                placeholder="Prénom"
                required
                maxLength={30}
              />
              <Input
                value={formData.player1.lastName}
                onChange={(e) => setFormData({
                  ...formData,
                  player1: { ...formData.player1, lastName: e.target.value }
                })}
                placeholder="Nom"
                required
                maxLength={30}
              />
            </div>
            <Input
              type="number"
              value={formData.player1.nationalRanking || ""}
              onChange={(e) => setFormData({
                ...formData,
                player1: {
                  ...formData.player1,
                  nationalRanking: e.target.value ? Number.parseInt(e.target.value, 10) : null
                }
              })}
              placeholder="Classement national (optionnel)"
              min="1"
              max="9999"
            />
          </div>

          {/* Joueur 2 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Joueur 2 *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={formData.player2.firstName}
                onChange={(e) => setFormData({
                  ...formData,
                  player2: { ...formData.player2, firstName: e.target.value }
                })}
                placeholder="Prénom"
                required
                maxLength={30}
              />
              <Input
                value={formData.player2.lastName}
                onChange={(e) => setFormData({
                  ...formData,
                  player2: { ...formData.player2, lastName: e.target.value }
                })}
                placeholder="Nom"
                required
                maxLength={30}
              />
            </div>
            <Input
              type="number"
              value={formData.player2.nationalRanking || ""}
              onChange={(e) => setFormData({
                ...formData,
                player2: {
                  ...formData.player2,
                  nationalRanking: e.target.value ? Number.parseInt(e.target.value, 10) : null
                }
              })}
              placeholder="Classement national (optionnel)"
              min="1"
              max="9999"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Modification..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}