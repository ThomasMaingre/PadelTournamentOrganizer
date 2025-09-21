"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteAccount } from "@/lib/account-actions"
import { toast } from "sonner"

interface DeleteAccountSectionProps {
  userId: string
}

export default function DeleteAccountSection({ userId }: DeleteAccountSectionProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState("")

  const handleDelete = async () => {
    if (confirmText !== "SUPPRIMER") {
      toast.error("Veuillez taper SUPPRIMER pour confirmer")
      return
    }

    setIsDeleting(true)
    try {
      await deleteAccount(userId)
      toast.success("Compte supprimé avec succès")
      router.push("/")
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
      toast.error("Erreur lors de la suppression du compte")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Zone de danger
        </CardTitle>
        <CardDescription className="text-red-600">
          Cette action est irréversible. Réfléchissez bien avant de procéder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-red-100 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">
              Suppression du compte
            </h4>
            <p className="text-sm text-red-700 mb-3">
              Si vous supprimez votre compte, toutes les données associées seront définitivement perdues :
            </p>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>Tous les tournois que vous avez créés seront supprimés</li>
              <li>Toutes les équipes et joueurs de vos tournois</li>
              <li>Tous les matchs et résultats</li>
              <li>Votre profil et vos informations personnelles</li>
            </ul>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer définitivement mon compte
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le compte</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    <p className="mb-4">
                      Êtes-vous absolument sûr de vouloir supprimer votre compte ?
                    </p>

                    <div className="bg-red-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-red-800 font-medium mb-2">
                        Cette action supprimera définitivement :
                      </p>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• Votre compte et profil</li>
                        <li>• Tous vos tournois créés</li>
                        <li>• Toutes les données associées</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmDelete">
                        Tapez <strong>SUPPRIMER</strong> pour confirmer :
                      </Label>
                      <Input
                        id="confirmDelete"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="SUPPRIMER"
                      />
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText("")}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting || confirmText !== "SUPPRIMER"}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {isDeleting ? "Suppression..." : "Supprimer définitivement"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}