"use client"

import { useState } from "react"
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
import { removeAllTeams } from "@/lib/tournament-actions"
import { toast } from "sonner"

interface RemoveAllTeamsButtonProps {
  tournamentId: string
  teamsCount: number
}

export default function RemoveAllTeamsButton({ tournamentId, teamsCount }: RemoveAllTeamsButtonProps) {
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemoveAll = async () => {
    setIsRemoving(true)
    try {
      await removeAllTeams(tournamentId)
      toast.success("Toutes les équipes ont été supprimées")
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
      toast.error("Erreur lors de la suppression des équipes")
    } finally {
      setIsRemoving(false)
    }
  }

  if (teamsCount === 0) {
    return null
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Enlever toutes les équipes
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer toutes les équipes</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer toutes les équipes ({teamsCount}) et leurs joueurs ?
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemoveAll}
            disabled={isRemoving}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isRemoving ? "Suppression..." : "Supprimer toutes les équipes"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}