"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, Trophy } from "lucide-react"
import { updateMatchScore } from "@/lib/match-actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enregistrement...
        </>
      ) : (
        "Enregistrer le score"
      )}
    </Button>
  )
}

interface MatchScoreFormProps {
  match: {
    id: string
    player1_id: string
    player2_id: string
    player1_score: number
    player2_score: number
    status: string
    players_player1_idToplayers?: {
      first_name: string
      last_name: string
    }
    players_player2_idToplayers?: {
      first_name: string
      last_name: string
    }
  }
  tournamentId: string
  onClose?: () => void
}

export default function MatchScoreForm({ match, tournamentId, onClose }: MatchScoreFormProps) {
  const [state, formAction] = useActionState(updateMatchScore, null)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Saisir le score
        </CardTitle>
        <CardDescription>
          {match.players_player1_idToplayers?.first_name} {match.players_player1_idToplayers?.last_name} vs{" "}
          {match.players_player2_idToplayers?.first_name} {match.players_player2_idToplayers?.last_name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="matchId" value={match.id} />
          <input type="hidden" name="tournamentId" value={tournamentId} />

          {state?.error && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2 rounded-md text-sm">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="bg-primary/10 border border-primary/50 text-primary px-3 py-2 rounded-md text-sm">
              {state.success}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="player1Score">
                {match.players_player1_idToplayers?.first_name} {match.players_player1_idToplayers?.last_name}
              </Label>
              <Input
                id="player1Score"
                name="player1Score"
                type="number"
                min="0"
                max="99"
                defaultValue={match.player1_score}
                required
                className="text-center text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="player2Score">
                {match.players_player2_idToplayers?.first_name} {match.players_player2_idToplayers?.last_name}
              </Label>
              <Input
                id="player2Score"
                name="player2Score"
                type="number"
                min="0"
                max="99"
                defaultValue={match.player2_score}
                required
                className="text-center text-lg font-semibold"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <SubmitButton />
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} className="w-full bg-transparent">
                Annuler
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
