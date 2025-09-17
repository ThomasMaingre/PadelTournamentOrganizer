// // lib/tournament-actions.ts
// "use server"

// import { createSupabaseServerClient } from "@/lib/supabase/server"
// import { revalidatePath } from "next/cache"
// import { redirect } from "next/navigation"
// import { calculateFinalRankings } from "./ranking-actions"

// import { cookies } from "next/headers"
// import { createServerClient } from "@supabase/ssr"

// // ──────────────────────────────────────────────────────────────────────────────
// // SUPABASE (server only)
// // ──────────────────────────────────────────────────────────────────────────────
// export async function createSupabaseClient() {
//   const cookieStore = await cookies()
//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll: () => cookieStore.getAll(),
//         setAll(cookiesToSet) {
//           try {
//             cookiesToSet.forEach(({ name, value, options }) =>
//               cookieStore.set(name, value, options),
//             )
//           } catch { /* ok en RSC */ }
//         },
//       },
//     },
//   )
// }

// // ──────────────────────────────────────────────────────────────────────────────
// // TOURNOI / EQUIPES (création, seeding, etc.)
// // ──────────────────────────────────────────────────────────────────────────────
// export async function createTournament(formData: FormData) {
//   const supabase = await createSupabaseServerClient()

//   const name = String(formData.get("name") ?? "").trim()
//   const judgeId = String(formData.get("judgeId") ?? "").trim()
//   const startDate = String(formData.get("startDate") ?? "").trim()
//   const endDate = formData.get("endDate") ? String(formData.get("endDate")) : null

//   const maxTeams = Number(formData.get("maxTeams") ?? 16)
//   const max_players = maxTeams * 2

//   if (!name || !judgeId || !startDate) {
//     return { error: "Nom, date de début et juge requis" }
//   }

//   const { data, error } = await supabase
//     .from("tournaments")
//     .insert({
//       name,
//       judge_id: judgeId,
//       start_date: startDate,
//       end_date: endDate,
//       max_players,
//       status: "draft",
//     })
//     .select("id")
//     .single()

//   if (error) return { error: error.message }

//   revalidatePath("/dashboard")
//   redirect(`/dashboard/tournaments/${data.id}`)
// }

// export async function addPlayer(prevState: any, formData: FormData) {
//   if (!formData) return { error: "Données du formulaire manquantes" }

//   const firstName = formData.get("firstName")
//   const lastName = formData.get("lastName")
//   const nationalRanking = formData.get("nationalRanking")
//   const tournamentId = formData.get("tournamentId")

//   if (!firstName || !lastName || !tournamentId)
//     return { error: "Prénom, nom et tournoi requis" }

//   const supabase = await createSupabaseClient()

//   try {
//     const { data: tournament } = await supabase
//       .from("tournaments")
//       .select("max_players")
//       .eq("id", String(tournamentId))
//       .single()

//     const { count: currentPlayers } = await supabase
//       .from("players")
//       .select("*", { count: "exact", head: true })
//       .eq("tournament_id", String(tournamentId))

//     if (tournament && currentPlayers && currentPlayers >= tournament.max_players) {
//       return { error: "Le tournoi a atteint sa capacité maximale" }
//     }

//     const { error } = await supabase.from("players").insert({
//       first_name: String(firstName),
//       last_name: String(lastName),
//       national_ranking: nationalRanking ? Number.parseInt(String(nationalRanking)) : null,
//       tournament_id: String(tournamentId),
//     })

//     if (error) return { error: error.message }

//     revalidatePath(`/dashboard/tournaments/${tournamentId}`)
//     return { success: "Joueur ajouté avec succès" }
//   } catch (error) {
//     console.error("Erreur ajout joueur:", error)
//     return { error: "Une erreur inattendue s'est produite. Veuillez réessayer." }
//   }
// }

// export async function deletePlayer(playerId: string) {
//   const supabase = await createSupabaseClient()
//   const { error } = await supabase.from("players").delete().eq("id", playerId)
//   if (error) throw new Error(error.message)
//   revalidatePath("/dashboard/tournaments/[id]", "page")
// }

// export async function calculateTeamSeeding(tournamentId: string) {
//   const supabase = await createSupabaseClient()
//   const { data: teams, error } = await supabase
//     .from("teams")
//     .select("*")
//     .eq("tournament_id", tournamentId)
//     .order("pair_weight", { ascending: true, nullsLast: true })

