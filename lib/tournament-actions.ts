// lib/tournament-actions.ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { calculateFinalRankings } from "./ranking-actions"
import { createSlug } from "@/lib/utils/slug"

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

// Helper function to get tournament slug from ID for revalidation
async function getTournamentSlug(tournamentId: string): Promise<string | null> {
  try {
    const supabase = await createSupabaseClient()
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("name")
      .eq("id", tournamentId)
      .single()

    return tournament ? createSlug(tournament.name) : null
  } catch (error) {
    console.error("Error getting tournament slug:", error)
    return null
  }
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
  const category = String(formData.get("category") ?? "mixte").trim()

  const maxTeams = Number(formData.get("maxTeams") ?? 16)
  const max_players = maxTeams * 2

  if (!name || !judgeId || !startDate) {
    return { error: "Veuillez remplir tous les champs obligatoires (nom, date de début)." }
  }

  // Vérifier l'unicité du nom (insensible à la casse)
  const { data: existingTournament } = await supabase
    .from("tournaments")
    .select("id")
    .ilike("name", name)
    .limit(1)

  if (existingTournament && existingTournament.length > 0) {
    return { error: "Un tournoi avec ce nom existe déjà. Veuillez choisir un autre nom." }
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
      category,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Erreur création tournoi:", error)
    return { error: "Erreur lors de la création du tournoi. Veuillez réessayer." }
  }

  revalidatePath("/dashboard")
  return { success: true, tournamentId: data.id, tournamentSlug: createSlug(name) }
}

export async function addPlayer(prevState: any, formData: FormData) {
  if (!formData) return { error: "Erreur de formulaire. Veuillez réessayer." }

  const firstName = formData.get("firstName")
  const lastName = formData.get("lastName")
  const nationalRanking = formData.get("nationalRanking")
  const tournamentId = formData.get("tournamentId")

  if (!firstName || !lastName || !tournamentId)
    return { error: "Veuillez saisir le prénom et le nom du joueur." }

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
      return { error: "Le tournoi est complet. Impossible d'ajouter plus de joueurs." }
    }

    const { error } = await supabase.from("players").insert({
      first_name: String(firstName),
      last_name: String(lastName),
      national_ranking: nationalRanking ? Number.parseInt(String(nationalRanking)) : null,
      tournament_id: String(tournamentId),
    })

    if (error) {
      console.error("Erreur ajout joueur:", error)
      if (error.message.includes("duplicate")) {
        return { error: "Ce joueur est déjà inscrit au tournoi." }
      }
      return { error: "Erreur lors de l'ajout du joueur. Veuillez réessayer." }
    }

    revalidatePath("/dashboard/tournaments/[id]", "page")
    return { success: "Joueur ajouté avec succès !" }
  } catch (error) {
    console.error("Erreur ajout joueur:", error)
    return { error: "Erreur lors de l'ajout du joueur. Veuillez vérifier votre connexion et réessayer." }
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
  revalidatePath("/dashboard/tournaments/[id]", "page")
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

  // 1) Équipes triées par seed (puis poids si égalité) - FILTRER TBD
  const { data: tms, error: tErr } = await supabase
    .from("teams")
    .select("id, seed_position, pair_weight, name")
    .eq("tournament_id", tournamentId)
    .order("seed_position", { ascending: true, nullsLast: true })
    .order("pair_weight", { ascending: true, nullsLast: true })

  if (tErr) throw new Error(tErr.message)

  // FILTRER TBD - ne compter que les vraies équipes
  const teams = (tms ?? []).filter(team => team.name !== 'TBD')
  if (teams.length < 2) throw new Error("Au moins 2 équipes requises")

  console.log(`🎯 ${teams.length} vraies équipes (TBD exclu)`)

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

  // Créer équipe TBD pour placeholders
  const { data: existingTBD } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('name', 'TBD')
    .single()

  let tbdTeam = existingTBD
  if (!tbdTeam) {
    const { data: newTBD, error } = await supabase
      .from('teams')
      .insert({
        tournament_id: tournamentId,
        name: 'TBD',
        pair_weight: 0,
        seed_position: null
      })
      .select()
      .single()
    if (error) throw error
    tbdTeam = newTBD
  }

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

  // Créer TOUS les matches du round suivant (quarts)
  const nextType = nextRoundOf(initialType)
  if (nextType) {
    const nextRoundMatches: any[] = []
    const numNextMatches = size / 4 // Nombre de quarts pour un bracket de taille size

    console.log(`🎯 Création ${numNextMatches} quarts: ${byesTeams.length} BYE + ${numNextMatches - byesTeams.length} slots TBD`)

    // Créer tous les quarts
    for (let k = 0; k < numNextMatches; k++) {
      const byeTeam = byesTeams[k] || null
      nextRoundMatches.push({
        tournament_id: tournamentId,
        match_type: nextType,
        round_number: 1,
        status: "scheduled",
        team1_id: byeTeam?.id || tbdTeam.id,
        team2_id: tbdTeam.id,
        player1_id: null,
        player2_id: null,
        winner_team_id: null,
        winner_id: null,
      })
    }

    if (nextRoundMatches.length) {
      const { error: nextInsErr } = await supabase.from("matches").insert(nextRoundMatches)
      if (nextInsErr) throw new Error(nextInsErr.message)
    }
  }

  console.log(`✅ Bracket créé: ${rows.length} matches 1er tour, ${byes} BYE automatiques`)

  revalidatePath("/dashboard/tournaments/[id]", "page")
  return { success: true }
}

