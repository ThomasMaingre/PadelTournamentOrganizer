// lib/tournament-actions.ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { calculateFinalRankings } from "./ranking-actions"
import { createTournamentSlug, generateUniqueSlug } from "@/lib/utils/slug"

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
      .select("difficulty, start_date, category")
      .eq("id", tournamentId)
      .single()

    return tournament ? createTournamentSlug(tournament.difficulty, tournament.start_date, tournament.category) : null
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

  const difficulty = String(formData.get("difficulty") ?? "").trim()
  const judgeId = String(formData.get("judgeId") ?? "").trim()
  const startDate = String(formData.get("startDate") ?? "").trim()
  const endDate = formData.get("endDate") ? String(formData.get("endDate")) : null
  const category = String(formData.get("category") ?? "mixte").trim()

  const maxTeams = Number(formData.get("maxTeams") ?? 16)
  const max_players = maxTeams * 2

  if (!difficulty || !judgeId || !startDate) {
    return { error: "Veuillez remplir tous les champs obligatoires (difficulté, juge, date de début)." }
  }

  // Générer le slug unique avec gestion des doublons
  const tournamentSlug = await generateUniqueSlug(difficulty, startDate, category, undefined, supabase)

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      difficulty,
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
  return { success: true, tournamentId: data.id, tournamentSlug }
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

async function cleanupSemifinalDuplicates(tournamentId: string) {
  const supabase = await createSupabaseClient()

  // Récupérer tous les matches de demi-finale
  const { data: semifinals } = await supabase
    .from("matches")
    .select("id, team1_id, team2_id")
    .eq("tournament_id", tournamentId)
    .eq("match_type", "semi_final")
    .order("created_at")

  if (!semifinals || semifinals.length <= 2) return

  console.log(`🧹 Nettoyage: ${semifinals.length} demi-finales trouvées`)

  // Tracker les équipes déjà vues
  const seenTeams = new Set<string>()
  const duplicateMatches: string[] = []

  for (const match of semifinals) {
    const teams = [match.team1_id, match.team2_id].filter(Boolean)
    const hasDuplicate = teams.some(teamId => seenTeams.has(teamId))

    if (hasDuplicate) {
      duplicateMatches.push(match.id)
      console.log(`🧹 Match en doublon trouvé: ${match.id}`)
    } else {
      teams.forEach(teamId => seenTeams.add(teamId))
    }
  }

  // Supprimer les matches en doublon
  if (duplicateMatches.length > 0) {
    await supabase
      .from("matches")
      .delete()
      .in("id", duplicateMatches)
    console.log(`🧹 ${duplicateMatches.length} demi-finales en doublon supprimées`)
  }
}

function getNextPowerOfTwo(n: number): number {
  if (n <= 2) return 2
  if (n <= 4) return 4
  if (n <= 8) return 8
  if (n <= 16) return 16
  return 32
}

async function getOrCreateTBDTeam(tournamentId: string, supabase: any) {
  const { data: existingTBD } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('name', 'TBD')
    .single()

  if (existingTBD) return existingTBD

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
  return newTBD
}

