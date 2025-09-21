const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixDuplicateTeams() {
  try {
    const tournamentId = 'd26286ae-de90-4e99-bd4c-2dff32c85dc8'

    console.log('🔧 Correction des équipes dupliquées...')

    // 1. Récupérer toutes les équipes du tournoi
    const { data: allTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, seed_position')
      .eq('tournament_id', tournamentId)
      .order('seed_position', { ascending: true, nullsLast: true })

    if (teamsError) {
      console.error('Erreur récupération équipes:', teamsError)
      return
    }

    console.log(`\n👥 Équipes disponibles (${allTeams.length}):`)
    allTeams.forEach(t => {
      console.log(`- ${t.name} (seed: ${t.seed_position}, id: ${t.id})`)
    })

    // 2. Analyser les gagnants réels des 1/16
    const { data: round16Matches, error: round16Error } = await supabase
      .from('matches')
      .select(`
        id,
        winner_team_id,
        team1:teams!matches_team1_id_fkey(id, name),
        team2:teams!matches_team2_id_fkey(id, name)
      `)
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'round_of_16')
      .eq('status', 'completed')

    if (round16Error) {
      console.error('Erreur round16:', round16Error)
      return
    }

    console.log(`\n🏆 Gagnants réels des 1/16:`)
    const realWinners = []
    round16Matches.forEach((match, i) => {
      const winnerName = match.winner_team_id === match.team1?.id
        ? match.team1?.name
        : match.team2?.name
      realWinners.push(match.winner_team_id)
      console.log(`${i+1}. ${winnerName} (${match.winner_team_id})`)
    })

    // 3. Reconstruire les 1/8 avec les vrais gagnants
    console.log('\n🎯 Reconstruction des 1/8...')

    const { data: round8Matches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'quarter_final')
      .eq('round_number', 1)
      .order('created_at')

    // Répartir les 4 gagnants en 2 matchs
    if (realWinners.length >= 4 && round8Matches.length >= 2) {
      // Match 1: gagnants 1 vs 2
      await updateMatch(round8Matches[0].id, realWinners[0], realWinners[1])
      console.log(`✅ 1/8 Match 1: ${realWinners[0]} vs ${realWinners[1]}`)

      // Match 2: gagnants 3 vs 4
      await updateMatch(round8Matches[1].id, realWinners[2], realWinners[3])
      console.log(`✅ 1/8 Match 2: ${realWinners[2]} vs ${realWinners[3]}`)

      // Simuler les résultats des 1/8
      const round8Winners = []

      // Résultat match 1
      const result1 = generateResult()
      const winner1 = result1.winner === 1 ? realWinners[0] : realWinners[1]
      await completeMatch(round8Matches[0].id, result1, winner1)
      round8Winners.push(winner1)
      console.log(`🎾 1/8 Match 1 terminé: ${result1.score1}-${result1.score2}, gagnant: ${winner1}`)

      // Résultat match 2
      const result2 = generateResult()
      const winner2 = result2.winner === 1 ? realWinners[2] : realWinners[3]
      await completeMatch(round8Matches[1].id, result2, winner2)
      round8Winners.push(winner2)
      console.log(`🎾 1/8 Match 2 terminé: ${result2.score1}-${result2.score2}, gagnant: ${winner2}`)

      // 4. Reconstruire les 1/4 avec les gagnants des 1/8
      console.log('\n🎯 Reconstruction des 1/4...')
      const { data: round4Matches } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('match_type', 'quarter_final')
        .eq('round_number', 2)
        .limit(1)

      if (round4Matches.length > 0) {
        await updateMatch(round4Matches[0].id, round8Winners[0], round8Winners[1])
        console.log(`✅ 1/4: ${round8Winners[0]} vs ${round8Winners[1]}`)

        // Simuler le 1/4
        const result4 = generateResult()
        const winner4 = result4.winner === 1 ? round8Winners[0] : round8Winners[1]
        await completeMatch(round4Matches[0].id, result4, winner4)
        console.log(`🎾 1/4 terminé: ${result4.score1}-${result4.score2}, gagnant: ${winner4}`)

        // 5. Finale avec le gagnant des 1/4 vs une autre équipe forte
        console.log('\n🏆 Configuration finale...')
        const { data: finalMatches } = await supabase
          .from('matches')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('match_type', 'final')
          .limit(1)

        if (finalMatches.length > 0) {
          // Prendre une équipe forte (seed 1 ou 2) qui n'est pas le gagnant
          const strongTeam = allTeams.find(t =>
            (t.seed_position === 1 || t.seed_position === 2) &&
            t.id !== winner4
          )

          if (strongTeam) {
            await updateMatch(finalMatches[0].id, winner4, strongTeam.id)
            console.log(`✅ Finale: ${winner4} vs ${strongTeam.id} (${strongTeam.name})`)

            // Simuler la finale
            const finalResult = generateResult()
            const finalWinner = finalResult.winner === 1 ? winner4 : strongTeam.id
            await completeMatch(finalMatches[0].id, finalResult, finalWinner)
            console.log(`🏆 FINALE: ${finalResult.score1}-${finalResult.score2}`)
            console.log(`🎉 CHAMPION: ${finalWinner}`)
          }
        }
      }

      // 6. Nettoyer les matchs de 1/2 qui ne sont plus nécessaires
      console.log('\n🧹 Nettoyage des 1/2...')
      const { data: semiMatches } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('match_type', 'semi_final')

      for (const match of semiMatches || []) {
        const placeholder = allTeams[0].id
        await supabase.from('matches').update({
          team1_id: placeholder,
          team2_id: placeholder
        }).eq('id', match.id)

        await supabase.from('matches').update({
          team1_id: null,
          team2_id: null,
          status: 'scheduled',
          player1_score: 0,
          player2_score: 0,
          winner_team_id: null
        }).eq('id', match.id)
      }
    }

    console.log('\n✅ Correction terminée!')

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

async function updateMatch(matchId, team1Id, team2Id) {
  const { error } = await supabase
    .from('matches')
    .update({
      team1_id: team1Id,
      team2_id: team2Id,
      status: 'scheduled',
      player1_score: 0,
      player2_score: 0,
      winner_team_id: null
    })
    .eq('id', matchId)

  if (error) {
    console.error(`Erreur update match ${matchId}:`, error)
  }
}

async function completeMatch(matchId, result, winnerId) {
  const { error } = await supabase
    .from('matches')
    .update({
      player1_score: result.score1,
      player2_score: result.score2,
      winner_team_id: winnerId,
      status: 'completed'
    })
    .eq('id', matchId)

  if (error) {
    console.error(`Erreur completion match ${matchId}:`, error)
  }
}

function generateResult() {
  const scenarios = [
    { score1: 2, score2: 0, winner: 1 },
    { score1: 2, score2: 1, winner: 1 },
    { score1: 0, score2: 2, winner: 2 },
    { score1: 1, score2: 2, winner: 2 }
  ]
  return scenarios[Math.floor(Math.random() * scenarios.length)]
}

fixDuplicateTeams()