export async function startTournament(tournamentId: string) {
  const supabase = await createSupabaseClient()
  const { error } = await supabase
    .from("tournaments")
    .update({ status: "in_progress" })
    .eq("id", tournamentId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/tournaments/[id]", "page")
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

  if (!matchId || !tournamentId) return { error: "Informations du match manquantes." }

  const supabase = await createSupabaseClient()

  // match courant
  const { data: m, error: mErr } = await supabase
    .from("matches")
    .select("id, match_type, team1_id, team2_id, created_at")
    .eq("id", matchId)
    .single()
  if (mErr || !m) return { error: "Match introuvable. Veuillez vérifier les informations." }

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
    retired_team_id: retiredTeamId,
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
    if (error) {
      console.error("Erreur mise à jour score:", error)
      return { error: "Erreur lors de l'enregistrement du score. Veuillez réessayer." }
    }
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

  revalidatePath("/dashboard/tournaments/[id]", "page")
  return { success: "Score enregistré" }
}

async function checkAndAdvanceTeams(tournamentId: string, matchId: string) {
  const supabase = await createSupabaseClient()

  console.log(`🚀🚀🚀 DÉBUT checkAndAdvanceTeams: tournamentId=${tournamentId}, matchId=${matchId}`)

  // Protection contre les doubles appels
  const cacheKey = `advancement_${matchId}`
  if (global[cacheKey]) {
    console.log(`⚠️ PROTECTION: Avancement déjà en cours pour ce match, arrêt`)
    return
  }
  global[cacheKey] = true
  console.log(`🔒 CACHE: Protection activée pour match ${matchId.slice(0,8)}`)

  // Nettoyer le cache après 10 secondes
  setTimeout(() => {
    console.log(`🧹 CACHE: Nettoyage protection pour match ${matchId.slice(0,8)}`)
    delete global[cacheKey]
  }, 10000)

  const { data: m } = await supabase
    .from("matches")
    .select("id, match_type, winner_team_id, created_at, team1_id, team2_id")
    .eq("id", matchId)
    .single()

  console.log(`📊 Match récupéré:`, {
    id: m?.id?.slice(0,8),
    type: m?.match_type,
    winner: m?.winner_team_id?.slice(0,8),
    team1: m?.team1_id?.slice(0,8),
    team2: m?.team2_id?.slice(0,8)
  })

  if (!m || !m.winner_team_id) {
    console.log(`❌ Arrêt: pas de match ou pas de winner`)
    return
  }

  const nextType = nextRoundOf(m.match_type)
  console.log(`🎯 Next round type: ${nextType}`)
  if (!nextType) {
    console.log(`❌ Arrêt: pas de next round pour ${m.match_type}`)
    return
  }

  const { data: sameRound } = await supabase
    .from("matches")
    .select("id, winner_team_id, created_at, team1_id, team2_id")
    .eq("tournament_id", tournamentId)
    .eq("match_type", m.match_type)
    .order("created_at", { ascending: true })

  console.log(`📋 Matches du même round (${m.match_type}): ${sameRound?.length}`)
  sameRound?.forEach((sr, i) => {
    const hasWinner = sr.winner_team_id ? '✅' : '❌'
    const isCurrentMatch = sr.id === m.id ? ' ← CURRENT' : ''
    console.log(`  ${i}. ${sr.id.slice(0,8)} ${hasWinner}${isCurrentMatch}`)
  })

  if (!sameRound?.length) {
    console.log(`❌ Arrêt: aucun match dans le même round`)
    return
  }
  const idx = sameRound.findIndex((x) => x.id === m.id)
  console.log(`📍 Index du match actuel: ${idx}`)
  if (idx < 0) {
    console.log(`❌ Arrêt: match pas trouvé dans la liste`)
    return
  }

  const mateIdx = idx % 2 === 0 ? idx + 1 : idx - 1
  const mate = sameRound[mateIdx]
  console.log(`👥 Mate index: ${mateIdx}, mate exists: ${!!mate}`)
  if (mate) {
    console.log(`   Mate ID: ${mate.id.slice(0,8)}, has winner: ${!!mate.winner_team_id}`)
  }

  // Si c'est un BYE match ou pas de mate, chercher un slot libre existant
  if (!mate || m.team1_id === m.team2_id) {
    console.log(`🚀 Avancement immédiat: pas de mate OU BYE match`)

    // Chercher un match du round suivant avec un slot TBD libre
    const { data: tbdTeams, error: tbdError } = await supabase
      .from("teams")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("name", "TBD")

    console.log(`🔍 TBD query: error=${!!tbdError}, teams found=${tbdTeams?.length}`)
    const tbdTeamId = tbdTeams?.[0]?.id
    console.log(`🔍 TBD ID: ${tbdTeamId?.slice(0,8)}`)

    if (tbdTeamId) {
      const { data: freeSlots, error: slotsError } = await supabase
        .from("matches")
        .select("id, team1_id, team2_id")
        .eq("tournament_id", tournamentId)
        .eq("match_type", nextType)
        .or(`team1_id.eq.${tbdTeamId},team2_id.eq.${tbdTeamId}`)
        .order("id", { ascending: true })

      console.log(`🔍 Free slots query: error=${!!slotsError}, slots found=${freeSlots?.length}`)
      freeSlots?.forEach((slot, i) => {
        const team1Info = slot.team1_id === tbdTeamId ? 'TBD' : slot.team1_id?.slice(0,8)
        const team2Info = slot.team2_id === tbdTeamId ? 'TBD' : slot.team2_id?.slice(0,8)
        console.log(`  ${i}. ${slot.id.slice(0,8)}: ${team1Info} vs ${team2Info}`)
      })

      // Vérifier d'abord si l'équipe est déjà placée quelque part dans les quarts
      const { data: existingPlacement } = await supabase
        .from("matches")
        .select("id, team1_id, team2_id")
        .eq("tournament_id", tournamentId)
        .eq("match_type", nextType)
        .or(`team1_id.eq.${m.winner_team_id},team2_id.eq.${m.winner_team_id}`)

      if (existingPlacement && existingPlacement.length > 0) {
        console.log(`⚠️ NORMAL: Équipe ${m.winner_team_id?.slice(0,8)} déjà placée dans les ${nextType}, arrêt`)
        console.log(`🔍 DÉTAIL PLACEMENT: Équipe trouvée dans ${existingPlacement.length} match(s):`)
        existingPlacement.forEach((match, i) => {
          console.log(`  ${i+1}. Match ${match.id.slice(0,8)}: ${match.team1_id?.slice(0,8)} vs ${match.team2_id?.slice(0,8)}`)
        })
        return
      }

      // Trouver le premier slot vraiment libre (pas déjà occupé par ce gagnant)
      const freeSlot = freeSlots?.find(slot =>
        (slot.team1_id === tbdTeamId || slot.team2_id === tbdTeamId) &&
        slot.team1_id !== m.winner_team_id && slot.team2_id !== m.winner_team_id
      )

      if (freeSlot) {
        const updateField = freeSlot.team1_id === tbdTeamId ? 'team1_id' : 'team2_id'
        console.log(`🎯 Slot libre trouvé: ${freeSlot.id.slice(0,8)} (field: ${updateField})`)
        console.log(`🎯 Gagnant à placer: ${m.winner_team_id?.slice(0,8)}`)

        console.log(`🔧 AVANT UPDATE: ${updateField} = ${m.winner_team_id?.slice(0,8)} dans match ${freeSlot.id.slice(0,8)}`)

        const { error: updateErr } = await supabase
          .from("matches")
          .update({ [updateField]: m.winner_team_id })
          .eq("id", freeSlot.id)

        if (updateErr) {
          console.error("❌ Erreur placement slot libre:", updateErr.message)
        } else {
          console.log(`✅ ${m.winner_team_id?.slice(0,8)} placé dans slot libre ${freeSlot.id.slice(0,8)}`)

          // Vérifier l'état après update
          const { data: verif } = await supabase
            .from("matches")
            .select("id, team1_id, team2_id")
            .eq("id", freeSlot.id)
            .single()

          console.log(`🔍 APRÈS UPDATE: match ${verif?.id?.slice(0,8)} = ${verif?.team1_id?.slice(0,8)} vs ${verif?.team2_id?.slice(0,8)}`)
        }
        return
      } else {
        console.log(`❌ Aucun slot libre trouvé`)
      }
    } else {
      console.log(`❌ TBD team non trouvé`)
    }

    // Pour les quarts de finale, on ne doit JAMAIS créer de nouveaux matches
    if (nextType === "quarter_final") {
      console.log(`❌ ERREUR BYE: Tentative de création d'un 5ème quart de finale. Équipe probablement déjà placée.`)
      return
    }

    // Si aucun slot libre pour autres rounds, créer un nouveau match
    const { error: insErr } = await supabase.from("matches").insert({
      tournament_id: tournamentId,
      match_type: nextType,
      round_number: 1,
      status: "scheduled",
      team1_id: m.winner_team_id,
      team2_id: tbdTeamId,
      player1_id: null,
      player2_id: null,
    })
    if (insErr) console.error("Erreur avancement BYE:", insErr.message)
    return
  }

  // attendre que les 2 soient terminés
  if (!mate.winner_team_id) {
    console.log(`⏳ En attente que le mate finisse - mais dans un bracket impair, avancer seul`)

    // Pour un nombre impair de matches (comme 5), avancer directement
    const totalMatches = sameRound?.length || 0
    if (totalMatches % 2 === 1) {
      console.log(`🚀 Nombre impair de matches (${totalMatches}), avancement direct du gagnant`)

      // PROTECTION: Vérifier d'abord si l'équipe est déjà placée quelque part dans les quarts
      const { data: existingPlacement } = await supabase
        .from("matches")
        .select("id, team1_id, team2_id")
        .eq("tournament_id", tournamentId)
        .eq("match_type", nextType)
        .or(`team1_id.eq.${m.winner_team_id},team2_id.eq.${m.winner_team_id}`)

      if (existingPlacement && existingPlacement.length > 0) {
        console.log(`⚠️ BRACKET IMPAIR: Équipe ${m.winner_team_id?.slice(0,8)} déjà placée dans les ${nextType}, arrêt`)
        console.log(`🔍 DÉTAIL PLACEMENT: Équipe trouvée dans ${existingPlacement.length} match(s):`)
        existingPlacement.forEach((match, i) => {
          console.log(`  ${i+1}. Match ${match.id.slice(0,8)}: ${match.team1_id?.slice(0,8)} vs ${match.team2_id?.slice(0,8)}`)
        })
        return
      }

      // Chercher slot libre comme pour BYE
      const { data: tbdTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("name", "TBD")

      const tbdTeamId = tbdTeams?.[0]?.id
      if (tbdTeamId) {
        const { data: freeSlots } = await supabase
          .from("matches")
          .select("id, team1_id, team2_id")
          .eq("tournament_id", tournamentId)
          .eq("match_type", nextType)
          .or(`team1_id.eq.${tbdTeamId},team2_id.eq.${tbdTeamId}`)
          .order("id", { ascending: true })

        console.log(`🔍 BRACKET IMPAIR: Recherche slot libre pour ${m.winner_team_id?.slice(0,8)}`)
        console.log(`🔍 Slots trouvés: ${freeSlots?.length}`)
        freeSlots?.forEach((slot, i) => {
          console.log(`  ${i+1}. ${slot.id.slice(0,8)}: ${slot.team1_id?.slice(0,8)} vs ${slot.team2_id?.slice(0,8)}`)
        })

        const freeSlot = freeSlots?.find(slot => {
          // Le slot doit avoir TBD dans au moins une position
          const hasTBD = slot.team1_id === tbdTeamId || slot.team2_id === tbdTeamId
          // Le slot ne doit pas déjà contenir le gagnant actuel
          const doesntHaveWinner = slot.team1_id !== m.winner_team_id && slot.team2_id !== m.winner_team_id
          // Le slot doit avoir exactement 1 TBD (pas 2 TBD)
          const hasExactlyOneTBD = (slot.team1_id === tbdTeamId) !== (slot.team2_id === tbdTeamId)

          console.log(`  🔍 Slot ${slot.id.slice(0,8)}: hasTBD=${hasTBD}, doesntHaveWinner=${doesntHaveWinner}, hasExactlyOneTBD=${hasExactlyOneTBD}`)

          return hasTBD && doesntHaveWinner && hasExactlyOneTBD
        })

        if (freeSlot) {
          const updateField = freeSlot.team1_id === tbdTeamId ? 'team1_id' : 'team2_id'
          console.log(`🎯 Placement direct dans slot libre: ${freeSlot.id.slice(0,8)}`)

          console.log(`🔧 AVANT UPDATE BRACKET IMPAIR: ${updateField} = ${m.winner_team_id?.slice(0,8)} dans match ${freeSlot.id.slice(0,8)}`)

          const { error: updateErr2 } = await supabase
            .from("matches")
            .update({ [updateField]: m.winner_team_id })
            .eq("id", freeSlot.id)

          if (updateErr2) {
            console.error("❌ Erreur placement bracket impair:", updateErr2.message)
          } else {
            console.log(`✅ Gagnant placé directement (bracket impair)`)

            // Vérifier l'état après update
            const { data: verif2 } = await supabase
              .from("matches")
              .select("id, team1_id, team2_id")
              .eq("id", freeSlot.id)
              .single()

            console.log(`🔍 APRÈS UPDATE BRACKET IMPAIR: match ${verif2?.id?.slice(0,8)} = ${verif2?.team1_id?.slice(0,8)} vs ${verif2?.team2_id?.slice(0,8)}`)
          }
          return
        }
      }
    }

    console.log(`⏳ Attente normale du mate`)
    return
  }

  console.log(`🎯 Avancement normal: 2 gagnants (${m.winner_team_id?.slice(0,8)} vs ${mate.winner_team_id?.slice(0,8)})`)

  // Vérifier s'il reste des slots libres plutôt que créer un nouveau match
  const { data: tbdTeams } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("name", "TBD")

  const tbdTeamId = tbdTeams?.[0]?.id
  if (tbdTeamId) {
    const { data: remainingSlots } = await supabase
      .from("matches")
      .select("id, team1_id, team2_id")
      .eq("tournament_id", tournamentId)
      .eq("match_type", nextType)
      .or(`team1_id.eq.${tbdTeamId},team2_id.eq.${tbdTeamId}`)
      .order("id", { ascending: true })

    console.log(`🔍 Slots libres restants: ${remainingSlots?.length}`)

    if (remainingSlots && remainingSlots.length >= 2) {
      // Vérifier si les gagnants sont déjà placés avant de les placer
      const { data: team1Already } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("match_type", nextType)
        .or(`team1_id.eq.${m.winner_team_id},team2_id.eq.${m.winner_team_id}`)

      const { data: team2Already } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("match_type", nextType)
        .or(`team1_id.eq.${mate.winner_team_id},team2_id.eq.${mate.winner_team_id}`)

      console.log(`🔍 SÉPARÉS: Team1 ${m.winner_team_id?.slice(0,8)} déjà placé: ${(team1Already?.length || 0) > 0}`)
      console.log(`🔍 SÉPARÉS: Team2 ${mate.winner_team_id?.slice(0,8)} déjà placé: ${(team2Already?.length || 0) > 0}`)

      if ((team1Already?.length || 0) > 0 && (team2Already?.length || 0) > 0) {
        console.log(`⚠️ SÉPARÉS: Les deux équipes sont déjà placées, arrêt`)
        return
      }

      // Placer les 2 gagnants dans les slots libres séparément
      console.log(`🎯 Placement dans slots libres séparés`)

      const slot1 = remainingSlots[0]
      const slot2 = remainingSlots[1]

      const updateField1 = slot1.team1_id === tbdTeamId ? 'team1_id' : 'team2_id'
      const updateField2 = slot2.team1_id === tbdTeamId ? 'team1_id' : 'team2_id'

      // Placer seulement les équipes qui ne sont pas déjà placées
      if ((team1Already?.length || 0) === 0) {
        console.log(`🎯 Placement Team1 ${m.winner_team_id?.slice(0,8)} dans ${slot1.id.slice(0,8)}`)
        await supabase.from("matches").update({ [updateField1]: m.winner_team_id }).eq("id", slot1.id)
      } else {
        console.log(`⚠️ Team1 ${m.winner_team_id?.slice(0,8)} déjà placé, skip`)
      }

      if ((team2Already?.length || 0) === 0) {
        console.log(`🎯 Placement Team2 ${mate.winner_team_id?.slice(0,8)} dans ${slot2.id.slice(0,8)}`)
        await supabase.from("matches").update({ [updateField2]: mate.winner_team_id }).eq("id", slot2.id)
      } else {
        console.log(`⚠️ Team2 ${mate.winner_team_id?.slice(0,8)} déjà placé, skip`)
      }

      console.log(`✅ Gagnants placés dans slots séparés (avec protection)`)
      return
    } else if (remainingSlots && remainingSlots.length === 1) {
      // Vérifier si les gagnants sont déjà placés avant de les placer
      const { data: team1Already } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("match_type", nextType)
        .or(`team1_id.eq.${m.winner_team_id},team2_id.eq.${m.winner_team_id}`)

      const { data: team2Already } = await supabase
        .from("matches")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("match_type", nextType)
        .or(`team1_id.eq.${mate.winner_team_id},team2_id.eq.${mate.winner_team_id}`)

      console.log(`🔍 SLOT UNIQUE: Team1 ${m.winner_team_id?.slice(0,8)} déjà placé: ${(team1Already?.length || 0) > 0}`)
      console.log(`🔍 SLOT UNIQUE: Team2 ${mate.winner_team_id?.slice(0,8)} déjà placé: ${(team2Already?.length || 0) > 0}`)

      if ((team1Already?.length || 0) > 0 && (team2Already?.length || 0) > 0) {
        console.log(`⚠️ SLOT UNIQUE: Les deux équipes sont déjà placées, arrêt`)
        return
      }

      // Un seul slot libre, créer match avec 1 gagnant vs l'autre
      console.log(`🎯 Un seul slot libre, création match`)

      const slot = remainingSlots[0]
      const updateField = slot.team1_id === tbdTeamId ? 'team1_id' : 'team2_id'
      const otherField = updateField === 'team1_id' ? 'team2_id' : 'team1_id'

      // Ne placer que les équipes qui ne sont pas déjà placées
      const updates: Record<string, string> = {}

      if ((team1Already?.length || 0) === 0) {
        updates[updateField] = m.winner_team_id
        console.log(`🎯 Ajout Team1 ${m.winner_team_id?.slice(0,8)} au slot unique`)
      } else {
        console.log(`⚠️ Team1 ${m.winner_team_id?.slice(0,8)} déjà placé, ne pas ajouter au slot unique`)
      }

      if ((team2Already?.length || 0) === 0) {
        updates[otherField] = mate.winner_team_id
        console.log(`🎯 Ajout Team2 ${mate.winner_team_id?.slice(0,8)} au slot unique`)
      } else {
        console.log(`⚠️ Team2 ${mate.winner_team_id?.slice(0,8)} déjà placé, ne pas ajouter au slot unique`)
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("matches").update(updates).eq("id", slot.id)
        console.log(`✅ Match créé dans slot libre avec ${Object.keys(updates).length} équipe(s)`)
      } else {
        console.log(`⚠️ Aucune équipe à placer dans le slot unique, toutes déjà placées`)
      }

      return
    }
  }

  // Pour les quarts de finale, on ne doit JAMAIS créer de nouveaux matches
  // car il doit y en avoir exactement 4
  if (nextType === "quarter_final") {
    console.log(`❌ ERREUR: Tentative de création d'un 5ème quart de finale. Les équipes sont probablement déjà placées.`)

    // Vérifier si les équipes sont déjà placées quelque part
    const { data: team1Placement } = await supabase
      .from("matches")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("match_type", nextType)
      .or(`team1_id.eq.${m.winner_team_id},team2_id.eq.${m.winner_team_id}`)

    const { data: team2Placement } = await supabase
      .from("matches")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("match_type", nextType)
      .or(`team1_id.eq.${mate.winner_team_id},team2_id.eq.${mate.winner_team_id}`)

    console.log(`🔍 Équipe 1 (${m.winner_team_id?.slice(0,8)}) déjà placée: ${team1Placement?.length > 0 ? 'OUI' : 'NON'}`)
    console.log(`🔍 Équipe 2 (${mate.winner_team_id?.slice(0,8)}) déjà placée: ${team2Placement?.length > 0 ? 'OUI' : 'NON'}`)

    return
  }

  // Fallback pour autres rounds : éviter doublon et créer nouveau match seulement si nécessaire
  const { data: existingNext } = await supabase
    .from("matches")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("match_type", nextType)
    .in("team1_id", [m.winner_team_id, mate.winner_team_id])
    .in("team2_id", [m.winner_team_id, mate.winner_team_id])

  if (existingNext && existingNext.length) {
    console.log(`❌ Match existe déjà, arrêt`)
    return
  }

  console.log(`🆕 Création nouveau match (aucun slot libre)`)
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
    return { success: false, error: "Une équipe doit avoir exactement 2 joueurs avec prénom et nom." }
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
    return { success: false, error: `Le tournoi a atteint sa capacité maximale de ${maxTeams} équipes.` }
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
    return { success: false, error: "Une équipe avec ce nom existe déjà dans ce tournoi." }
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
      return { success: false, error: "Ce nom d'équipe est déjà utilisé dans ce tournoi." }
    }
    return { success: false, error: teamErr.message }
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
    return { success: false, error: playersErr.message }
  }

  revalidatePath("/dashboard/tournaments/[id]", "page")
  return { success: true, teamId: team.id }
}


