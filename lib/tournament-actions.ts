// lib/tournament-actions.ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { calculateFinalRankings } from "./ranking-actions"

// ✅ manquants
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

// Helper server-only
export async function createSupabaseClient() {
  const cookieStore = await cookies() // Next 15: cookies() doit être await
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ok si appelé depuis un Server Component
          }
        },
      },
    }
  )
}

// ---------------------------------------------------------------
export async function createTournament(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const name = String(formData.get("name") ?? "").trim()
  const judgeId = String(formData.get("judgeId") ?? "").trim()
  const startDate = String(formData.get("startDate") ?? "").trim()
  const endDate = formData.get("endDate")
    ? String(formData.get("endDate"))
    : null

  // On reçoit désormais un nombre d’équipes, qu’on convertit en joueurs (×2)
  const maxTeams = Number(formData.get("maxTeams") ?? 16)
  const max_players = maxTeams * 2

  if (!name || !judgeId || !startDate) {
    return { error: "Nom, date de début et juge requis" }
  }

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      name,
      judge_id: judgeId,
      start_date: startDate,
      end_date: endDate,
      max_players,
      status: "draft",
    })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  redirect(`/dashboard/tournaments/${data.id}`)
}

// ---------------------------------------------------------------
// Ajouter un joueur
export async function addPlayer(prevState: any, formData: FormData) {
  if (!formData) return { error: "Données du formulaire manquantes" }

  const firstName = formData.get("firstName")
  const lastName = formData.get("lastName")
  const nationalRanking = formData.get("nationalRanking")
  const tournamentId = formData.get("tournamentId")

  if (!firstName || !lastName || !tournamentId) {
    return { error: "Prénom, nom et tournoi requis" }
  }

  const supabase = await createSupabaseClient()

  try {
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("max_players")
      .eq("id", String(tournamentId))
      .single()

    const { count: currentPlayers } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", String(tournamentId))

    if (tournament && currentPlayers && currentPlayers >= tournament.max_players) {
      return { error: "Le tournoi a atteint sa capacité maximale" }
    }

    const { error } = await supabase.from("players").insert({
      first_name: String(firstName),
      last_name: String(lastName),
      national_ranking: nationalRanking ? Number.parseInt(String(nationalRanking)) : null,
      tournament_id: String(tournamentId),
    })

    if (error) {
      console.error("Erreur ajout joueur:", error)
      return { error: error.message }
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: "Joueur ajouté avec succès" }
  } catch (error) {
    console.error("Erreur ajout joueur:", error)
    return { error: "Une erreur inattendue s'est produite. Veuillez réessayer." }
  }
}

// Supprimer un joueur
export async function deletePlayer(playerId: string) {
  const supabase = await createSupabaseClient()
  try {
    const { error } = await supabase.from("players").delete().eq("id", playerId)
    if (error) throw new Error(error.message)
    revalidatePath("/dashboard/tournaments/[id]", "page")
  } catch (error) {
    console.error("Erreur suppression joueur:", error)
    throw error
  }
}

// Têtes de série (joueurs)
export async function calculateSeeding(tournamentId: string) {
  const supabase = await createSupabaseClient()
  try {
    const { data: players, error } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("national_ranking", { ascending: true, nullsLast: true })

    if (error) throw new Error(error.message)

    for (const [idx, player] of (players ?? []).entries()) {
      await supabase
        .from("players")
        .update({ seed_position: idx + 1 })
        .eq("id", player.id)
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  } catch (error) {
    console.error("Erreur calcul têtes de série:", error)
    throw error
  }
}

// Organiser les poules (joueurs)
export async function organizeGroups(tournamentId: string) {
  const supabase = await createSupabaseClient()
  try {
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed_position", { ascending: true, nullsLast: true })

    if (playersError) throw new Error(playersError.message)
    if (!players || players.length < 4) throw new Error("Minimum 4 joueurs requis pour organiser les poules")

    const numGroups = Math.ceil(players.length / 4)
    const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H"]

    // purge
    const existing = await supabase.from("groups").select("id").eq("tournament_id", tournamentId)
    await supabase
      .from("group_players")
      .delete()
      .in("group_id", existing.data?.map((g) => g.id) || [])
    await supabase.from("groups").delete().eq("tournament_id", tournamentId)

    // create groups
    const groups: any[] = []
    for (let i = 0; i < numGroups; i++) {
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({ tournament_id: tournamentId, name: `Groupe ${groupNames[i]}` })
        .select()
        .single()
      if (groupError) throw new Error(groupError.message)
      groups.push(group)
    }

    // snake draft
    const groupAssignments: Record<string, string[]> = {}
    groups.forEach((g) => (groupAssignments[g.id] = []))

    let current = 0
    let dir = 1
    for (const p of players) {
      const gid = groups[current].id
      groupAssignments[gid].push(p.id)
      await supabase.from("group_players").insert({ group_id: gid, player_id: p.id })

      current += dir
      if (current >= numGroups) {
        current = numGroups - 1
        dir = -1
      } else if (current < 0) {
        current = 0
        dir = 1
      }
    }

    await generateGroupMatches(tournamentId, groups, groupAssignments)

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: true }
  } catch (error) {
    console.error("Erreur organisation poules:", error)
    throw error
  }
}

