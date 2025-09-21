"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { addPlayer } from "@/lib/tournament-actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Ajout...
        </>
      ) : (
        "Ajouter le joueur"
      )}
    </Button>
  )
}

interface AddPlayerFormProps {
  tournamentId: string
}

export default function AddPlayerForm({ tournamentId }: AddPlayerFormProps) {
  const [state, formAction] = useActionState(addPlayer, null)

  return (
    <form action={formAction} className="space-y-4">
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" name="firstName" type="text" placeholder="Jean" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" name="lastName" type="text" placeholder="Dupont" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nationalRanking">Classement national</Label>
        <Input id="nationalRanking" name="nationalRanking" type="number" placeholder="ex: 1, 50, 150..." min="1" />
        <p className="text-xs text-muted-foreground">
          Optionnel - classement national français (1er = meilleur joueur)
        </p>
      </div>

      <SubmitButton />
    </form>
  )
}