export async function deleteTeam(teamId: string) {
  const supabase = await createSupabaseClient()
  const { error } = await supabase.from("teams").delete().eq("id", teamId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/tournaments/[id]", "page")
}

export async function completeTournament(tournamentId: string) {
  const supabase = await createSupabaseClient()
  const { error } = await supabase
    .from("tournaments")
    .update({ status: "completed" })
    .eq("id", tournamentId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/tournaments/[id]", "page")
  return { success: true }
}

export async function resetTournament(tournamentId: string) {
  const supabase = await createSupabaseClient()

  // Supprimer tous les matches et classements
  await supabase.from("matches").delete().eq("tournament_id", tournamentId)
  await supabase.from("tournament_rankings").delete().eq("tournament_id", tournamentId)

  // Remettre le tournoi en brouillon
  const { error } = await supabase
    .from("tournaments")
    .update({ status: "draft" })
    .eq("id", tournamentId)

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/tournaments/[id]", "page")
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
/** TOURNOI: Modifier */
// ──────────────────────────────────────────────────────────────────────────────
export async function updateTournament(
  tournamentId: string,
  data: {
    name: string
    max_players: number
    start_date: string | null
    end_date: string | null
    category: string
  }
) {
  const supabase = await createSupabaseServerClient()

  // Vérifier que le tournoi existe et récupérer ses données actuelles
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status, name")
    .eq("id", tournamentId)
    .single()

  if (!tournament) {
    throw new Error("Tournoi introuvable")
  }

  // Préparer les champs à mettre à jour selon le statut du tournoi
  const updateData: any = {
    start_date: data.start_date,
    end_date: data.end_date,
  }

  // Si le tournoi est en brouillon, on peut tout modifier
  if (tournament.status === "draft") {
    // Vérifier l'unicité du nom seulement si le nom change
    if (data.name !== tournament.name) {
      const { data: existingTournament } = await supabase
        .from("tournaments")
        .select("id")
        .ilike("name", data.name)
        .neq("id", tournamentId) // Exclure le tournoi actuel
        .limit(1)

      if (existingTournament && existingTournament.length > 0) {
        throw new Error("Un tournoi avec ce nom existe déjà. Veuillez choisir un autre nom.")
      }
    }

    updateData.name = data.name
    updateData.max_players = data.max_players
    updateData.category = data.category
  }

  // Mettre à jour le tournoi
  const { error } = await supabase
    .from("tournaments")
    .update(updateData)
    .eq("id", tournamentId)

  if (error) throw new Error(error.message)

  revalidatePath("/dashboard/tournaments/[id]", "page")
  revalidatePath("/dashboard/tournaments/[id]/edit", "page")
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
/** TOURNOI: Supprimer toutes les équipes */
// ──────────────────────────────────────────────────────────────────────────────
export async function removeAllTeams(tournamentId: string) {
  const supabase = await createSupabaseServerClient()

  // Vérifier que le tournoi est en brouillon
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .single()

  if (!tournament) {
    throw new Error("Tournoi introuvable")
  }

  if (tournament.status !== "draft") {
    throw new Error("Impossible de supprimer les équipes d'un tournoi déjà démarré")
  }

  // Supprimer tous les joueurs du tournoi
  const { error: playersError } = await supabase
    .from("players")
    .delete()
    .eq("tournament_id", tournamentId)

  if (playersError) {
    throw new Error("Erreur lors de la suppression des joueurs: " + playersError.message)
  }

  // Supprimer toutes les équipes du tournoi
  const { error: teamsError } = await supabase
    .from("teams")
    .delete()
    .eq("tournament_id", tournamentId)

  if (teamsError) {
    throw new Error("Erreur lors de la suppression des équipes: " + teamsError.message)
  }

  revalidatePath("/dashboard/tournaments/[id]", "page")
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
/** TOURNOI: Supprimer une équipe */
// ──────────────────────────────────────────────────────────────────────────────
export async function removeTeam(tournamentId: string, teamId: string) {
  const supabase = await createSupabaseServerClient()

  // Vérifier que le tournoi est en brouillon
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .single()

  if (!tournament) {
    throw new Error("Tournoi introuvable")
  }

  if (tournament.status !== "draft") {
    throw new Error("Impossible de supprimer une équipe d'un tournoi déjà démarré")
  }

  // Supprimer les joueurs de l'équipe
  const { error: playersError } = await supabase
    .from("players")
    .delete()
    .eq("team_id", teamId)
    .eq("tournament_id", tournamentId)

  if (playersError) {
    throw new Error("Erreur lors de la suppression des joueurs: " + playersError.message)
  }

  // Supprimer l'équipe
  const { error: teamError } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq("tournament_id", tournamentId)

  if (teamError) {
    throw new Error("Erreur lors de la suppression de l'équipe: " + teamError.message)
  }

  // Petit délai pour laisser la DB se synchroniser
  await new Promise(resolve => setTimeout(resolve, 100))

  revalidatePath("/dashboard/tournaments/[id]", "page")
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
/** TOURNOI: Modifier une équipe */
// ──────────────────────────────────────────────────────────────────────────────
export async function updateTeam(
  tournamentId: string,
  teamId: string,
  data: {
    teamName: string
    player1: { firstName: string; lastName: string; nationalRanking: number | null }
    player2: { firstName: string; lastName: string; nationalRanking: number | null }
  }
) {
  const supabase = await createSupabaseServerClient()

  // Vérifier que le tournoi est en brouillon
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .single()

  if (!tournament) {
    throw new Error("Tournoi introuvable")
  }

  if (tournament.status !== "draft") {
    throw new Error("Impossible de modifier une équipe d'un tournoi déjà démarré")
  }

  // Récupérer les joueurs de l'équipe
  const { data: players } = await supabase
    .from("players")
    .select("id")
    .eq("team_id", teamId)
    .eq("tournament_id", tournamentId)
    .order("created_at")

  if (!players || players.length !== 2) {
    throw new Error("Équipe incomplète")
  }

  // Calculer le nouveau poids de paire
  const rankings = [data.player1.nationalRanking, data.player2.nationalRanking]
    .filter((r): r is number => r !== null && r > 0)
  const pairWeight = rankings.length === 2 ? rankings[0] + rankings[1] : null

  // Mettre à jour le nom de l'équipe et le poids de paire
  const { error: teamError } = await supabase
    .from("teams")
    .update({
      name: data.teamName,
      pair_weight: pairWeight,
    })
    .eq("id", teamId)

  if (teamError) {
    throw new Error("Erreur lors de la mise à jour de l'équipe: " + teamError.message)
  }

  // Mettre à jour le premier joueur
  const { error: player1Error } = await supabase
    .from("players")
    .update({
      first_name: data.player1.firstName,
      last_name: data.player1.lastName,
      national_ranking: data.player1.nationalRanking,
    })
    .eq("id", players[0].id)

  if (player1Error) {
    throw new Error("Erreur lors de la mise à jour du joueur 1: " + player1Error.message)
  }

  // Mettre à jour le deuxième joueur
  const { error: player2Error } = await supabase
    .from("players")
    .update({
      first_name: data.player2.firstName,
      last_name: data.player2.lastName,
      national_ranking: data.player2.nationalRanking,
    })
    .eq("id", players[1].id)

  if (player2Error) {
    throw new Error("Erreur lors de la mise à jour du joueur 2: " + player2Error.message)
  }

  revalidatePath("/dashboard/tournaments/[id]", "page")
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
/** TOURNOI: Supprimer un tournoi complet */
// ──────────────────────────────────────────────────────────────────────────────
export async function deleteTournament(tournamentId: string) {
  const supabase = await createSupabaseServerClient()

  // Vérifier que le tournoi existe
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("name")
    .eq("id", tournamentId)
    .single()

  if (!tournament) {
    throw new Error("Tournoi introuvable")
  }

  // Supprimer dans l'ordre inverse des dépendances

  // 1. Supprimer les classements finaux
  const { error: rankingsError } = await supabase
    .from("tournament_rankings")
    .delete()
    .eq("tournament_id", tournamentId)

  if (rankingsError) {
    console.warn("Erreur suppression rankings:", rankingsError.message)
  }

  // 2. Supprimer les matchs
  const { error: matchesError } = await supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId)

  if (matchesError) {
    console.warn("Erreur suppression matches:", matchesError.message)
  }

  // 3. Supprimer les joueurs
  const { error: playersError } = await supabase
    .from("players")
    .delete()
    .eq("tournament_id", tournamentId)

  if (playersError) {
    console.warn("Erreur suppression players:", playersError.message)
  }

  // 4. Supprimer les équipes
  const { error: teamsError } = await supabase
    .from("teams")
    .delete()
    .eq("tournament_id", tournamentId)

  if (teamsError) {
    console.warn("Erreur suppression teams:", teamsError.message)
  }

  // 5. Enfin supprimer le tournoi
  const { error: tournamentError } = await supabase
    .from("tournaments")
    .delete()
    .eq("id", tournamentId)

  if (tournamentError) {
    throw new Error("Erreur lors de la suppression du tournoi: " + tournamentError.message)
  }

  revalidatePath("/dashboard")
  return { success: true, tournamentName: tournament.name }
}
