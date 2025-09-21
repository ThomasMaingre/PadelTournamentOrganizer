const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function rebuildBracketClean() {
  try {
    const tournamentId = 'd26286ae-de90-4e99-bd4c-2dff32c85dc8'

    console.log('🏗️  Reconstruction complète du bracket...')

    // 1. Récupérer les gagnants réels des 1/16 (ces matchs sont corrects)
    const { data: round16Matches } = await supabase
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

    console.log(`\n✅ Gagnants des 1/16 confirmés:`)
    const realWinners = []
    round16Matches.forEach((match, i) => {
      const winnerName = match.winner_team_id === match.team1?.id
        ? match.team1?.name
        : match.team2?.name
      realWinners.push({
        id: match.winner_team_id,
        name: winnerName
      })
      console.log(`${i+1}. ${winnerName}`)
    })

    // Les 4 gagnants sont: Monster/Victime, Lammens/PorteD'Aix, Manger/Sombre, Llorens/Cance

    // 2. Nettoyer et reconstruire tous les tours suivants
    const allTeams = await supabase
      .from('teams')
      .select('id, name')
      .eq('tournament_id', tournamentId)

    const placeholder = allTeams.data[0].id

    // 3. Reconstruire les 1/8 (seulement 2 matchs nécessaires pour 4 équipes)
    console.log('\n🎯 Reconstruction des 1/8 de finale...')

    const { data: round8Matches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'quarter_final')
      .eq('round_number', 1)
      .order('created_at')

    // Match 1: Monster/Victime vs Lammens/PorteD'Aix
    if (round8Matches.length >= 1) {
      await cleanUpdateMatch(round8Matches[0].id, realWinners[0].id, realWinners[1].id, placeholder)
      console.log(`✅ 1/8 Match 1: ${realWinners[0].name} vs ${realWinners[1].name}`)

      // Simuler le résultat
      const result1 = { score1: 2, score2: 0, winner: 1 }
      const winner1 = realWinners[0].id // Monster/Victime gagne
      await completeMatch(round8Matches[0].id, result1, winner1)
      console.log(`🎾 Résultat: ${realWinners[0].name} gagne 2-0`)
    }

    // Match 2: Manger/Sombre vs Llorens/Cance
    if (round8Matches.length >= 2) {
      await cleanUpdateMatch(round8Matches[1].id, realWinners[2].id, realWinners[3].id, placeholder)
      console.log(`✅ 1/8 Match 2: ${realWinners[2].name} vs ${realWinners[3].name}`)

      // Simuler le résultat
      const result2 = { score1: 2, score2: 1, winner: 1 }
      const winner2 = realWinners[2].id // Manger/Sombre gagne
      await completeMatch(round8Matches[1].id, result2, winner2)
      console.log(`🎾 Résultat: ${realWinners[2].name} gagne 2-1`)
    }

    // Nettoyer les matchs 1/8 supplémentaires
    for (let i = 2; i < round8Matches.length; i++) {
      await clearMatch(round8Matches[i].id, placeholder)
    }

    // 4. Reconstruire les 1/4 (1 seul match)
    console.log('\n🎯 Reconstruction des 1/4 de finale...')

    const { data: round4Matches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'quarter_final')
      .eq('round_number', 2)
      .order('created_at')

    if (round4Matches.length >= 1) {
      // Monster/Victime vs Manger/Sombre
      await cleanUpdateMatch(round4Matches[0].id, realWinners[0].id, realWinners[2].id, placeholder)
      console.log(`✅ 1/4: ${realWinners[0].name} vs ${realWinners[2].name}`)

      // Simuler le résultat
      const result4 = { score1: 2, score2: 0, winner: 1 }
      const winner4 = realWinners[0].id // Monster/Victime gagne
      await completeMatch(round4Matches[0].id, result4, winner4)
      console.log(`🎾 Résultat: ${realWinners[0].name} gagne 2-0`)

      // Nettoyer les autres matchs de 1/4
      for (let i = 1; i < round4Matches.length; i++) {
        await clearMatch(round4Matches[i].id, placeholder)
      }
    }

    // 5. Nettoyer les 1/2 (plus nécessaires avec cette structure)
    console.log('\n🧹 Nettoyage des 1/2...')
    const { data: semiMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'semi_final')

    for (const match of semiMatches || []) {
      await clearMatch(match.id, placeholder)
    }

    // 6. Reconstruire la finale
    console.log('\n🏆 Reconstruction de la finale...')

    const { data: finalMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'final')

    if (finalMatches.length >= 1) {
      // Monster/Victime vs Maingre/Bouraoui (tête de série 1)
      const seed1Team = allTeams.data.find(t => t.name.includes('Maingre/Bouraoui'))

      await cleanUpdateMatch(finalMatches[0].id, realWinners[0].id, seed1Team.id, placeholder)
      console.log(`✅ Finale: ${realWinners[0].name} vs ${seed1Team.name}`)

      // Simuler la finale
      const finalResult = { score1: 1, score2: 2, winner: 2 }
      const finalWinner = seed1Team.id // Maingre/Bouraoui gagne
      await completeMatch(finalMatches[0].id, finalResult, finalWinner)
      console.log(`🏆 FINALE: ${seed1Team.name} gagne 2-1`)
      console.log(`🎉 CHAMPION: ${seed1Team.name}`)
    }

    console.log('\n✅ Reconstruction terminée!')

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

async function cleanUpdateMatch(matchId, team1Id, team2Id, placeholder) {
  // D'abord mettre des placeholders
  await supabase.from('matches').update({
    team1_id: placeholder,
    team2_id: placeholder
  }).eq('id', matchId)

  // Puis mettre les vraies valeurs
  await supabase.from('matches').update({
    team1_id: team1Id,
    team2_id: team2Id,
    status: 'scheduled',
    player1_score: 0,
    player2_score: 0,
    winner_team_id: null
  }).eq('id', matchId)
}

async function clearMatch(matchId, placeholder) {
  await supabase.from('matches').update({
    team1_id: placeholder,
    team2_id: placeholder
  }).eq('id', matchId)

  await supabase.from('matches').update({
    team1_id: null,
    team2_id: null,
    status: 'scheduled',
    player1_score: 0,
    player2_score: 0,
    winner_team_id: null
  }).eq('id', matchId)
}

async function completeMatch(matchId, result, winnerId) {
  await supabase.from('matches').update({
    player1_score: result.score1,
    player2_score: result.score2,
    winner_team_id: winnerId,
    status: 'completed'
  }).eq('id', matchId)
}

rebuildBracketClean()