"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Target, Trophy, Play, RotateCcw } from "lucide-react"
import { toast } from "sonner"

type ActionButtonProps = {
  action: () => Promise<any>
  children: React.ReactNode
  disabled?: boolean
  variant?: "default" | "outline" | "destructive"
  icon?: React.ReactNode
  loadingText?: string
  successText?: string
}

function ActionButton({
  action,
  children,
  disabled,
  variant = "outline",
  icon,
  loadingText,
  successText
}: ActionButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      try {
        if (loadingText) {
          toast.loading(loadingText, { id: "tournament-action" })
        }

        await action()

        if (successText) {
          toast.success(successText, { id: "tournament-action" })
        } else {
          toast.dismiss("tournament-action")
        }
      } catch (error) {
        console.error(error)
        toast.error("Une erreur est survenue", { id: "tournament-action" })
      }
    })
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isPending}
      variant={variant}
      className="w-full bg-transparent"
    >
      {isPending ? (
        <>
          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {loadingText || "Chargement..."}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </Button>
  )
}

export default function TournamentActions({
  tournamentId,
  status,
  hasMatches,
  hasTeams,
  canComplete,
  calculateSeedingAction,
  generateBracketAction,
  startTournamentAction,
  completeTournamentAction,
  resetTournamentAction
}: {
  tournamentId: string
  status: string
  hasMatches: boolean
  hasTeams: boolean
  canComplete: boolean
  calculateSeedingAction: () => Promise<any>
  generateBracketAction: () => Promise<any>
  startTournamentAction: () => Promise<any>
  completeTournamentAction: () => Promise<any>
  resetTournamentAction: () => Promise<any>
}) {
  return (
    <div className="space-y-3">
      {status === "draft" && (
        <>
          <ActionButton
            action={calculateSeedingAction}
            disabled={!hasTeams}
            icon={<Target className="h-4 w-4" />}
            loadingText="Calcul des têtes de série..."
            successText="Têtes de série calculées !"
          >
            Calculer les têtes de série
          </ActionButton>

          <ActionButton
            action={generateBracketAction}
            disabled={!hasTeams}
            icon={<Trophy className="h-4 w-4" />}
            loadingText="Génération du tableau..."
            successText="Tableau généré !"
          >
            Générer le tableau
          </ActionButton>

          <ActionButton
            action={startTournamentAction}
            disabled={!hasMatches}
            variant="default"
            icon={<Play className="h-4 w-4" />}
            loadingText="Démarrage du tournoi..."
            successText="Tournoi démarré !"
          >
            Démarrer le tournoi
          </ActionButton>
        </>
      )}

      {status === "in_progress" && canComplete && (
        <ActionButton
          action={completeTournamentAction}
          variant="default"
          loadingText="Clôture du tournoi..."
          successText="Tournoi clôturé !"
        >
          Clôturer le tournoi
        </ActionButton>
      )}

      {status !== "completed" && (
        <ActionButton
          action={resetTournamentAction}
          variant="destructive"
          icon={<RotateCcw className="h-4 w-4" />}
          loadingText="Réinitialisation..."
          successText="Tournoi réinitialisé !"
        >
          Réinitialiser le tournoi
        </ActionButton>
      )}
    </div>
  )
}