//   if (error) throw new Error(error.message)

//   for (const [idx, team] of (teams ?? []).entries()) {
//     await supabase.from("teams").update({ seed_position: idx + 1 }).eq("id", team.id)
//   }
//   revalidatePath(`/dashboard/tournaments/${tournamentId}`)
// }

// // ──────────────────────────────────────────────────────────────────────────────
// // GENERATION D'UN TABLEAU A ELIMINATION DIRECTE (équipes uniquement)
// // ──────────────────────────────────────────────────────────────────────────────
// function roundLabel(size: number): "final" | "semi_final" | "quarter_final" | "round_of_16" | "round_of_32" {
//   if (size <= 2) return "final"
//   if (size === 4) return "semi_final"
//   if (size === 8) return "quarter_final"
//   if (size === 16) return "round_of_16"
//   return "round_of_32"
// }

// export async function generateKnockoutBracket(tournamentId: string) {
//   const supabase = await createSupabaseClient()

//   // 1) équipes triées par seed puis poids
//   const { data: tms, error: tErr } = await supabase
//     .from("teams")
//     .select("id, seed_position, pair_weight")
//     .eq("tournament_id", tournamentId)
//     .order("seed_position", { ascending: true, nullsLast: true })
//   if (tErr) throw new Error(tErr.message)

//   const teams = (tms ?? []).filter(Boolean)
//   if (teams.length < 2) throw new Error("Au moins 2 équipes requises")

//   // 2) taille tableau (puissance de 2)
//   const sizes = [2, 4, 8, 16, 32]
//   const size = sizes.find(s => s >= teams.length) ?? teams.length
//   const initialType = roundLabel(size)

//   // 3) supprime anciens matchs d’élimination
//   await supabase.from("matches")
//     .delete()
//     .eq("tournament_id", tournamentId)
//     .in("match_type", ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"])

//   // 4) byes = meilleures seeds
//   const byes = size - teams.length
//   const withBye = teams.slice(0, byes)
//   const playIn = teams.slice(byes)

//   // paires 1er tour (haut vs bas parmi ceux qui jouent)
//   const rows: any[] = []
//   let i = 0, j = playIn.length - 1
//   while (i < j) {
//     rows.push({
//       tournament_id: tournamentId,
//       match_type: initialType,
//       round_number: 1,
//       status: "scheduled",
//       team1_id: playIn[i].id,
//       team2_id: playIn[j].id,
//       player1_id: null, player2_id: null,
//       winner_team_id: null, winner_id: null,
//     })
//     i++; j--
//   }

//   if (rows.length) {
//     const { error: insErr } = await supabase.from("matches").insert(rows)
//     if (insErr) throw new Error(insErr.message)
//   }

//   // note: les équipes en bye entreront au tour suivant via l’avancement auto.
//   // on les mémorise dans une table dédiée ? simple: rien, on les rajoutera au moment
//   // d’assembler les demis/quarters via logique d’appairage.

//   revalidatePath(`/dashboard/tournaments/${tournamentId}`)
//   return { success: true }
// }

// export async function startTournament(tournamentId: string) {
//   const supabase = await createSupabaseClient()
//   const { error } = await supabase.from("tournaments")
//     .update({ status: "in_progress" })
//     .eq("id", tournamentId)
//   if (error) throw new Error(error.message)
//   revalidatePath(`/dashboard/tournaments/${tournamentId}`)
//   return { success: true }
// }

// // ──────────────────────────────────────────────────────────────────────────────
// // SCORE & AVANCEMENT (compatible EnterScoreDialog: sets + abandon)
// // ──────────────────────────────────────────────────────────────────────────────
// function isValidSet(a: number, b: number) {
//   // 6-0..4
//   if ((a === 6 && b <= 4) || (b === 6 && a <= 4)) return true
//   // 7-5
//   if ((a === 7 && b === 5) || (b === 7 && a === 5)) return true
//   // 7-6 (tie-break)
//   if ((a === 7 && b === 6) || (b === 7 && a === 6)) return true
//   return false
// }
// function winnerBySets(sets: Array<{ t1: number; t2: number }>) {
//   let w1 = 0, w2 = 0
//   for (const s of sets) {
//     if (!isValidSet(s.t1, s.t2)) return null
//     if (s.t1 > s.t2) w1++; else w2++;
//   }
//   if (w1 === w2) return null
//   return w1 > w2 ? { wTeam: 1, s1: w1, s2: w2 } : { wTeam: 2, s1: w1, s2: w2 }
// }
// function nextRoundOf(type: string): string | null {
//   switch (type) {
//     case "round_of_32": return "round_of_16"
//     case "round_of_16": return "quarter_final"
//     case "quarter_final": return "semi_final"
//     case "semi_final": return "final"
//     default: return null
//   }
// }

