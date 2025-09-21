"use client"

import { useMemo, useState, useEffect } from "react"
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
  const t1Label = useMemo(() => match.team1?.name || "Équipe 1", [match.team1])
  const t2Label = useMemo(() => match.team2?.name || "Équipe 2", [match.team2])

  // form state
  const [sets, setSets] = useState<{ t1: string; t2: string }[]>([
    { t1: "", t2: "" },
    { t1: "", t2: "" },
    { t1: "", t2: "" },
  ])
  const [retired, setRetired] = useState<"none" | "team1" | "team2">("none")
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSets([
        { t1: "", t2: "" },
        { t1: "", t2: "" },
        { t1: "", t2: "" },
      ])
      setRetired("none")
      setErr(null)
    }
  }, [open])

  const submit = async (formData: FormData) => {
    setPending(true)
    setErr(null)

    try {
      if (!tournamentId) {
        setErr("ID du tournoi manquant")
        return
      }

      // build setScores JSON
      const cleaned = sets
        .map(s => ({ t1: Number(s.t1), t2: Number(s.t2) }))
        .filter(s => Number.isFinite(s.t1) && Number.isFinite(s.t2) && (s.t1 > 0 || s.t2 > 0))

      // Validation des sets
      if (retired === "none") {
        const validationErr = validateSets(cleaned)
        if (validationErr) {
          setErr(validationErr)
          return
        }
      }

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

  // Validation des sets de padel
  const validateSets = (cleaned: { t1: number; t2: number }[]) => {
    console.log("🔍 DEBUG validateSets - Input:", cleaned)

    if (cleaned.length === 0) {
      console.log("❌ Aucun set saisi")
      return "Aucun set saisi"
    }

    // Compter les sets gagnés par chaque équipe
    let team1Sets = 0
    let team2Sets = 0

    for (let i = 0; i < cleaned.length; i++) {
      const set = cleaned[i]
      console.log(`🎾 Analyse set ${i+1}:`, set)

      // Validation de chaque set
      if (set.t1 < 0 || set.t2 < 0 || set.t1 > 7 || set.t2 > 7) {
        console.log("❌ Score hors limites")
        return "Score invalide : max 7 points par set"
      }

      // Règles de validation d'un set
      const diff = Math.abs(set.t1 - set.t2)
      const maxScore = Math.max(set.t1, set.t2)
      const minScore = Math.min(set.t1, set.t2)

      console.log(`📊 Set ${i+1} - diff: ${diff}, max: ${maxScore}, min: ${minScore}`)

      // Règles simplifiées :
      // - Si une équipe a 6+ et l'autre 4 ou moins = OK
      // - Si une équipe a 7 et l'autre 5 ou 6 = OK
      // - Sinon il faut 2 points d'écart minimum

      if (maxScore >= 6) {
        const validSet = (maxScore === 6 && minScore <= 4) ||
                        (maxScore === 7 && minScore <= 6) ||
                        (diff >= 2)

        console.log(`✅ Set ${i+1} valid check:`, validSet)

        if (validSet) {
          if (set.t1 > set.t2) {
            team1Sets++
            console.log(`🏆 Team1 gagne set ${i+1} - total: ${team1Sets}`)
          } else {
            team2Sets++
            console.log(`🏆 Team2 gagne set ${i+1} - total: ${team2Sets}`)
          }
        } else {
          console.log(`❌ Set ${i+1} invalide`)
          return `Set ${set.t1}-${set.t2} invalide`
        }
      } else {
        console.log(`❌ Set ${i+1} trop faible`)
        return `Set ${set.t1}-${set.t2} invalide : un set doit aller au moins à 6`
      }
    }

    console.log(`🏁 FINAL - Team1: ${team1Sets} sets, Team2: ${team2Sets} sets`)

    // Vérifier qu'il y a un gagnant (2 sets gagnés)
    if (team1Sets < 2 && team2Sets < 2) {
      console.log("❌ Pas de gagnant déterminé")
      return "Il faut qu'une équipe gagne au moins 2 sets"
    }

    console.log("✅ Validation OK!")
    return null // Pas d'erreur
  }

  const handleSetChange = (setIndex: number, team: 't1' | 't2', value: string) => {
    const numericValue = value.replace(/[^\d]/g, "")
    if (Number(numericValue) > 7) return // Limite à 7

    const next = [...sets]
    next[setIndex] = { ...next[setIndex], [team]: numericValue }
    setSets(next)
  }

  // Validation en temps réel pour l'affichage
  const cleaned = sets
    .map(s => ({ t1: Number(s.t1), t2: Number(s.t2) }))
    .filter(s => Number.isFinite(s.t1) && Number.isFinite(s.t2) && (s.t1 > 0 || s.t2 > 0))

  const validationError = retired === "none" ? validateSets(cleaned) : null

  console.log("🚨 validationError:", validationError)
  console.log("🚨 err:", err)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Saisir le score
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Score — {t1Label} vs {t2Label}</DialogTitle>
        </DialogHeader>

        <form action={submit} className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div />
            <Label className="text-center font-medium">{t1Label}</Label>
            <Label className="text-center font-medium">{t2Label}</Label>

            {[0, 1, 2].map((idx) => (
              <div key={idx} className="contents">
                <Label className="self-center">Set {idx + 1}</Label>
                <Input
                  inputMode="numeric"
                  placeholder="0–7"
                  value={sets[idx].t1}
                  onChange={e => handleSetChange(idx, 't1', e.target.value)}
                  disabled={disableInputs}
                  className="text-center"
                />
                <Input
                  inputMode="numeric"
                  placeholder="0–7"
                  value={sets[idx].t2}
                  onChange={e => handleSetChange(idx, 't2', e.target.value)}
                  disabled={disableInputs}
                  className="text-center"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Abandon (forfait)</Label>
            <RadioGroup
              value={retired}
              onValueChange={(v: any) => setRetired(v)}
              className="flex flex-col gap-2"
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
              Règle: meilleure de 3 sets • un set se gagne 6–0..4, 7–5 ou 7–6 (tie-break).
            </p>
          </div>

          {(err || validationError) ? <p className="text-sm text-destructive">{err || validationError}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending || (validationError !== null && retired === "none")}>
              {pending ? "Enregistrement..." : "Valider"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
