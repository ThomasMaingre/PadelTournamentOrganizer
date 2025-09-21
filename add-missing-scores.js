const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function addMissingScores() {
  try {
    const tournamentId = 'd26286ae-de90-4e99-bd4c-2dff32c85dc8'

    console.log('🎾 Ajout des scores manquants...')

    // Récupérer tous les matchs sans score (status = scheduled)
    const { data: matchesWithoutScores } = await supabase
      .from('matches')
      .select(`
        id,
        match_type,
        round_number,
        team1_id,
        team2_id,
        team1:teams!matches_team1_id_fkey(name),
        team2:teams!matches_team2_id_fkey(name)
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'scheduled')
      .not('team1_id', 'is', null)
      .not('team2_id', 'is', null)

    console.log(`📋 ${matchesWithoutScores.length} matchs sans score trouvés`)

    for (const match of matchesWithoutScores) {
      const team1Name = match.team1?.name || 'Team1'
      const team2Name = match.team2?.name || 'Team2'

      console.log(`\n🎯 ${team1Name} vs ${team2Name}`)

      // Générer un score réaliste
      const result = generatePadelScore()
      const winnerTeamId = result.winner === 1 ? match.team1_id : match.team2_id
      const winnerName = result.winner === 1 ? team1Name : team2Name

      // Mettre à jour le match
      const { error } = await supabase
        .from('matches')
        .update({
          player1_score: result.player1_score,
          player2_score: result.player2_score,
          winner_team_id: winnerTeamId,
          status: 'completed',
          set_scores: result.setScores
        })
        .eq('id', match.id)

      if (error) {
        console.log(`❌ Erreur pour ${match.id}: ${error.message}`)
      } else {
        console.log(`✅ Score: ${result.player1_score}-${result.player2_score}, Gagnant: ${winnerName}`)
      }
    }

    console.log('\n🎉 Scores ajoutés!')

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

function generatePadelScore() {
  // Padel se joue au meilleur de 3 sets
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

addMissingScores()