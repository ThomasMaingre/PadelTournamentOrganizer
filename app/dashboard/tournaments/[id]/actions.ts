"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function addTeamAction(tournamentId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const teamName = (formData.get("teamName") as string | null)?.trim() || ""
  const p1First = (formData.get("player1FirstName") as string | null)?.trim() || ""
  const p1Last  = (formData.get("player1LastName")  as string | null)?.trim() || ""
  const p2First = (formData.get("player2FirstName") as string | null)?.trim() || ""
  const p2Last  = (formData.get("player2LastName")  as string | null)?.trim() || ""
  const pairWeightRaw = (formData.get("pairWeight") as string | null) ?? ""
  const pairWeight = pairWeightRaw ? Number.parseFloat(pairWeightRaw) : null

  if (!p1First || !p1Last || !p2First || !p2Last) {
    return { error: "Veuillez renseigner les deux joueurs." }
  }

  // 1) Crée l’équipe
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .insert({ tournament_id: tournamentId, name: teamName || `${p1Last}/${p2Last}`, pair_weight: pairWeight })
    .select()
    .single()

  if (teamErr) return { error: teamErr.message }

  // 2) Ajoute les 2 joueurs rattachés à cette team
  const { error: pErr } = await supabase.from("players").insert([
    { tournament_id: tournamentId, team_id: team.id, first_name: p1First, last_name: p1Last },
    { tournament_id: tournamentId, team_id: team.id, first_name: p2First, last_name: p2Last },
  ])
  if (pErr) {
    // rollback simple si tu veux
    await supabase.from("teams").delete().eq("id", team.id)
    return { error: pErr.message }
  }

  revalidatePath("/dashboard/tournaments/[id]", "page")
  return { success: true }
}
