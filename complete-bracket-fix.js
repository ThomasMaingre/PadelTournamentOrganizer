const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function completeBracketFix() {
  try {
    const tournamentId = 'd26286ae-de90-4e99-bd4c-2dff32c85dc8'

    console.log('🏁 Complétion de la simulation du bracket...')

    // 1. Récupérer les gagnants des 1/8
    const { data: round8Winners, error: winnersError } = await supabase
      .from('matches')
      .select(`
        id,
        winner_team_id,
        team1:teams!matches_team1_id_fkey(id, name),
        team2:teams!matches_team2_id_fkey(id, name)
      `)
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'quarter_final')
      .eq('round_number', 1)
      .eq('status', 'completed')

    if (winnersError) {
      console.error('Erreur récupération gagnants 1/8:', winnersError)
      return
    }

    console.log(`\n🏆 Gagnants des 1/8 (${round8Winners.length}):`)
    round8Winners.forEach((match, i) => {
      const winnerName = match.winner_team_id === match.team1?.id
        ? match.team1?.name
        : match.team2?.name
      console.log(`${i+1}. ${winnerName} (${match.winner_team_id})`)
    })

    const winnerIds = round8Winners.map(m => m.winner_team_id)

    // 2. Placer dans les 1/4 de finale
    if (winnerIds.length >= 2) {
      const { data: quarterMatches } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('match_type', 'quarter_final')
        .eq('round_number', 2)
        .limit(1)

      if (quarterMatches && quarterMatches.length > 0) {
        console.log('\n🎯 Placement en 1/4 de finale...')

        const { error: updateError } = await supabase
          .from('matches')
          .update({
            team1_id: winnerIds[0],
            team2_id: winnerIds[1],
            status: 'scheduled',
            player1_score: 0,
            player2_score: 0,
            winner_team_id: null
          })
          .eq('id', quarterMatches[0].id)

        if (updateError) {
          console.error('Erreur placement 1/4:', updateError)
        } else {
          console.log('✅ 1/4 de finale configuré')

          // 3. Simuler le match de 1/4
          const result = generatePadelScore()
          const winnerTeamId = result.winner === 1 ? winnerIds[0] : winnerIds[1]

          const { error: scoreError } = await supabase
            .from('matches')
            .update({
              player1_score: result.player1_score,
              player2_score: result.player2_score,
              winner_team_id: winnerTeamId,
              status: 'completed',
              set_scores: result.setScores
            })
            .eq('id', quarterMatches[0].id)

          if (scoreError) {
            console.error('Erreur simulation 1/4:', scoreError)
          } else {
            console.log(`🎾 1/4 de finale simulé: ${result.player1_score}-${result.player2_score} sets, gagnant: ${winnerTeamId}`)

            // 4. Créer une finale directe (puisqu'il n'y a qu'un gagnant de 1/4)
            const { data: finalMatches } = await supabase
              .from('matches')
              .select('id')
              .eq('tournament_id', tournamentId)
              .eq('match_type', 'final')
              .limit(1)

            if (finalMatches && finalMatches.length > 0) {
              console.log('\n🏆 Configuration de la finale...')

              // Prendre une autre équipe au hasard pour faire une finale
              const allTeams = await supabase
                .from('teams')
                .select('id, name')
                .eq('tournament_id', tournamentId)
                .neq('id', winnerTeamId)
                .limit(1)

              const opponent = allTeams.data?.[0]

              if (opponent) {
                const { error: finalError } = await supabase
                  .from('matches')
                  .update({
                    team1_id: winnerTeamId,
                    team2_id: opponent.id,
                    status: 'scheduled',
                    player1_score: 0,
                    player2_score: 0,
                    winner_team_id: null
                  })
                  .eq('id', finalMatches[0].id)

                if (finalError) {
                  console.error('Erreur config finale:', finalError)
                } else {
                  console.log(`✅ Finale configurée: ${winnerTeamId} vs ${opponent.id}`)

                  // 5. Simuler la finale
                  const finalResult = generatePadelScore()
                  const finalWinner = finalResult.winner === 1 ? winnerTeamId : opponent.id

                  const { error: finalScoreError } = await supabase
                    .from('matches')
                    .update({
                      player1_score: finalResult.player1_score,
                      player2_score: finalResult.player2_score,
                      winner_team_id: finalWinner,
                      status: 'completed',
                      set_scores: finalResult.setScores
                    })
                    .eq('id', finalMatches[0].id)

                  if (finalScoreError) {
                    console.error('Erreur simulation finale:', finalScoreError)
                  } else {
                    console.log(`🏆 FINALE SIMULÉE: ${finalResult.player1_score}-${finalResult.player2_score} sets`)
                    console.log(`🎉 CHAMPION: ${finalWinner}`)
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log('\n✅ Simulation complète terminée!')

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

// Fonction pour générer des scores réalistes de padel
function generatePadelScore() {
  const possibleSets = [
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 5], [7, 6],
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 7], [6, 7]
  ]

  const sets = []
  let team1Sets = 0
  let team2Sets = 0

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

completeBracketFix()