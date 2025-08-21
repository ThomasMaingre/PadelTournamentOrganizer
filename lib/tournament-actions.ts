"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { calculateFinalRankings } from "./ranking-actions"

// Helper function to create Supabase client
function createSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}

// Create a new tournament
export async function createTournament(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Données du formulaire manquantes" }
  }

  const name = formData.get("name")
  const startDate = formData.get("startDate")
  const endDate = formData.get("endDate")
  const maxPlayers = formData.get("maxPlayers")
  const judgeId = formData.get("judgeId")

  if (!name || !startDate || !judgeId) {
    return { error: "Nom du tournoi, date de début et juge requis" }
  }

  const supabase = createSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        name: name.toString(),
        judge_id: judgeId.toString(),
        start_date: startDate.toString(),
        end_date: endDate ? endDate.toString() : null,
        max_players: Number.parseInt(maxPlayers?.toString() || "32"),
        status: "draft",
      })
      .select()
      .single()

    if (error) {
      console.error("Erreur création tournoi:", error)
      return { error: error.message }
    }

    revalidatePath("/dashboard")
    return { success: true, tournamentId: data.id }
  } catch (error) {
    console.error("Erreur création tournoi:", error)
    return { error: "Une erreur inattendue s'est produite. Veuillez réessayer." }
  }
}

// Add a player to a tournament
export async function addPlayer(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Données du formulaire manquantes" }
  }

  const firstName = formData.get("firstName")
  const lastName = formData.get("lastName")
  const nationalRanking = formData.get("nationalRanking")
  const tournamentId = formData.get("tournamentId")

  if (!firstName || !lastName || !tournamentId) {
    return { error: "Prénom, nom et tournoi requis" }
  }

  const supabase = createSupabaseClient()

  try {
    // Check tournament capacity
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("max_players")
      .eq("id", tournamentId.toString())
      .single()

    const { count: currentPlayers } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId.toString())

    if (tournament && currentPlayers && currentPlayers >= tournament.max_players) {
      return { error: "Le tournoi a atteint sa capacité maximale" }
    }

    const { error } = await supabase.from("players").insert({
      first_name: firstName.toString(),
      last_name: lastName.toString(),
      national_ranking: nationalRanking ? Number.parseInt(nationalRanking.toString()) : null,
      tournament_id: tournamentId.toString(),
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

// Delete a player from a tournament
export async function deletePlayer(playerId: string) {
  const supabase = createSupabaseClient()

  try {
    const { error } = await supabase.from("players").delete().eq("id", playerId)

    if (error) {
      console.error("Erreur suppression joueur:", error)
      throw new Error(error.message)
    }

    revalidatePath("/dashboard/tournaments/[id]", "page")
  } catch (error) {
    console.error("Erreur suppression joueur:", error)
    throw error
  }
}

// Calculate seeding based on national rankings
export async function calculateSeeding(tournamentId: string) {
  const supabase = createSupabaseClient()

  try {
    // Get all players for the tournament
    const { data: players, error } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("national_ranking", { ascending: true, nullsLast: true })

    if (error) {
      console.error("Erreur récupération joueurs:", error)
      throw new Error(error.message)
    }

    // Update seed positions
    const updates = players.map((player, index) => ({
      id: player.id,
      seed_position: index + 1,
    }))

    for (const update of updates) {
      await supabase.from("players").update({ seed_position: update.seed_position }).eq("id", update.id)
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  } catch (error) {
    console.error("Erreur calcul têtes de série:", error)
    throw error
  }
}

// Organize players into groups/pools
export async function organizeGroups(tournamentId: string) {
  const supabase = createSupabaseClient()

  try {
    // Get all players with their seed positions
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed_position", { ascending: true, nullsLast: true })

    if (playersError) {
      throw new Error(playersError.message)
    }

    if (!players || players.length < 4) {
      throw new Error("Minimum 4 joueurs requis pour organiser les poules")
    }

    // Calculate number of groups (4 players per group ideally)
    const numGroups = Math.ceil(players.length / 4)
    const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H"]

    // Delete existing groups for this tournament
    await supabase
      .from("group_players")
      .delete()
      .in(
        "group_id",
        (await supabase.from("groups").select("id").eq("tournament_id", tournamentId)).data?.map((g) => g.id) || [],
      )
    await supabase.from("groups").delete().eq("tournament_id", tournamentId)

    // Create groups
    const groups = []
    for (let i = 0; i < numGroups; i++) {
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          tournament_id: tournamentId,
          name: `Groupe ${groupNames[i]}`,
        })
        .select()
        .single()

      if (groupError) {
        throw new Error(groupError.message)
      }
      groups.push(group)
    }

    // Distribute players using snake draft method
    const groupAssignments: { [key: string]: string[] } = {}
    groups.forEach((group) => {
      groupAssignments[group.id] = []
    })

    // Snake draft distribution
    let currentGroup = 0
    let direction = 1

    for (const player of players) {
      const groupId = groups[currentGroup].id
      groupAssignments[groupId].push(player.id)

      // Insert into group_players table
      await supabase.from("group_players").insert({
        group_id: groupId,
        player_id: player.id,
      })

      // Move to next group
      currentGroup += direction
      if (currentGroup >= numGroups) {
        currentGroup = numGroups - 1
        direction = -1
      } else if (currentGroup < 0) {
        currentGroup = 0
        direction = 1
      }
    }

    // Generate group matches
    await generateGroupMatches(tournamentId, groups, groupAssignments)

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: true }
  } catch (error) {
    console.error("Erreur organisation poules:", error)
    throw error
  }
}

