const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixBracketManually() {
  try {
    const tournamentId = 'd26286ae-de90-4e99-bd4c-2dff32c85dc8'

    console.log('🔧 Correction manuelle du bracket...')

    // 1. Récupérer les gagnants des 1/16
    const { data: round16Winners, error: winnersError } = await supabase
      .from('matches')
      .select('id, winner_team_id, team1:teams!matches_team1_id_fkey(name), team2:teams!matches_team2_id_fkey(name)')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'round_of_16')
      .eq('status', 'completed')

    if (winnersError) {
      console.error('Erreur récupération gagnants 1/16:', winnersError)
      return
    }

    console.log(`\n🏆 Gagnants des 1/16 (${round16Winners.length}):`)
    round16Winners.forEach((match, i) => {
      const winnerName = match.winner_team_id === match.team1?.id
        ? match.team1?.name
        : match.team2?.name
      console.log(`${i+1}. ${winnerName} (${match.winner_team_id})`)
    })

    const winnerIds = round16Winners.map(m => m.winner_team_id)

    // 2. Récupérer les matchs des 1/8 (quarter_final round 1)
    const { data: round8Matches, error: round8Error } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'quarter_final')
      .eq('round_number', 1)
      .order('created_at')

    if (round8Error) {
      console.error('Erreur récupération matchs 1/8:', round8Error)
      return
    }

    console.log(`\n🎯 Placement des équipes dans les 1/8 (${round8Matches.length} matchs):`)

    // 3. Placer les gagnants dans les 1/8 (2 équipes par match)
    for (let i = 0; i < round8Matches.length && i * 2 < winnerIds.length; i++) {
      const match = round8Matches[i]
      const team1Id = winnerIds[i * 2] || null
      const team2Id = winnerIds[i * 2 + 1] || null

      console.log(`Match ${i+1}: Placement équipes ${team1Id} vs ${team2Id}`)

      // Mettre à jour le match avec les bonnes équipes
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          team1_id: team1Id,
          team2_id: team2Id,
          status: 'scheduled',
          player1_score: 0,
          player2_score: 0,
          winner_team_id: null
        })
        .eq('id', match.id)

      if (updateError) {
        console.error(`Erreur update match ${match.id}:`, updateError)
      } else {
        console.log(`✅ Match ${match.id} mis à jour`)
      }
    }

    // 4. Nettoyer les autres rounds (les remettre vides)
    console.log('\n🧹 Nettoyage des tours suivants...')

    // Placeholder team pour contourner la contrainte
    const placeholderTeamId = winnerIds[0] // Utiliser une équipe existante

    // 1/4 de finale
    const { data: quarterMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'quarter_final')
      .eq('round_number', 2)

    for (const match of quarterMatches || []) {
      await supabase.from('matches').update({
        team1_id: placeholderTeamId,
        team2_id: placeholderTeamId
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

    // Demi-finales
    const { data: semiMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'semi_final')

    for (const match of semiMatches || []) {
      await supabase.from('matches').update({
        team1_id: placeholderTeamId,
        team2_id: placeholderTeamId
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

    // Finale
    const { data: finalMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'final')

    for (const match of finalMatches || []) {
      await supabase.from('matches').update({
        team1_id: placeholderTeamId,
        team2_id: placeholderTeamId
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

    console.log('✅ Bracket réparé manuellement')

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

fixBracketManually()