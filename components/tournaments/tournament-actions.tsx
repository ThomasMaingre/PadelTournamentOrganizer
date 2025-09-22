"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Target, Trophy, Play, RotateCcw, CheckCircle } from "lucide-react"
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
      className="w-full"
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
  teamsWithSeeds,
  currentTeamsCount,
  maxTeams,
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
  teamsWithSeeds: boolean
  currentTeamsCount: number
  maxTeams: number
  calculateSeedingAction: () => Promise<any>
  generateBracketAction: () => Promise<any>
  startTournamentAction: () => Promise<any>
  completeTournamentAction: () => Promise<any>
  resetTournamentAction: () => Promise<any>
}) {
  // Vérifier s'il y a trop d'équipes
  const hasTooManyTeams = currentTeamsCount > maxTeams
  const excessTeams = currentTeamsCount - maxTeams

  // Logique pour déterminer quelle étape afficher
  const getNextStep = () => {
    if (status === "completed") {
      return {
        type: "completed",
        title: "Tournoi terminé",
        description: "Le tournoi est terminé. Consultez le podium pour voir les résultats finaux.",
        stepNumber: null,
        totalSteps: 3
      }
    }

    if (status === "in_progress") {
      if (canComplete) {
        return {
          type: "complete",
          title: "Clôturer le tournoi",
          description: "La finale est terminée. Vous pouvez maintenant clôturer le tournoi pour générer le classement final.",
          stepNumber: null,
          totalSteps: 3,
          action: completeTournamentAction,
          actionText: "Clôturer le tournoi",
          variant: "default" as const,
          icon: <Trophy className="h-4 w-4" />,
          loadingText: "Clôture du tournoi...",
          successText: "Tournoi clôturé !"
        }
      } else {
        return {
          type: "in_progress",
          title: "Tournoi en cours",
          description: "Le tournoi est en cours. Les joueurs disputent leurs matchs. Une fois la finale terminée, vous pourrez clôturer le tournoi.",
          stepNumber: null,
          totalSteps: 3
        }
      }
    }

    // Status "draft" - étapes de préparation

    // Vérifier s'il y a trop d'équipes avant tout
    if (hasTooManyTeams) {
      return {
        type: "too_many_teams",
        title: "Attention : trop d'équipes",
        description: `Votre tournoi contient ${currentTeamsCount} équipes mais ne peut en accueillir que ${maxTeams}. Veuillez supprimer ${excessTeams} équipe${excessTeams > 1 ? 's' : ''} avant de continuer.`,
        stepNumber: null,
        totalSteps: 3,
        isError: true
      }
    }

    if (!hasTeams) {
      return {
        type: "need_teams",
        title: "Ajoutez des équipes",
        description: "Commencez par ajouter au moins 4 équipes au tournoi avant de pouvoir continuer.",
        stepNumber: null,
        totalSteps: 3
      }
    }

    if (currentTeamsCount < 4) {
      return {
        type: "not_enough_teams",
        title: "Pas assez d'équipes",
        description: `Votre tournoi contient ${currentTeamsCount} équipe${currentTeamsCount > 1 ? 's' : ''} mais il en faut au minimum 4 pour générer un tableau d'élimination directe.`,
        stepNumber: null,
        totalSteps: 3,
        isError: true
      }
    }

    if (!teamsWithSeeds) {
      return {
        type: "calculate_seeding",
        title: "Calculer les têtes de série",
        description: "Première étape : calculez les têtes de série en fonction des classements des joueurs. Cela déterminera l'ordre des équipes dans le tableau.",
        stepNumber: 1,
        totalSteps: 3,
        action: calculateSeedingAction,
        actionText: "Calculer les têtes de série",
        variant: "outline" as const,
        icon: <Target className="h-4 w-4" />,
        loadingText: "Calcul des têtes de série...",
        successText: "Têtes de série calculées !"
      }
    }

    if (!hasMatches) {
      return {
        type: "generate_bracket",
        title: "Générer le tableau",
        description: "Deuxième étape : créez le tableau d'élimination directe avec les équipes positionnées selon leurs têtes de série.",
        stepNumber: 2,
        totalSteps: 3,
        action: generateBracketAction,
        actionText: "Générer le tableau",
        variant: "outline" as const,
        icon: <Trophy className="h-4 w-4" />,
        loadingText: "Génération du tableau...",
        successText: "Tableau généré !"
      }
    }

    return {
      type: "start_tournament",
      title: "Démarrer le tournoi",
      description: "Troisième étape : lancez officiellement le tournoi. Les joueurs pourront commencer à jouer leurs matchs.",
      stepNumber: 3,
      totalSteps: 3,
      action: startTournamentAction,
      actionText: "Démarrer le tournoi",
      variant: "default" as const,
      icon: <Play className="h-4 w-4" />,
      loadingText: "Démarrage du tournoi...",
      successText: "Tournoi démarré !"
    }
  }

  const step = getNextStep()

  // Si c'est un message d'erreur, afficher seulement l'erreur
  if (step.isError) {
    return (
      <div className="space-y-4">
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <h3 className="font-semibold text-base text-red-800">{step.title}</h3>
          <p className="text-sm text-red-700 mt-2 leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Indicateur d'étape */}
      {step.stepNumber && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Étape {step.stepNumber} / {step.totalSteps}
          </Badge>
        </div>
      )}

      {/* Titre et description */}
      <div className="space-y-2">
        <h3 className="font-semibold text-base">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </div>

      {/* Action principale */}
      {step.action && (
        <ActionButton
          action={step.action}
          variant={step.variant}
          icon={step.icon}
          loadingText={step.loadingText}
          successText={step.successText}
        >
          {step.actionText}
        </ActionButton>
      )}

      {/* Bouton de réinitialisation (seulement si tournoi commencé) */}
      {(status === "in_progress" || (status === "draft" && (teamsWithSeeds || hasMatches))) && (
        <div className="pt-4 border-t">
          <ActionButton
            action={resetTournamentAction}
            variant="destructive"
            icon={<RotateCcw className="h-4 w-4" />}
            loadingText="Réinitialisation..."
            successText="Tournoi réinitialisé !"
          >
            Réinitialiser le tournoi
          </ActionButton>
          <p className="text-xs text-muted-foreground mt-2">
            Cette action supprimera toute progression et remettra le tournoi à zéro.
          </p>
        </div>
      )}
    </div>
  )
}