// Générer les matchs de poules (joueurs)
async function generateGroupMatches(
  tournamentId: string,
  groups: any[],
  groupAssignments: Record<string, string[]>,
) {
  const supabase = await createSupabaseClient()

  for (const group of groups) {
    const ids = groupAssignments[group.id]
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        await supabase.from("matches").insert({
          tournament_id: tournamentId,
          group_id: group.id,
          player1_id: ids[i],
          player2_id: ids[j],
          match_type: "group",
          round_number: 1,
          status: "scheduled",
        })
      }
    }
  }
}

// Phases finales (simplifié)
export async function generateFinalPhase(tournamentId: string) {
  const supabase = await createSupabaseClient()
  try {
    const { data: groups } = await supabase
      .from("groups")
      .select(`id,name,group_players ( player_id, players(*) )`)
      .eq("tournament_id", tournamentId)

    if (!groups || groups.length === 0) throw new Error("Aucune poule trouvée. Organisez d'abord les poules.")

    const qualifiedPlayers: any[] = []
    for (const g of groups) {
      const top2 = (g.group_players ?? []).slice(0, 2)
      qualifiedPlayers.push(...top2.map((gp: any) => gp.players))
    }
    if (qualifiedPlayers.length < 4) throw new Error("Pas assez de joueurs qualifiés pour les phases finales")

    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .in("match_type", ["quarter_final", "semi_final", "final", "third_place"])

    if (qualifiedPlayers.length >= 8) {
      for (let i = 0; i < 8; i += 2) {
        await supabase.from("matches").insert({
          tournament_id: tournamentId,
          player1_id: qualifiedPlayers[i].id,
          player2_id: qualifiedPlayers[i + 1].id,
          match_type: "quarter_final",
          round_number: 1,
          status: "scheduled",
        })
      }
    }

    const semi = qualifiedPlayers.slice(0, 4)
    for (let i = 0; i < 4; i += 2) {
      await supabase.from("matches").insert({
        tournament_id: tournamentId,
        player1_id: semi[i].id,
        player2_id: semi[i + 1].id,
        match_type: "semi_final",
        round_number: 1,
        status: "scheduled",
      })
    }

    await supabase.from("matches").insert([
      { tournament_id: tournamentId, player1_id: null, player2_id: null, match_type: "final", round_number: 1, status: "scheduled" },
      { tournament_id: tournamentId, player1_id: null, player2_id: null, match_type: "third_place", round_number: 1, status: "scheduled" },
    ])

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: true }
  } catch (error) {
    console.error("Erreur génération phases finales:", error)
    throw error
  }
}

// Démarrer le tournoi
export async function startTournament(tournamentId: string) {
  const supabase = await createSupabaseClient()
  try {
    const { error } = await supabase.from("tournaments").update({ status: "in_progress" }).eq("id", tournamentId)
    if (error) throw new Error(error.message)
    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: true }
  } catch (error) {
    console.error("Erreur démarrage tournoi:", error)
    throw error
  }
}