// export async function updateMatchScore(prev: any, formData: FormData) {
//   const matchId = String(formData.get("matchId") ?? "")
//   const tournamentId = String(formData.get("tournamentId") ?? "")
//   const setScoresRaw = String(formData.get("setScores") ?? "[]")
//   const retiredTeamId = formData.get("retiredTeamId")
//     ? String(formData.get("retiredTeamId"))
//     : null

//   if (!matchId || !tournamentId) return { error: "Paramètres manquants" }

//   const supabase = await createSupabaseClient()

//   // match courant
//   const { data: m, error: mErr } = await supabase
//     .from("matches")
//     .select("id, match_type, team1_id, team2_id, created_at")
//     .eq("id", matchId)
//     .single()
//   if (mErr || !m) return { error: mErr?.message || "Match introuvable" }

//   // calcule le vainqueur
//   let winnerTeamId: string | null = null
//   let s1 = 0, s2 = 0
//   let setsJson: any = null

//   try {
//     const parsed = JSON.parse(setScoresRaw) as Array<{ t1: number; t2: number }>
//     const cleaned = (parsed || []).filter(s => Number.isFinite(s.t1) && Number.isFinite(s.t2))
//     setsJson = cleaned

//     if (retiredTeamId) {
//       // abandon : l’autre gagne 2–0
//       if (m.team1_id && retiredTeamId === m.team1_id) {
//         winnerTeamId = m.team2_id
//         s1 = 0; s2 = 2
//       } else {
//         winnerTeamId = m.team1_id
//         s1 = 2; s2 = 0
//       }
//     } else {
//       const w = winnerBySets(cleaned)
//       if (!w) return { error: "Sets invalides ou vainqueur indéterminé" }
//       winnerTeamId = w.wTeam === 1 ? m.team1_id : m.team2_id
//       s1 = w.s1
//       s2 = w.s2
//     }
//   } catch {
//     return { error: "Format de sets invalide" }
//   }

//   // update (on tente set_scores si la colonne existe, sinon on ignore)
//   const payload: any = {
//     player1_score: s1,
//     player2_score: s2,
//     winner_team_id: winnerTeamId,
//     winner_id: null,
//     status: "completed",
//     completed_at: new Date().toISOString(),
//   }

//   let upErr = null
//   {
//     const { error } = await supabase.from("matches").update({ ...payload, set_scores: setsJson }).eq("id", matchId)
//     upErr = error
//   }
//   if (upErr) {
//     const { error } = await supabase.from("matches").update(payload).eq("id", matchId)
//     if (error) return { error: error.message }
//   }

//   // avancement auto (crée le match du tour suivant quand le pair-mate est fini)
//   await checkAndAdvanceTeams(tournamentId, matchId)

//   // finale => clôture + classement
//   if (m.match_type === "final") {
//     try {
//       await supabase.from("tournaments").update({ status: "completed" }).eq("id", tournamentId)
//       await calculateFinalRankings(tournamentId)
//     } catch (e) {
//       console.error("Erreur auto-completion tournoi:", e)
//     }
//   }

//   revalidatePath(`/dashboard/tournaments/${tournamentId}`)
//   return { success: "Score enregistré" }
// }

// async function checkAndAdvanceTeams(tournamentId: string, matchId: string) {
//   const supabase = await createSupabaseClient()

//   const { data: m } = await supabase
//     .from("matches")
//     .select("id, match_type, winner_team_id, created_at")
//     .eq("id", matchId)
//     .single()
//   if (!m) return

//   const nextType = nextRoundOf(m.match_type)
//   if (!nextType) return

//   const { data: sameRound } = await supabase
//     .from("matches")
//     .select("id, winner_team_id, created_at")
//     .eq("tournament_id", tournamentId)
//     .eq("match_type", m.match_type)
//     .order("created_at", { ascending: true })

