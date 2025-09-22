"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { deleteTournament } from "@/lib/tournament-actions"
import { toast } from "sonner"

interface DeleteTournamentButtonProps {
  tournamentSlug: string
  tournamentName: string
}

export default function DeleteTournamentButton({
  tournamentSlug,
  tournamentName
}: DeleteTournamentButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteTournament(tournamentSlug)
      toast.success(`Tournoi "${result.tournamentName}" supprimé avec succès`)
      router.push("/dashboard")
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
      toast.error("Erreur lors de la suppression du tournoi")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer le tournoi</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p>Êtes-vous sûr de vouloir supprimer définitivement le tournoi "{tournamentName}" ?</p>

              <div className="mt-4">
                <strong>Cette action supprimera :</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Toutes les équipes et joueurs inscrits</li>
                  <li>Tous les matchs et résultats</li>
                  <li>Le classement final s'il existe</li>
                  <li>Toutes les données du tournoi</li>
                </ul>
              </div>

              <p className="mt-4">
                <strong className="text-red-600">Cette action est irréversible.</strong>
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? "Suppression..." : "Supprimer définitivement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}