// MAJ score & complétion éventuelle
export async function updateMatchScore(prevState: any, formData: FormData) {
  if (!formData) return { error: "Données du formulaire manquantes" }

  const matchId = formData.get("matchId")
  const player1Score = formData.get("player1Score")
  const player2Score = formData.get("player2Score")
  const tournamentId = formData.get("tournamentId")
  if (!matchId || !player1Score || !player2Score || !tournamentId) {
    return { error: "Tous les champs sont requis" }
  }

  const supabase = await createSupabaseClient()

  try {
    const s1 = Number.parseInt(String(player1Score))
    const s2 = Number.parseInt(String(player2Score))

    const { data: match } = await supabase
      .from("matches")
      .select("player1_id, player2_id, match_type")
      .eq("id", String(matchId))
      .single()

    const winnerId = match ? (s1 > s2 ? match.player1_id : match.player2_id) : null

    const { error } = await supabase
      .from("matches")
      .update({
        player1_score: s1,
        player2_score: s2,
        winner_id: winnerId,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", String(matchId))

    if (error) return { error: error.message }

    await checkAndAdvancePlayers(String(tournamentId), String(matchId))

    if (match?.match_type === "final") {
      try {
        await supabase.from("tournaments").update({ status: "completed" }).eq("id", String(tournamentId))
        await calculateFinalRankings(String(tournamentId))
      } catch (e) {
        console.error("Erreur auto-completion tournoi:", e)
      }
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: "Score mis à jour avec succès" }
  } catch (error) {
    console.error("Erreur mise à jour score:", error)
    return { error: "Une erreur inattendue s'est produite. Veuillez réessayer." }
  }
}

async function checkAndAdvancePlayers(tournamentId: string, matchId: string) {
  const supabase = await createSupabaseClient()
  // TODO: avancement automatique selon la logique de ton arbre
}

// ---------------------------------------------------------------
// ÉQUIPES
export async function addTeam(
  tournamentId: string,
  teamData: {
    name: string
    players: Array<{ firstName: string; lastName: string; nationalRanking: number | null }>
    pairWeight: number | null
  }
) {
  const supabase = await createSupabaseClient()

  // capacité = max_players/2
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("max_players")
    .eq("id", tournamentId)
    .single()

  const { count: currentTeams } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)

  const maxTeams = tournament ? Math.floor(tournament.max_players / 2) : 16
  if ((currentTeams ?? 0) >= maxTeams) {
    throw new Error("Le tournoi a atteint sa capacité maximale d'équipes")
  }

  if (teamData.players.length !== 2) {
    throw new Error("Une équipe doit avoir exactement 2 joueurs")
  }

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .insert({
      tournament_id: tournamentId,
      name: teamData.name,
      pair_weight: teamData.pairWeight,
    })
    .select()
    .single()
  if (teamErr) throw new Error(teamErr.message)

  // Ajout des 2 joueurs liés à l’équipe
  const { error: playersErr } = await supabase.from("players").insert(
    teamData.players.map((p) => ({
      first_name: p.firstName,
      last_name: p.lastName,
      national_ranking: p.nationalRanking,
      tournament_id: tournamentId,
      team_id: team.id,
    }))
  )
  if (playersErr) {
    await supabase.from("teams").delete().eq("id", team.id)
    throw new Error(playersErr.message)
  }

  return { success: true, teamId: team.id }
}

export async function deleteTeam(teamId: string) {
  const supabase = await createSupabaseClient()
  try {
    const { error } = await supabase.from("teams").delete().eq("id", teamId)
    if (error) throw new Error(error.message)
    revalidatePath("/dashboard/tournaments/[id]", "page")
  } catch (error) {
    console.error("Erreur suppression équipe:", error)
    throw error
  }
}

export async function calculateTeamSeeding(tournamentId: string) {
  const supabase = await createSupabaseClient()
  try {
    const { data: teams, error } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("pair_weight", { ascending: true, nullsLast: true })

    if (error) throw new Error(error.message)

    for (const [idx, team] of (teams ?? []).entries()) {
      await supabase.from("teams").update({ seed_position: idx + 1 }).eq("id", team.id)
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  } catch (error) {
    console.error("Erreur calcul têtes de série équipes:", error)
    throw error
  }
}