//   if (!sameRound?.length) return
//   const idx = sameRound.findIndex(x => x.id === m.id)
//   if (idx < 0) return

//   const mateIdx = idx % 2 === 0 ? idx + 1 : idx - 1
//   const mate = sameRound[mateIdx]
//   if (!mate) return

//   // attendre que les 2 soient terminés
//   if (!m.winner_team_id || !mate.winner_team_id) return

//   // évite doublon
//   const { data: existingNext } = await supabase
//     .from("matches")
//     .select("id")
//     .eq("tournament_id", tournamentId)
//     .eq("match_type", nextType)
//     .in("team1_id", [m.winner_team_id, mate.winner_team_id])
//     .in("team2_id", [m.winner_team_id, mate.winner_team_id])

//   if (existingNext && existingNext.length) return

//   const { error: insErr } = await supabase.from("matches").insert({
//     tournament_id: tournamentId,
//     match_type: nextType,
//     round_number: 1,
//     status: "scheduled",
//     team1_id: m.winner_team_id,
//     team2_id: mate.winner_team_id,
//     player1_id: null,
//     player2_id: null,
//   })
//   if (insErr) throw new Error(insErr.message)
// }

// // ──────────────────────────────────────────────────────────────────────────────
// // EQUIPES utilitaires
// // ──────────────────────────────────────────────────────────────────────────────
// export async function addTeam(
//   tournamentId: string,
//   teamData: {
//     name: string
//     players: Array<{ firstName: string; lastName: string; nationalRanking: number | null }>
//     pairWeight: number | null
//   },
// ) {
//   const supabase = await createSupabaseClient()

//   const { data: tournament } = await supabase
//     .from("tournaments")
//     .select("max_players")
//     .eq("id", tournamentId)
//     .single()

//   const { count: currentTeams } = await supabase
//     .from("teams")
//     .select("*", { count: "exact", head: true })
//     .eq("tournament_id", tournamentId)

//   const maxTeams = tournament ? Math.floor(tournament.max_players / 2) : 16
//   if ((currentTeams ?? 0) >= maxTeams) {
//     throw new Error("Le tournoi a atteint sa capacité maximale d'équipes")
//   }
//   if (teamData.players.length !== 2) {
//     throw new Error("Une équipe doit avoir exactement 2 joueurs")
//   }

//   const { data: team, error: teamErr } = await supabase
//     .from("teams")
//     .insert({
//       tournament_id: tournamentId,
//       name: teamData.name,
//       pair_weight: teamData.pairWeight,
//     })
//     .select()
//     .single()
//   if (teamErr) throw new Error(teamErr.message)

//   const { error: playersErr } = await supabase.from("players").insert(
//     teamData.players.map(p => ({
//       first_name: p.firstName,
//       last_name: p.lastName,
//       national_ranking: p.nationalRanking,
//       tournament_id: tournamentId,
//       team_id: team.id,
//     })),
//   )
//   if (playersErr) {
//     await supabase.from("teams").delete().eq("id", team.id)
//     throw new Error(playersErr.message)
//   }

//   return { success: true, teamId: team.id }
// }

// export async function deleteTeam(teamId: string) {
//   const supabase = await createSupabaseClient()
//   const { error } = await supabase.from("teams").delete().eq("id", teamId)
//   if (error) throw new Error(error.message)
//   revalidatePath("/dashboard/tournaments/[id]", "page")
// }






// lib/tournament-actions.ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { calculateFinalRankings } from "./ranking-actions"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

// ──────────────────────────────────────────────────────────────────────────────
// SUPABASE (server only)
// ──────────────────────────────────────────────────────────────────────────────
export async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            /* OK en RSC */
          }
        },
      },
    },
  )
}

// ──────────────────────────────────────────────────────────────────────────────
/** TOURNOI / EQUIPES (création, seeding, etc.) */
// ──────────────────────────────────────────────────────────────────────────────
export async function createTournament(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const name = String(formData.get("name") ?? "").trim()
  const judgeId = String(formData.get("judgeId") ?? "").trim()
  const startDate = String(formData.get("startDate") ?? "").trim()
  const endDate = formData.get("endDate") ? String(formData.get("endDate")) : null

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

  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  redirect(`/dashboard/tournaments/${data.id}`)
}

