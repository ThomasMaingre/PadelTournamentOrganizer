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

// Calculate and save final tournament rankings
export async function calculateFinalRankings(tournamentId: string) {
  const supabase = createSupabaseClient()

  try {
    // Check if tournament is completed
    const { data: tournament } = await supabase.from("tournaments").select("status").eq("id", tournamentId).single()

    if (!tournament || tournament.status !== "completed") {
      throw new Error("Le tournoi doit être terminé pour calculer le classement final")
    }

    // Get final match to determine winner and runner-up
    const { data: finalMatch } = await supabase
      .from("matches")
      .select("winner_id, player1_id, player2_id, status")
      .eq("tournament_id", tournamentId)
      .eq("match_type", "final")
      .single()

    // Get third place match
    const { data: thirdPlaceMatch } = await supabase
      .from("matches")
      .select("winner_id, player1_id, player2_id, status")
      .eq("tournament_id", tournamentId)
      .eq("match_type", "third_place")
      .single()

    // Get all players and their match statistics
    const { data: players } = await supabase.from("players").select("*").eq("tournament_id", tournamentId)

    if (!players) {
      throw new Error("Aucun joueur trouvé pour ce tournoi")
    }

    // Calculate statistics for each player
    const playerStats = await Promise.all(
      players.map(async (player) => {
        // Get all matches for this player
        const { data: matches } = await supabase
          .from("matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .or(`player1_id.eq.${player.id},player2_id.eq.${player.id}`)
          .eq("status", "completed")

        let matchesWon = 0
        let matchesLost = 0
        let pointsFor = 0
        let pointsAgainst = 0

        if (matches) {
          for (const match of matches) {
            if (match.player1_id === player.id) {
              pointsFor += match.player1_score
              pointsAgainst += match.player2_score
              if (match.winner_id === player.id) {
                matchesWon++
              } else {
                matchesLost++
              }
            } else {
              pointsFor += match.player2_score
              pointsAgainst += match.player1_score
              if (match.winner_id === player.id) {
                matchesWon++
              } else {
                matchesLost++
              }
            }
          }
        }

        return {
          ...player,
          matches_won: matchesWon,
          matches_lost: matchesLost,
          points_for: pointsFor,
          points_against: pointsAgainst,
          points_difference: pointsFor - pointsAgainst,
        }
      }),
    )

    // Determine final positions
    const rankings = []

    // 1st place - Final winner
    if (finalMatch?.winner_id) {
      const winner = playerStats.find((p) => p.id === finalMatch.winner_id)
      if (winner) {
        rankings.push({
          player_id: winner.id,
          final_position: 1,
          points_earned: winner.points_for,
          matches_won: winner.matches_won,
          matches_lost: winner.matches_lost,
        })
      }
    }

    // 2nd place - Final loser
    if (finalMatch?.player1_id && finalMatch?.player2_id && finalMatch?.winner_id) {
      const runnerId = finalMatch.winner_id === finalMatch.player1_id ? finalMatch.player2_id : finalMatch.player1_id
      const runner = playerStats.find((p) => p.id === runnerId)
      if (runner) {
        rankings.push({
          player_id: runner.id,
          final_position: 2,
          points_earned: runner.points_for,
          matches_won: runner.matches_won,
          matches_lost: runner.matches_lost,
        })
      }
    }

    // 3rd place - Third place match winner
    if (thirdPlaceMatch?.winner_id) {
      const thirdPlace = playerStats.find((p) => p.id === thirdPlaceMatch.winner_id)
      if (thirdPlace) {
        rankings.push({
          player_id: thirdPlace.id,
          final_position: 3,
          points_earned: thirdPlace.points_for,
          matches_won: thirdPlace.matches_won,
          matches_lost: thirdPlace.matches_lost,
        })
      }
    }

    // 4th place - Third place match loser
    if (thirdPlaceMatch?.player1_id && thirdPlaceMatch?.player2_id && thirdPlaceMatch?.winner_id) {
      const fourthId =
        thirdPlaceMatch.winner_id === thirdPlaceMatch.player1_id
          ? thirdPlaceMatch.player2_id
          : thirdPlaceMatch.player1_id
      const fourth = playerStats.find((p) => p.id === fourthId)
      if (fourth) {
        rankings.push({
          player_id: fourth.id,
          final_position: 4,
          points_earned: fourth.points_for,
          matches_won: fourth.matches_won,
          matches_lost: fourth.matches_lost,
        })
      }
    }

    // Remaining players - sort by performance
    const rankedPlayerIds = rankings.map((r) => r.player_id)
    const remainingPlayers = playerStats
      .filter((p) => !rankedPlayerIds.includes(p.id))
      .sort((a, b) => {
        // Sort by matches won, then by points difference
        if (a.matches_won !== b.matches_won) {
          return b.matches_won - a.matches_won
        }
        return b.points_difference - a.points_difference
      })

    // Add remaining players to rankings
    remainingPlayers.forEach((player, index) => {
      rankings.push({
        player_id: player.id,
        final_position: rankings.length + 1,
        points_earned: player.points_for,
        matches_won: player.matches_won,
        matches_lost: player.matches_lost,
      })
    })

    // Clear existing rankings
    await supabase.from("tournament_rankings").delete().eq("tournament_id", tournamentId)

    // Insert new rankings
    const rankingInserts = rankings.map((ranking) => ({
      tournament_id: tournamentId,
      ...ranking,
    }))

    const { error: insertError } = await supabase.from("tournament_rankings").insert(rankingInserts)

    if (insertError) {
      throw new Error(insertError.message)
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: true }
  } catch (error) {
    console.error("Erreur calcul classement final:", error)
    throw error
  }
}

// Complete tournament and calculate final rankings
export async function completeTournament(tournamentId: string) {
  const supabase = createSupabaseClient()

  try {
    // Check if final match is completed
    const { data: finalMatch } = await supabase
      .from("matches")
      .select("status")
      .eq("tournament_id", tournamentId)
      .eq("match_type", "final")
      .single()

    if (!finalMatch || finalMatch.status !== "completed") {
      throw new Error("La finale doit être terminée pour clôturer le tournoi")
    }

    // Update tournament status
    await supabase.from("tournaments").update({ status: "completed" }).eq("id", tournamentId)

    // Calculate final rankings
    await calculateFinalRankings(tournamentId)

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: true }
  } catch (error) {
    console.error("Erreur clôture tournoi:", error)
    throw error
  }
}
