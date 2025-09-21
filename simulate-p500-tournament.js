const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Fonction pour générer des scores réalistes de padel
function generatePadelScore() {
  // Padel se joue au meilleur de 3 sets
  // Chaque set se gagne 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, ou 7-6
  const possibleSets = [
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 5], [7, 6],
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 7], [6, 7]
  ]

  const sets = []
  let team1Sets = 0
  let team2Sets = 0

  // Jouer jusqu'à ce qu'une équipe gagne 2 sets
  while (team1Sets < 2 && team2Sets < 2 && sets.length < 3) {
    const setScore = possibleSets[Math.floor(Math.random() * possibleSets.length)]
    sets.push({ t1: setScore[0], t2: setScore[1] })

    if (setScore[0] > setScore[1]) {
      team1Sets++
    } else {
      team2Sets++
    }
  }

  return {
    setScores: sets,
    winner: team1Sets > team2Sets ? 1 : 2,
    player1_score: team1Sets,
    player2_score: team2Sets
  }
}

async function simulateP500Tournament() {
  try {
    console.log('🏆 Simulation du tournoi P500...')

    // Récupérer tous les matchs du tournoi P500
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select(`
        id,
        match_type,
        round_number,
        status,
        team1_id,
        team2_id,
        player1_score,
        player2_score,
        tournament_id
      `)
      .eq('tournament_id', 'd26286ae-de90-4e99-bd4c-2dff32c85dc8')
      .order('created_at')

    if (matchError) {
      console.error('Erreur lors de la récupération des matchs:', matchError)
      return
    }

    console.log(`📋 ${matches.length} matchs trouvés`)

    // Ordre de traitement des rounds (selon la structure observée)
    const roundOrder = [
      { match_type: 'round_of_16', round_number: 1 },
      { match_type: 'quarter_final', round_number: 1 }, // 1/8
      { match_type: 'quarter_final', round_number: 2 }, // 1/4
      { match_type: 'semi_final', round_number: 3 },
      { match_type: 'final', round_number: 4 }
    ]

    for (const round of roundOrder) {
      const roundMatches = matches.filter(m =>
        m.match_type === round.match_type &&
        m.round_number === round.round_number &&
        m.status !== 'completed'
      )

      console.log(`\n🔄 Traitement ${round.match_type} (round ${round.round_number}): ${roundMatches.length} matchs`)

      for (const match of roundMatches) {
        // Vérifier que les deux équipes sont présentes
        if (!match.team1_id || !match.team2_id) {
          console.log(`⏭️  Match ${match.id}: équipes manquantes, ignoré`)
          continue
        }

        // Générer le score
        const result = generatePadelScore()
        console.log(`🎾 Match ${match.id}: ${result.player1_score}-${result.player2_score} sets`)

        // Déterminer l'équipe gagnante
        const winnerTeamId = result.winner === 1 ? match.team1_id : match.team2_id

        // Mettre à jour le match
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            player1_score: result.player1_score,
            player2_score: result.player2_score,
            winner_team_id: winnerTeamId,
            status: 'completed',
            set_scores: result.setScores
          })
          .eq('id', match.id)

        if (updateError) {
          console.error(`❌ Erreur mise à jour match ${match.id}:`, updateError)
          continue
        }

        console.log(`✅ Match ${match.id} terminé, gagnant: ${winnerTeamId}`)

        // Trouver le match suivant et y placer le gagnant
        await advanceWinner(matches, match, winnerTeamId)
      }
    }

    console.log('\n🎉 Simulation terminée!')

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

async function advanceWinner(allMatches, completedMatch, winnerTeamId) {
  // Logique d'avancement selon le type de match
  let nextMatchType, nextRoundNumber

  if (completedMatch.match_type === 'round_of_16') {
    nextMatchType = 'quarter_final'
    nextRoundNumber = 1 // 1/8
  } else if (completedMatch.match_type === 'quarter_final' && completedMatch.round_number === 1) {
    nextMatchType = 'quarter_final'
    nextRoundNumber = 2 // 1/4
  } else if (completedMatch.match_type === 'quarter_final' && completedMatch.round_number === 2) {
    nextMatchType = 'semi_final'
    nextRoundNumber = 3 // Selon la structure observée
  } else if (completedMatch.match_type === 'semi_final') {
    nextMatchType = 'final'
    nextRoundNumber = 4 // Selon la structure observée
  } else {
    // C'est la finale, pas d'avancement
    return
  }

  // Récupérer les matchs suivants avec l'état actuel de la DB
  const { data: nextMatches, error: fetchError } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id')
    .eq('tournament_id', completedMatch.tournament_id)
    .eq('match_type', nextMatchType)
    .eq('round_number', nextRoundNumber)

  if (fetchError) {
    console.error(`❌ Erreur récupération matchs suivants:`, fetchError)
    return
  }

  if (!nextMatches || nextMatches.length === 0) {
    console.log(`⚠️  Aucun match suivant trouvé pour ${nextMatchType} round ${nextRoundNumber}`)
    return
  }

  // Trouver le premier match avec une place libre
  const availableMatch = nextMatches.find(m => !m.team1_id || !m.team2_id)

  if (!availableMatch) {
    console.log(`⚠️  Aucune place libre dans ${nextMatchType} round ${nextRoundNumber}`)
    return
  }

  // Utiliser un placeholder puis update
  const placeholderTeamId = winnerTeamId // On va directement placer le gagnant
  const updateField = !availableMatch.team1_id ? 'team1_id' : 'team2_id'

  const { error } = await supabase
    .from('matches')
    .update({ [updateField]: winnerTeamId })
    .eq('id', availableMatch.id)

  if (error) {
    console.error(`❌ Erreur placement gagnant dans match ${availableMatch.id}:`, error)
  } else {
    console.log(`➡️  Gagnant ${winnerTeamId} placé dans ${nextMatchType} round ${nextRoundNumber} (${updateField})`)
  }
}

simulateP500Tournament()