// Generate matches for all groups
async function generateGroupMatches(
  tournamentId: string,
  groups: any[],
  groupAssignments: { [key: string]: string[] },
) {
  const supabase = createSupabaseClient()

  for (const group of groups) {
    const playerIds = groupAssignments[group.id]

    // Generate round-robin matches for this group
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        await supabase.from("matches").insert({
          tournament_id: tournamentId,
          group_id: group.id,
          player1_id: playerIds[i],
          player2_id: playerIds[j],
          match_type: "group",
          round_number: 1,
          status: "scheduled",
        })
      }
    }
  }
}

// Generate final phase matches (quarters, semis, final)
export async function generateFinalPhase(tournamentId: string) {
  const supabase = createSupabaseClient()

  try {
    // Get group winners and runners-up
    const { data: groups } = await supabase
      .from("groups")
      .select(`
        id,
        name,
        group_players (
          player_id,
          players (*)
        )
      `)
      .eq("tournament_id", tournamentId)

    if (!groups || groups.length === 0) {
      throw new Error("Aucune poule trouvée. Organisez d'abord les poules.")
    }

    // For now, we'll take the first 2 players from each group
    // In a real implementation, this would be based on match results
    const qualifiedPlayers = []
    for (const group of groups) {
      const groupPlayers = group.group_players.slice(0, 2) // Top 2 from each group
      qualifiedPlayers.push(...groupPlayers.map((gp) => gp.players))
    }

    if (qualifiedPlayers.length < 4) {
      throw new Error("Pas assez de joueurs qualifiés pour les phases finales")
    }

    // Delete existing final phase matches
    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .in("match_type", ["quarter_final", "semi_final", "final", "third_place"])

    // Generate quarter-finals if we have 8+ qualified players
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

    // Generate semi-finals
    const semiPlayers = qualifiedPlayers.slice(0, 4)
    for (let i = 0; i < 4; i += 2) {
      await supabase.from("matches").insert({
        tournament_id: tournamentId,
        player1_id: semiPlayers[i].id,
        player2_id: semiPlayers[i + 1].id,
        match_type: "semi_final",
        round_number: 1,
        status: "scheduled",
      })
    }

    // Generate final and third place matches (will be populated after semis)
    await supabase.from("matches").insert([
      {
        tournament_id: tournamentId,
        player1_id: null,
        player2_id: null,
        match_type: "final",
        round_number: 1,
        status: "scheduled",
      },
      {
        tournament_id: tournamentId,
        player1_id: null,
        player2_id: null,
        match_type: "third_place",
        round_number: 1,
        status: "scheduled",
      },
    ])

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: true }
  } catch (error) {
    console.error("Erreur génération phases finales:", error)
    throw error
  }
}

// Start the tournament
export async function startTournament(tournamentId: string) {
  const supabase = createSupabaseClient()

  try {
    // Update tournament status
    const { error } = await supabase.from("tournaments").update({ status: "in_progress" }).eq("id", tournamentId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: true }
  } catch (error) {
    console.error("Erreur démarrage tournoi:", error)
    throw error
  }
}

