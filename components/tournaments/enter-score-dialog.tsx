"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { updateMatchScore } from "@/lib/tournament-actions"

type Team = { id: string; name: string | null; seed_position: number | null }
type MatchLite = {
  id: string
  team1_id: string | null
  team2_id: string | null
  team1?: Team | null
  team2?: Team | null
  status: "scheduled" | "in_progress" | "completed"
}

export default function EnterScoreDialog({ match, tournamentId }: { match: MatchLite; tournamentId: string }) {
  const [open, setOpen] = useState(false)

  // form state
  const [sets, setSets] = useState<{ t1: string; t2: string }[]>([
    { t1: "", t2: "" },
    { t1: "", t2: "" },
    { t1: "", t2: "" },
  ])
  const [retired, setRetired] = useState<"none" | "team1" | "team2">("none")
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const t1Label = useMemo(() => match.team1?.name || "Équipe 1", [match.team1])
  const t2Label = useMemo(() => match.team2?.name || "Équipe 2", [match.team2])

  const submit = async (formData: FormData) => {
    setPending(true); setErr(null)
    try {
      // build setScores JSON
      const cleaned = sets
        .map(s => ({ t1: Number(s.t1), t2: Number(s.t2) }))
        .filter(s => Number.isFinite(s.t1) && Number.isFinite(s.t2))

      formData.set("matchId", match.id)
      formData.set("tournamentId", tournamentId)
      formData.set("setScores", JSON.stringify(cleaned))

      if (retired === "team1" && match.team1_id) {
        formData.set("retiredTeamId", match.team1_id)
      } else if (retired === "team2" && match.team2_id) {
        formData.set("retiredTeamId", match.team2_id)
      } else {
        formData.delete("retiredTeamId")
      }

      const res = await updateMatchScore({}, formData)
      if ((res as any)?.error) {
        setErr((res as any).error)
      } else {
        setOpen(false)
      }
    } catch (e: any) {
      setErr(e?.message || "Erreur inconnue")
    } finally {
      setPending(false)
    }
  }

  const disableInputs = retired !== "none"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Saisir le score</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Score — {t1Label} vs {t2Label}</DialogTitle>
        </DialogHeader>

        <form action={submit} className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div />
            <Label className="text-center">{t1Label}</Label>
            <Label className="text-center">{t2Label}</Label>

            {[0,1,2].map((idx) => (
              <div key={idx} className="contents">
                <Label className="self-center">Set {idx+1}</Label>
                <Input
                  inputMode="numeric"
                  placeholder="0–7"
                  value={sets[idx].t1}
                  onChange={e => {
                    const v = e.target.value.replace(/[^\d]/g,"")
                    const next = [...sets]; next[idx] = { ...next[idx], t1: v }; setSets(next)
                  }}
                  disabled={disableInputs}
                />
                <Input
                  inputMode="numeric"
                  placeholder="0–7"
                  value={sets[idx].t2}
                  onChange={e => {
                    const v = e.target.value.replace(/[^\d]/g,"")
                    const next = [...sets]; next[idx] = { ...next[idx], t2: v }; setSets(next)
                  }}
                  disabled={disableInputs}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Abandon (forfait)</Label>
            <RadioGroup
              value={retired}
              onValueChange={(v: any) => setRetired(v)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="r-none" value="none" />
                <Label htmlFor="r-none">Aucun</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="r-t1" value="team1" />
                <Label htmlFor="r-t1">{t1Label} abandonne</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="r-t2" value="team2" />
                <Label htmlFor="r-t2">{t2Label} abandonne</Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Règle: 2 sets gagnants pour remporter le match.
            </p>
          </div>

          {err ? <p className="text-sm text-destructive">{err}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={()=>setOpen(false)} disabled={pending}>Annuler</Button>
            <Button type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Valider"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