async function generateCompleteBracket(
  tournamentId: string,
  teams: any[],
  bracketSize: number,
  tbdTeamId: string,
  supabase: any
) {
  console.log(`🏗️ Génération bracket complet: ${teams.length} équipes sur ${bracketSize} slots`)

  // Créer la structure complète du bracket
  const bracketStructure = createBracketStructure(bracketSize)

  // Calculer les BYEs
  const byeCount = bracketSize - teams.length
  const byeTeams = teams.slice(0, byeCount) // Les meilleures têtes de série ont des BYEs
  const playingTeams = teams.slice(byeCount) // Les autres jouent le 1er tour

  console.log(`🎯 BYEs: ${byeCount} équipes (${byeTeams.map(t => `#${t.seed_position}`).join(', ')})`)
  console.log(`🎯 1er tour: ${playingTeams.length} équipes`)

  const allMatches: any[] = []

  // Round 1 : uniquement les équipes qui n'ont pas de BYE
  if (bracketStructure.rounds.length > 0 && playingTeams.length > 0) {
    const firstRound = bracketStructure.rounds[0]
    const firstRoundMatches = Math.floor(playingTeams.length / 2)

    console.log(`🎯 Création ${firstRoundMatches} matches de ${firstRound.type}`)

    // Seeding standard : 1er vs dernier, 2ème vs avant-dernier, etc.
    for (let i = 0; i < firstRoundMatches; i++) {
      const team1 = playingTeams[i]
      const team2 = playingTeams[playingTeams.length - 1 - i]

      allMatches.push({
        tournament_id: tournamentId,
        match_type: firstRound.type,
        round_number: 1,
        status: "scheduled",
        team1_id: team1.id,
        team2_id: team2.id,
        player1_id: null,
        player2_id: null,
        winner_team_id: null,
        winner_id: null,
      })
    }
  }

  // Round suivant (quarts) : placer les équipes BYE + slots TBD pour les gagnants
  if (bracketStructure.rounds.length > 1) {
    const secondRound = bracketStructure.rounds[1]

    console.log(`🎯 Création ${secondRound.matchCount} matches de ${secondRound.type}`)

    for (let i = 0; i < secondRound.matchCount; i++) {
      const byeTeam = byeTeams[i] || null

      allMatches.push({
        tournament_id: tournamentId,
        match_type: secondRound.type,
        round_number: 1,
        status: "scheduled",
        team1_id: byeTeam?.id || tbdTeamId,
        team2_id: tbdTeamId, // Slot pour le gagnant du 1er tour
        player1_id: null,
        player2_id: null,
        winner_team_id: null,
        winner_id: null,
      })
    }
  }

  // Rounds suivants (demis, finale) : tous TBD
  for (let roundIndex = 2; roundIndex < bracketStructure.rounds.length; roundIndex++) {
    const round = bracketStructure.rounds[roundIndex]
    console.log(`🎯 Création ${round.matchCount} matches de ${round.type} (TBD)`)

    for (let i = 0; i < round.matchCount; i++) {
      allMatches.push({
        tournament_id: tournamentId,
        match_type: round.type,
        round_number: 1,
        status: "scheduled",
        team1_id: tbdTeamId,
        team2_id: tbdTeamId,
        player1_id: null,
        player2_id: null,
        winner_team_id: null,
        winner_id: null,
      })
    }
  }

  // Insérer tous les matches
  if (allMatches.length > 0) {
    const { error } = await supabase.from("matches").insert(allMatches)
    if (error) throw error
  }

  console.log(`✅ ${allMatches.length} matches créés dans le bracket`)
}

function createBracketStructure(size: number) {
  const rounds: Array<{type: string, matchCount: number}> = []

  if (size >= 16) {
    rounds.push({ type: "round_of_16", matchCount: 8 })
    rounds.push({ type: "quarter_final", matchCount: 4 })
    rounds.push({ type: "semi_final", matchCount: 2 })
    rounds.push({ type: "final", matchCount: 1 })
  } else if (size >= 8) {
    rounds.push({ type: "quarter_final", matchCount: 4 })
    rounds.push({ type: "semi_final", matchCount: 2 })
    rounds.push({ type: "final", matchCount: 1 })
  } else if (size >= 4) {
    rounds.push({ type: "semi_final", matchCount: 2 })
    rounds.push({ type: "final", matchCount: 1 })
  } else {
    rounds.push({ type: "final", matchCount: 1 })
  }

  return { rounds }
}


export async function generateKnockoutBracket(tournamentId: string) {
  const supabase = await createSupabaseClient()

  // 1) Équipes triées par seed
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

  console.log(`🎯 ${teams.length} vraies équipes`)

  // 2) Déterminer la taille du bracket
  const bracketSize = getNextPowerOfTwo(teams.length)
  console.log(`📊 Taille du bracket: ${bracketSize}`)

  // 3) Purge des anciens matches
  await supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId)
    .in("match_type", ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"])

  // 4) Créer ou récupérer l'équipe TBD
  const tbdTeam = await getOrCreateTBDTeam(tournamentId, supabase)

  // 5) Générer TOUT le bracket de façon déterministe
  await generateCompleteBracket(tournamentId, teams, bracketSize, tbdTeam.id, supabase)

  console.log(`✅ Bracket complet généré pour ${teams.length} équipes`)
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

  console.log(`🚀 DÉBUT checkAndAdvanceTeams: matchId=${matchId.slice(0,8)}`)

  // Protection contre les doubles appels
  const cacheKey = `advancement_${matchId}`
  if (global[cacheKey]) {
    console.log(`⚠️ PROTECTION: Avancement déjà en cours, arrêt`)
    return
  }
  global[cacheKey] = true

  // Nettoyer le cache après 5 secondes
  setTimeout(() => {
    delete global[cacheKey]
  }, 5000)

  const { data: match } = await supabase
    .from("matches")
    .select("id, match_type, winner_team_id")
    .eq("id", matchId)
    .single()

  if (!match || !match.winner_team_id) {
    console.log(`❌ Arrêt: pas de match ou pas de winner`)
    return
  }

  const nextType = nextRoundOf(match.match_type)
  if (!nextType) {
    console.log(`❌ Arrêt: pas de next round pour ${match.match_type}`)
    return
  }

  console.log(`🎯 Avancement de ${match.match_type} vers ${nextType}`)

  // Récupérer l'équipe TBD
  const { data: tbdTeams } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("name", "TBD")

  const tbdTeamId = tbdTeams?.[0]?.id
  if (!tbdTeamId) {
    console.log(`❌ TBD team non trouvé`)
    return
  }

  // Trouver le prochain slot libre dans le round suivant
  const { data: nextRoundMatches } = await supabase
    .from("matches")
    .select("id, team1_id, team2_id")
    .eq("tournament_id", tournamentId)
    .eq("match_type", nextType)
    .or(`team1_id.eq.${tbdTeamId},team2_id.eq.${tbdTeamId}`)
    .order("created_at", { ascending: true })

  if (!nextRoundMatches?.length) {
    console.log(`❌ Aucun slot libre dans ${nextType}`)
    return
  }

  // Trouver le premier slot vraiment libre
  const freeSlot = nextRoundMatches.find(slot =>
    slot.team1_id === tbdTeamId || slot.team2_id === tbdTeamId
  )

  if (!freeSlot) {
    console.log(`❌ Aucun slot libre trouvé`)
    return
  }

  // Placer l'équipe gagnante
  const updateField = freeSlot.team1_id === tbdTeamId ? 'team1_id' : 'team2_id'

  const { error } = await supabase
    .from("matches")
    .update({ [updateField]: match.winner_team_id })
    .eq("id", freeSlot.id)

  if (error) {
    console.error("❌ Erreur placement:", error.message)
  } else {
    console.log(`✅ Équipe ${match.winner_team_id.slice(0,8)} placée dans ${nextType}`)
  }
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
    difficulty: string
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
    .select("status, difficulty, start_date, category")
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
    updateData.difficulty = data.difficulty
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
export async function deleteTournament(tournamentSlug: string) {
  const supabase = await createSupabaseServerClient()

  // Convertir le slug en ID réel du tournoi
  const { getTournamentIdFromSlug } = await import("./utils/slug")
  const tournamentId = await getTournamentIdFromSlug(tournamentSlug, supabase)

  if (!tournamentId) {
    throw new Error(`Tournoi introuvable avec le slug: ${tournamentSlug}. Vérifiez que le tournoi existe et que le slug est correct.`)
  }

  // Vérifier que le tournoi existe et récupérer ses infos
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("difficulty, start_date, category")
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
  const tournamentDisplay = `${tournament.difficulty} ${tournament.category} ${new Date(tournament.start_date).toLocaleDateString('fr-FR')}`
  return { success: true, tournamentName: tournamentDisplay }
}
