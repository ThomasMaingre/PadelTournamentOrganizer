"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

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

// Update match score
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
      .select("player1_id, player2_id")
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

    revalidatePath("/dashboard/tournaments/[id]", "page")
    return { success: "Score mis à jour avec succès" }
  } catch (error) {
    console.error("Erreur mise à jour score:", error)
    return { error: "Une erreur inattendue s'est produite. Veuillez réessayer." }
  }
}

// Start a match
export async function startMatch(matchId: string, tournamentId: string) {
  const supabase = createSupabaseClient()

  try {
    const { error } = await supabase
      .from("matches")
      .update({
        status: "in_progress",
        scheduled_time: new Date().toISOString(),
      })
      .eq("id", matchId)

    if (error) {
      console.error("Erreur démarrage match:", error)
      throw new Error(error.message)
    }

    revalidatePath("/dashboard/tournaments/[id]", "page")
  } catch (error) {
    console.error("Erreur démarrage match:", error)
    throw error
  }
}

// Check if players should advance to next round
async function checkAndAdvancePlayers(tournamentId: string, completedMatchId: string) {
  const supabase = createSupabaseClient()

  try {
    // Get the completed match details
    const { data: completedMatch } = await supabase
      .from("matches")
      .select("match_type, winner_id")
      .eq("id", completedMatchId)
      .single()

    if (!completedMatch || !completedMatch.winner_id) return

    // Handle advancement based on match type
    switch (completedMatch.match_type) {
      case "semi_final":
        await advanceToFinal(tournamentId, completedMatch.winner_id)
        break
      case "quarter_final":
        await advanceToSemiFinal(tournamentId, completedMatch.winner_id)
        break
    }
  } catch (error) {
    console.error("Erreur progression joueurs:", error)
  }
}

// Advance winner to final
async function advanceToFinal(tournamentId: string, winnerId: string) {
  const supabase = createSupabaseClient()

  try {
    // Find the final match
    const { data: finalMatch } = await supabase
      .from("matches")
      .select("id, player1_id, player2_id")
      .eq("tournament_id", tournamentId)
      .eq("match_type", "final")
      .single()

    if (finalMatch) {
      // Update final match with the winner
      if (!finalMatch.player1_id) {
        await supabase.from("matches").update({ player1_id: winnerId }).eq("id", finalMatch.id)
      } else if (!finalMatch.player2_id) {
        await supabase.from("matches").update({ player2_id: winnerId }).eq("id", finalMatch.id)
      }
    }
  } catch (error) {
    console.error("Erreur progression finale:", error)
  }
}

// Advance winner to semi-final
async function advanceToSemiFinal(tournamentId: string, winnerId: string) {
  const supabase = createSupabaseClient()

  try {
    // Find available semi-final match
    const { data: semiMatches } = await supabase
      .from("matches")
      .select("id, player1_id, player2_id")
      .eq("tournament_id", tournamentId)
      .eq("match_type", "semi_final")
      .order("id")

    if (semiMatches) {
      for (const match of semiMatches) {
        if (!match.player1_id) {
          await supabase.from("matches").update({ player1_id: winnerId }).eq("id", match.id)
          break
        } else if (!match.player2_id) {
          await supabase.from("matches").update({ player2_id: winnerId }).eq("id", match.id)
          break
        }
      }
    }
  } catch (error) {
    console.error("Erreur progression demi-finale:", error)
  }
}

// Calculate group standings
export async function calculateGroupStandings(tournamentId: string, groupId: string) {
  const supabase = createSupabaseClient()

  try {
    // Get all matches for this group
    const { data: matches } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("group_id", groupId)
      .eq("status", "completed")

    // Get all players in this group
    const { data: groupPlayers } = await supabase
      .from("group_players")
      .select(`
        player_id,
        players (
          id,
          first_name,
          last_name
        )
      `)
      .eq("group_id", groupId)

    if (!matches || !groupPlayers) return []

    // Calculate standings
    const standings = groupPlayers.map((gp) => ({
      player: gp.players,
      matches_played: 0,
      matches_won: 0,
      matches_lost: 0,
      points_for: 0,
      points_against: 0,
      points_difference: 0,
    }))

    // Process each match
    for (const match of matches) {
      const player1Standing = standings.find((s) => s.player.id === match.player1_id)
      const player2Standing = standings.find((s) => s.player.id === match.player2_id)

      if (player1Standing && player2Standing) {
        player1Standing.matches_played++
        player2Standing.matches_played++
        player1Standing.points_for += match.player1_score
        player1Standing.points_against += match.player2_score
        player2Standing.points_for += match.player2_score
        player2Standing.points_against += match.player1_score

        if (match.winner_id === match.player1_id) {
          player1Standing.matches_won++
          player2Standing.matches_lost++
        } else {
          player2Standing.matches_won++
          player1Standing.matches_lost++
        }
      }
    }

    // Calculate points difference and sort
    standings.forEach((s) => {
      s.points_difference = s.points_for - s.points_against
    })

    // Sort by matches won, then by points difference
    standings.sort((a, b) => {
      if (a.matches_won !== b.matches_won) {
        return b.matches_won - a.matches_won
      }
      return b.points_difference - a.points_difference
    })

    return standings
  } catch (error) {
    console.error("Erreur calcul classement poule:", error)
    return []
  }
}
