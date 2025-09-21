"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

// Helper function to create Supabase client
function createSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      async getAll() {
        return (await cookieStore).getAll()
      },
      async setAll(cookiesToSet) {
        try {
          const store = await cookieStore
          cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options))
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
      .select("winner_team_id, team1_id, team2_id, status")
      .eq("tournament_id", tournamentId)
      .eq("match_type", "final")
      .single()

    // Get third place match
    const { data: thirdPlaceMatch } = await supabase
      .from("matches")
      .select("winner_team_id, team1_id, team2_id, status")
      .eq("tournament_id", tournamentId)
      .eq("match_type", "third_place")
      .single()

    // Get all teams and their match statistics
    const { data: teams } = await supabase.from("teams").select("*").eq("tournament_id", tournamentId)

    if (!teams) {
      throw new Error("Aucune équipe trouvée pour ce tournoi")
    }

    // Calculate statistics for each team
    const teamStats = await Promise.all(
      teams.map(async (team) => {
        // Get all matches for this team
        const { data: matches } = await supabase
          .from("matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .or(`team1_id.eq.${team.id},team2_id.eq.${team.id}`)
          .eq("status", "completed")

        let matchesWon = 0
        let matchesLost = 0
        let pointsFor = 0
        let pointsAgainst = 0

        if (matches) {
          for (const match of matches) {
            if (match.team1_id === team.id) {
              pointsFor += match.player1_score || 0
              pointsAgainst += match.player2_score || 0
              if (match.winner_team_id === team.id) {
                matchesWon++
              } else {
                matchesLost++
              }
            } else {
              pointsFor += match.player2_score || 0
              pointsAgainst += match.player1_score || 0
              if (match.winner_team_id === team.id) {
                matchesWon++
              } else {
                matchesLost++
              }
            }
          }
        }

        return {
          ...team,
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
    if (finalMatch?.winner_team_id) {
      const winner = teamStats.find((t) => t.id === finalMatch.winner_team_id)
      if (winner) {
        rankings.push({
          team_id: winner.id,
          final_position: 1,
          points_earned: winner.points_for,
          matches_won: winner.matches_won,
          matches_lost: winner.matches_lost,
        })
      }
    }

    // 2nd place - Final loser
    if (finalMatch?.team1_id && finalMatch?.team2_id && finalMatch?.winner_team_id) {
      const runnerId = finalMatch.winner_team_id === finalMatch.team1_id ? finalMatch.team2_id : finalMatch.team1_id
      const runner = teamStats.find((t) => t.id === runnerId)
      if (runner) {
        rankings.push({
          team_id: runner.id,
          final_position: 2,
          points_earned: runner.points_for,
          matches_won: runner.matches_won,
          matches_lost: runner.matches_lost,
        })
      }
    }

    // 3rd place - Third place match winner
    if (thirdPlaceMatch?.winner_team_id) {
      const thirdPlace = teamStats.find((t) => t.id === thirdPlaceMatch.winner_team_id)
      if (thirdPlace) {
        rankings.push({
          team_id: thirdPlace.id,
          final_position: 3,
          points_earned: thirdPlace.points_for,
          matches_won: thirdPlace.matches_won,
          matches_lost: thirdPlace.matches_lost,
        })
      }
    }

    // 4th place - Third place match loser (si il y a un match pour la 3ème place)
    if (thirdPlaceMatch?.team1_id && thirdPlaceMatch?.team2_id && thirdPlaceMatch?.winner_team_id) {
      const fourthId =
        thirdPlaceMatch.winner_team_id === thirdPlaceMatch.team1_id
          ? thirdPlaceMatch.team2_id
          : thirdPlaceMatch.team1_id
      const fourth = teamStats.find((t) => t.id === fourthId)
      if (fourth) {
        rankings.push({
          team_id: fourth.id,
          final_position: 4,
          points_earned: fourth.points_for,
          matches_won: fourth.matches_won,
          matches_lost: fourth.matches_lost,
        })
      }
    }

    // Remaining teams - sort by performance et gérer les ex æquo
    const rankedTeamIds = rankings.map((r) => r.team_id)
    const remainingTeams = teamStats
      .filter((t) => !rankedTeamIds.includes(t.id))
      .sort((a, b) => {
        // Sort by matches won, then by points difference
        if (a.matches_won !== b.matches_won) {
          return b.matches_won - a.matches_won
        }
        return b.points_difference - a.points_difference
      })

    // Add remaining teams to rankings en gérant les ex æquo
    let currentPosition = rankings.length + 1
    let previousStats = null

    remainingTeams.forEach((team, index) => {
      // Si les stats sont identiques au précédent, même position
      if (previousStats &&
          team.matches_won === previousStats.matches_won &&
          team.points_difference === previousStats.points_difference) {
        // Garde la même position que le précédent
      } else {
        // Nouvelle position = nombre d'équipes déjà classées + 1
        currentPosition = rankings.length + 1
      }

      rankings.push({
        team_id: team.id,
        final_position: currentPosition,
        points_earned: team.points_for,
        matches_won: team.matches_won,
        matches_lost: team.matches_lost,
      })

      previousStats = team
    })

    // Cas spécial : Si pas de match pour la 3ème place, les demi-finalistes perdants sont ex æquo 3ème
    if (!thirdPlaceMatch && finalMatch) {
      const semifinalLosers = teamStats.filter(team =>
        !rankedTeamIds.includes(team.id) &&
        team.matches_won > 0 && // Ont gagné au moins un match (donc pas éliminés au 1er tour)
        rankings.length < 4 // Pas encore 4 équipes classées
      )

      if (semifinalLosers.length >= 2) {
        // Mettre les 2 demi-finalistes perdants à égalité en 3ème place
        semifinalLosers.slice(0, 2).forEach(team => {
          const existingRanking = rankings.find(r => r.team_id === team.id)
          if (existingRanking) {
            existingRanking.final_position = 3
          }
        })
      }
    }

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

    revalidatePath("/dashboard/tournaments/[id]", "page")
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

    revalidatePath("/dashboard/tournaments/[id]", "page")
    return { success: true }
  } catch (error) {
    console.error("Erreur clôture tournoi:", error)
    throw error
  }
}