// Update match score and check for tournament completion
export async function updateMatchScore(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Données du formulaire manquantes" }
  }

  const matchId = formData.get("matchId")
  const player1Score = formData.get("player1Score")
  const player2Score = formData.get("player2Score")
  const tournamentId = formData.get("tournamentId")

  if (!matchId || !player1Score || !player2Score || !tournamentId) {
    return { error: "Tous les champs sont requis" }
  }

  const supabase = createSupabaseClient()

  try {
    const score1 = Number.parseInt(player1Score.toString())
    const score2 = Number.parseInt(player2Score.toString())

    // Determine winner
    let winnerId = null
    const status = "completed"

    // Get match details to determine winner
    const { data: match } = await supabase
      .from("matches")
      .select("player1_id, player2_id, match_type")
      .eq("id", matchId.toString())
      .single()

    if (match) {
      winnerId = score1 > score2 ? match.player1_id : match.player2_id
    }

    // Update match
    const { error } = await supabase
      .from("matches")
      .update({
        player1_score: score1,
        player2_score: score2,
        winner_id: winnerId,
        status: status,
        completed_at: new Date().toISOString(),
      })
      .eq("id", matchId.toString())

    if (error) {
      console.error("Erreur mise à jour score:", error)
      return { error: error.message }
    }

    // Check if we need to advance players to next round
    await checkAndAdvancePlayers(tournamentId.toString(), matchId.toString())

    if (match?.match_type === "final") {
      // Final match completed, we can complete the tournament
      try {
        await supabase.from("tournaments").update({ status: "completed" }).eq("id", tournamentId.toString())
        await calculateFinalRankings(tournamentId.toString())
      } catch (error) {
        console.error("Erreur auto-completion tournoi:", error)
      }
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: "Score mis à jour avec succès" }
  } catch (error) {
    console.error("Erreur mise à jour score:", error)
    return { error: "Une erreur inattendue s'est produite. Veuillez réessayer." }
  }
}

// Function to check and advance players to the next round
async function checkAndAdvancePlayers(tournamentId: string, matchId: string) {
  const supabase = createSupabaseClient()

  // Implementation of checkAndAdvancePlayers function
  // This function should determine if players need to be advanced to the next round
  // based on the match results and update the group_players table accordingly
}

// Add a team to a tournament
export async function addTeam(
  tournamentId: string,
  teamData: {
    name: string
    players: Array<{
      firstName: string
      lastName: string
      nationalRanking: number | null
    }>
    pairWeight: number | null
  },
) {
  const supabase = createSupabaseClient()

  try {
    // Check tournament capacity (teams instead of individual players)
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("max_players")
      .eq("id", tournamentId)
      .single()

    const { count: currentTeams } = await supabase
      .from("teams")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)

    // Max teams = max_players / 2 (since each team has 2 players)
    const maxTeams = tournament ? Math.floor(tournament.max_players / 2) : 16

    if (currentTeams && currentTeams >= maxTeams) {
      throw new Error("Le tournoi a atteint sa capacité maximale d'équipes")
    }

    if (teamData.players.length !== 2) {
      throw new Error("Une équipe doit avoir exactement 2 joueurs")
    }

    // Create the team
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        tournament_id: tournamentId,
        name: teamData.name,
        pair_weight: teamData.pairWeight,
      })
      .select()
      .single()

    if (teamError) {
      console.error("Erreur création équipe:", teamError)
      throw new Error(teamError.message)
    }

    // Add players to the team
    for (const playerData of teamData.players) {
      const { error: playerError } = await supabase.from("players").insert({
        first_name: playerData.firstName,
        last_name: playerData.lastName,
        national_ranking: playerData.nationalRanking,
        tournament_id: tournamentId,
        team_id: team.id,
      })

      if (playerError) {
        console.error("Erreur ajout joueur:", playerError)
        // Rollback: delete the team if player creation fails
        await supabase.from("teams").delete().eq("id", team.id)
        throw new Error(playerError.message)
      }
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: true, teamId: team.id }
  } catch (error) {
    console.error("Erreur ajout équipe:", error)
    throw error
  }
}

// Delete a team from a tournament
export async function deleteTeam(teamId: string) {
  const supabase = createSupabaseClient()

  try {
    // Delete team (players will be deleted automatically due to CASCADE)
    const { error } = await supabase.from("teams").delete().eq("id", teamId)

    if (error) {
      console.error("Erreur suppression équipe:", error)
      throw new Error(error.message)
    }

    revalidatePath("/dashboard/tournaments/[id]", "page")
  } catch (error) {
    console.error("Erreur suppression équipe:", error)
    throw error
  }
}

export async function calculateTeamSeeding(tournamentId: string) {
  const supabase = createSupabaseClient()

  try {
    // Get all teams for the tournament, ordered by pair weight (lower = better)
    const { data: teams, error } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("pair_weight", { ascending: true, nullsLast: true })

    if (error) {
      console.error("Erreur récupération équipes:", error)
      throw new Error(error.message)
    }

    // Update seed positions for teams
    const updates = teams.map((team, index) => ({
      id: team.id,
      seed_position: index + 1,
    }))

    for (const update of updates) {
      await supabase.from("teams").update({ seed_position: update.seed_position }).eq("id", update.id)
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  } catch (error) {
    console.error("Erreur calcul têtes de série équipes:", error)
    throw error
  }
}