export async function addPlayer(prevState: any, formData: FormData) {
  if (!formData) return { error: "Données du formulaire manquantes" }

  const firstName = formData.get("firstName")
  const lastName = formData.get("lastName")
  const nationalRanking = formData.get("nationalRanking")
  const tournamentId = formData.get("tournamentId")

  if (!firstName || !lastName || !tournamentId)
    return { error: "Prénom, nom et tournoi requis" }

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

    if (error) return { error: error.message }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`)
    return { success: "Joueur ajouté avec succès" }
  } catch (error) {
    console.error("Erreur ajout joueur:", error)
    return { error: "Une erreur inattendue s'est produite. Veuillez réessayer." }
  }
}

export async function deletePlayer(playerId: string) {
  const supabase = await createSupabaseClient()
  const { error } = await supabase.from("players").delete().eq("id", playerId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/tournaments/[id]", "page")
}

export async function calculateTeamSeeding(tournamentId: string) {
  const supabase = await createSupabaseClient()
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
}

// ──────────────────────────────────────────────────────────────────────────────
/** GENERATION D'UN TABLEAU A ELIMINATION DIRECTE (équipes uniquement) */
// ──────────────────────────────────────────────────────────────────────────────
function roundLabel(
  size: number,
): "final" | "semi_final" | "quarter_final" | "round_of_16" | "round_of_32" {
  if (size <= 2) return "final"
  if (size === 4) return "semi_final"
  if (size === 8) return "quarter_final"
  if (size === 16) return "round_of_16"
  return "round_of_32"
}

export async function generateKnockoutBracket(tournamentId: string) {
  const supabase = await createSupabaseClient()

  // 1) Équipes triées par seed (puis poids si égalité)
  const { data: tms, error: tErr } = await supabase
    .from("teams")
    .select("id, seed_position, pair_weight")
    .eq("tournament_id", tournamentId)
    .order("seed_position", { ascending: true, nullsLast: true })
    .order("pair_weight", { ascending: true, nullsLast: true })

  if (tErr) throw new Error(tErr.message)

  const teams = (tms ?? []).filter(Boolean)
  if (teams.length < 2) throw new Error("Au moins 2 équipes requises")

  // 2) Taille du tableau (puissance de 2)
  const sizes = [2, 4, 8, 16, 32]
  const size = sizes.find((s) => s >= teams.length) ?? teams.length
  const initialType = roundLabel(size)

  // 3) Purge des anciens matches d’élimination
  await supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId)
    .in("match_type", [
      "round_of_32",
      "round_of_16",
      "quarter_final",
      "semi_final",
      "final",
    ])

  // 4) Gestion des byes — les meilleures seeds passent le premier tour
  const byes = size - teams.length
  const byesTeams = teams.slice(0, byes)
  const playIn = teams.slice(byes)

  // Paires du 1er tour parmi les "playIn" (haut vs bas)
  const rows: any[] = []
  let i = 0,
    j = playIn.length - 1
  while (i < j) {
    rows.push({
      tournament_id: tournamentId,
      match_type: initialType,
      round_number: 1,
      status: "scheduled",
      team1_id: playIn[i].id,
      team2_id: playIn[j].id,
      player1_id: null,
      player2_id: null,
      winner_team_id: null,
      winner_id: null,
    })
    i++
    j--
  }

  if (rows.length) {
    const { error: insErr } = await supabase.from("matches").insert(rows)
    if (insErr) throw new Error(insErr.message)
  }

  // (Option simple) On ne pré-crée pas les matches avec BYE.
  // Les meilleures têtes de série entreront au tour suivant via l’avancement auto,
  // quand les matches "playIn" auront rendu un vainqueur.

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  return { success: true }
}

export async function startTournament(tournamentId: string) {
  const supabase = await createSupabaseClient()
  const { error } = await supabase
    .from("tournaments")
    .update({ status: "in_progress" })
    .eq("id", tournamentId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
/** SCORE & AVANCEMENT (sets + abandon) */
// ──────────────────────────────────────────────────────────────────────────────
function isValidSet(a: number, b: number) {
  // 6-0..4
  if ((a === 6 && b <= 4) || (b === 6 && a <= 4)) return true
  // 7-5
  if ((a === 7 && b === 5) || (b === 7 && a === 5)) return true
  // 7-6
  if ((a === 7 && b === 6) || (b === 7 && a === 6)) return true
  return false
}

function winnerBySets(sets: Array<{ t1: number; t2: number }>) {
  let w1 = 0,
    w2 = 0
  for (const s of sets) {
    if (!isValidSet(s.t1, s.t2)) return null
    if (s.t1 > s.t2) w1++
    else w2++
  }
  if (w1 === w2) return null
  return w1 > w2 ? { wTeam: 1, s1: w1, s2: w2 } : { wTeam: 2, s1: w1, s2: w2 }
}

function nextRoundOf(type: string): string | null {
  switch (type) {
    case "round_of_32":
      return "round_of_16"
    case "round_of_16":
      return "quarter_final"
    case "quarter_final":
      return "semi_final"
    case "semi_final":
      return "final"
    default:
      return null
  }
}

export async function updateMatchScore(prev: any, formData: FormData) {
  const matchId = String(formData.get("matchId") ?? "")
  const tournamentId = String(formData.get("tournamentId") ?? "")
  const setScoresRaw = String(formData.get("setScores") ?? "[]")
  const retiredTeamId = formData.get("retiredTeamId")
    ? String(formData.get("retiredTeamId"))
    : null

  if (!matchId || !tournamentId) return { error: "Paramètres manquants" }

  const supabase = await createSupabaseClient()

  // match courant
  const { data: m, error: mErr } = await supabase
    .from("matches")
    .select("id, match_type, team1_id, team2_id, created_at")
    .eq("id", matchId)
    .single()
  if (mErr || !m) return { error: mErr?.message || "Match introuvable" }

  // calcule le vainqueur
  let winnerTeamId: string | null = null
  let s1 = 0,
    s2 = 0
  let setsJson: any = null

  try {
    const parsed = JSON.parse(setScoresRaw) as Array<{ t1: number; t2: number }>
    const cleaned = (parsed || []).filter(
      (s) => Number.isFinite(s.t1) && Number.isFinite(s.t2),
    )
    setsJson = cleaned

    if (retiredTeamId) {
      // abandon : l’autre gagne 2–0
      if (m.team1_id && retiredTeamId === m.team1_id) {
        winnerTeamId = m.team2_id
        s1 = 0
        s2 = 2
      } else {
        winnerTeamId = m.team1_id
        s1 = 2
        s2 = 0
      }
    } else {
      const w = winnerBySets(cleaned)
      if (!w) return { error: "Sets invalides ou vainqueur indéterminé" }
      winnerTeamId = w.wTeam === 1 ? m.team1_id : m.team2_id
      s1 = w.s1
      s2 = w.s2
    }
  } catch {
    return { error: "Format de sets invalide" }
  }

  // update (on tente set_scores si la colonne existe, sinon on ignore)
  const payload: any = {
    player1_score: s1,
    player2_score: s2,
    winner_team_id: winnerTeamId,
    winner_id: null,
    status: "completed",
    completed_at: new Date().toISOString(),
  }

  let upErr = null
  {
    const { error } = await supabase
      .from("matches")
      .update({ ...payload, set_scores: setsJson })
      .eq("id", matchId)
    upErr = error
  }
  if (upErr) {
    const { error } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", matchId)
    if (error) return { error: error.message }
  }

  // avancement auto (crée le match du tour suivant quand le pair-mate est fini)
  await checkAndAdvanceTeams(tournamentId, matchId)

  // finale => clôture + classement
  if (m.match_type === "final") {
    try {
      await supabase
        .from("tournaments")
        .update({ status: "completed" })
        .eq("id", tournamentId)
      await calculateFinalRankings(tournamentId)
    } catch (e) {
      console.error("Erreur auto-completion tournoi:", e)
    }
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  return { success: "Score enregistré" }
}

async function checkAndAdvanceTeams(tournamentId: string, matchId: string) {
  const supabase = await createSupabaseClient()

  const { data: m } = await supabase
    .from("matches")
    .select("id, match_type, winner_team_id, created_at")
    .eq("id", matchId)
    .single()
  if (!m) return

  const nextType = nextRoundOf(m.match_type)
  if (!nextType) return

  const { data: sameRound } = await supabase
    .from("matches")
    .select("id, winner_team_id, created_at")
    .eq("tournament_id", tournamentId)
    .eq("match_type", m.match_type)
    .order("created_at", { ascending: true })

  if (!sameRound?.length) return
  const idx = sameRound.findIndex((x) => x.id === m.id)
  if (idx < 0) return

  const mateIdx = idx % 2 === 0 ? idx + 1 : idx - 1
  const mate = sameRound[mateIdx]
  if (!mate) return

  // attendre que les 2 soient terminés
  if (!m.winner_team_id || !mate.winner_team_id) return

  // évite doublon
  const { data: existingNext } = await supabase
    .from("matches")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("match_type", nextType)
    .in("team1_id", [m.winner_team_id, mate.winner_team_id])
    .in("team2_id", [m.winner_team_id, mate.winner_team_id])

  if (existingNext && existingNext.length) return

  const { error: insErr } = await supabase.from("matches").insert({
    tournament_id: tournamentId,
    match_type: nextType,
    round_number: 1,
    status: "scheduled",
    team1_id: m.winner_team_id,
    team2_id: mate.winner_team_id,
    player1_id: null,
    player2_id: null,
  })
  if (insErr) throw new Error(insErr.message)
}

// ──────────────────────────────────────────────────────────────────────────────
/** EQUIPES utilitaires */
// ──────────────────────────────────────────────────────────────────────────────
export async function addTeam(
  tournamentId: string,
  teamData: {
    name: string
    players: Array<{ firstName: string; lastName: string; nationalRanking: number | null }>
    pairWeight: number | null
  },
) {
  const supabase = await createSupabaseClient()

  // 1) validations basiques
  const players = (teamData.players ?? []).map((p) => ({
    firstName: (p.firstName || "").trim(),
    lastName: (p.lastName || "").trim(),
    nationalRanking:
      typeof p.nationalRanking === "number" && p.nationalRanking > 0 ? p.nationalRanking : null,
  }))
  if (players.length !== 2 || players.some((p) => !p.firstName || !p.lastName)) {
    throw new Error("Une équipe doit avoir exactement 2 joueurs avec prénom et nom.")
  }

  // 2) capacité (max_players = nb joueurs, donc maxTeams = /2)
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
    throw new Error("Le tournoi a atteint sa capacité maximale d'équipes.")
  }

  // 3) nom d’équipe (fallback "Nom1/Nom2")
  const fallbackName = `${players[0].lastName || players[0].firstName}/${players[1].lastName || players[1].firstName}`
  const teamName = (teamData.name || "").trim() || fallbackName

  // 4) pair weight (fallback moyenne si non fourni)
  const rankings = players.map((p) => p.nationalRanking).filter((n): n is number => n != null)
  const computedPairWeight = rankings.length === 2 ? (rankings[0] + rankings[1]) / 2 : null
  const pairWeight = teamData.pairWeight ?? computedPairWeight

  // 4bis) (optionnel) check d’unicité côté app
  const { data: existingByName } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .ilike("name", teamName) // insensible à la casse
    .limit(1)

  if (existingByName && existingByName.length > 0) {
    throw new Error("Une équipe avec ce nom existe déjà dans ce tournoi.")
  }

  // 5) insertion équipe
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .insert({
      tournament_id: tournamentId,
      name: teamName,
      pair_weight: pairWeight,
    })
    .select()
    .single()

  if (teamErr) {
    // gère notamment la contrainte UNIQUE côté DB si tu la mets en place
    if (/duplicate key/i.test(teamErr.message)) {
      throw new Error("Ce nom d'équipe est déjà utilisé dans ce tournoi.")
    }
    throw new Error(teamErr.message)
  }

  // 6) insertion joueurs liés à l’équipe
  const { error: playersErr } = await supabase.from("players").insert(
    players.map((p) => ({
      first_name: p.firstName,
      last_name: p.lastName,
      national_ranking: p.nationalRanking,
      tournament_id: tournamentId,
      team_id: team.id,
    })),
  )

  if (playersErr) {
    // rollback minimal
    await supabase.from("teams").delete().eq("id", team.id)
    throw new Error(playersErr.message)
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}`)
  return { success: true, teamId: team.id }
}


export async function deleteTeam(teamId: string) {
  const supabase = await createSupabaseClient()
  const { error } = await supabase.from("teams").delete().eq("id", teamId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/tournaments/[id]", "page")
}
