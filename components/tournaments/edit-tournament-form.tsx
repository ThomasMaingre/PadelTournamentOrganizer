"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateTournament } from "@/lib/tournament-actions"
import { toast } from "sonner"

type Tournament = {
  id: string
  name: string
  description: string | null
  max_players: number | null
  status: string
  start_date: string | null
  end_date: string | null
}

interface EditTournamentFormProps {
  tournament: Tournament
}

export default function EditTournamentForm({ tournament }: EditTournamentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDraft = tournament.status === "draft"
  const [formData, setFormData] = useState({
    name: tournament.name,
    max_players: tournament.max_players || 16,
    start_date: tournament.start_date || "",
    end_date: tournament.end_date || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isDraft && !formData.name.trim()) {
      toast.error("Le nom du tournoi est requis")
      return
    }

    if (isDraft && (formData.max_players < 4 || formData.max_players > 32)) {
      toast.error("Le nombre d'équipes doit être entre 2 et 16")
      return
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date)
      const endDate = new Date(formData.end_date)
      if (endDate < startDate) {
        toast.error("La date de fin doit être postérieure à la date de début")
        return
      }
    }

    setIsSubmitting(true)
    try {
      await updateTournament(tournament.id, {
        name: formData.name.trim(),
        max_players: formData.max_players,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      })

      toast.success("Tournoi modifié avec succès")
      router.push(`/dashboard/tournaments/${tournament.id}`)
    } catch (error) {
      console.error("Erreur lors de la modification:", error)
      toast.error("Erreur lors de la modification du tournoi")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push(`/dashboard/tournaments/${tournament.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nom du tournoi */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom du tournoi *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="ex: Tournoi de Padel 2024"
          required={isDraft}
          maxLength={100}
          disabled={!isDraft}
        />
        {!isDraft && (
          <p className="text-xs text-muted-foreground">
            Le nom ne peut plus être modifié une fois le tournoi démarré
          </p>
        )}
      </div>

      {/* Date de début */}
      <div className="space-y-2">
        <Label htmlFor="startDate">Date de début</Label>
        <Input
          id="startDate"
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
        />
      </div>

      {/* Date de fin */}
      <div className="space-y-2">
        <Label htmlFor="endDate">Date de fin</Label>
        <Input
          id="endDate"
          type="date"
          value={formData.end_date}
          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          min={formData.start_date || undefined}
        />
        <p className="text-xs text-muted-foreground">
          Optionnel - Laissez vide si la date de fin n'est pas encore définie
        </p>
      </div>

      {/* Nombre maximum d'équipes */}
      <div className="space-y-2">
        <Label htmlFor="maxTeams">Nombre maximum d'équipes *</Label>
        <Input
          id="maxTeams"
          type="number"
          min="2"
          max="16"
          step="1"
          value={Math.floor(formData.max_players / 2)}
          onChange={(e) => setFormData({ ...formData, max_players: Number.parseInt(e.target.value, 10) * 2 })}
          required={isDraft}
          disabled={!isDraft}
        />
        {!isDraft && (
          <p className="text-xs text-muted-foreground">
            Le nombre d'équipes ne peut plus être modifié une fois le tournoi démarré
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Équivaut à {formData.max_players} joueurs (2 joueurs par équipe)
        </p>
      </div>

      {/* Informations importantes */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-blue-700">Important</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-blue-600 space-y-1">
            {isDraft ? (
              <>
                <p>• Ces paramètres ne pourront plus être modifiés une fois le tournoi démarré</p>
                <p>• Assurez-vous que le nombre d'équipes correspond à vos besoins</p>
                <p>• Les équipes déjà inscrites ne seront pas affectées par ces modifications</p>
              </>
            ) : (
              <>
                <p>• Seules les dates peuvent être modifiées sur un tournoi démarré</p>
                <p>• Le nom et le nombre d'équipes sont verrouillés</p>
                <p>• Les modifications de dates n'affectent pas le déroulement du tournoi</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Modification..." : "Sauvegarder les modifications"}
        </Button>
        <Button type="button" variant="outline" onClick={handleCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}