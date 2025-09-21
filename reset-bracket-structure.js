const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetBracketStructure() {
  try {
    const tournamentId = 'd26286ae-de90-4e99-bd4c-2dff32c85dc8'

    console.log('🔄 Remise à zéro de la structure du bracket...')

    // 1. Remettre tous les matchs non 1/16 à l'état initial
    const { error: resetError } = await supabase
      .from('matches')
      .update({
        status: 'scheduled',
        player1_score: 0,
        player2_score: 0,
        winner_team_id: null,
        set_scores: null
      })
      .eq('tournament_id', tournamentId)
      .neq('match_type', 'round_of_16')

    if (resetError) {
      console.error('Erreur reset matchs:', resetError)
      return
    }

    console.log('✅ Matchs remis à zéro')

    // 2. Nettoyer les équipes des matchs 1/8 et suivants
    // Il faut utiliser des placeholders puis les remettre à null

    // Récupérer un team ID placeholder
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', tournamentId)
      .limit(1)

    if (!teams || teams.length === 0) {
      console.error('Pas d\'équipe pour placeholder')
      return
    }

    const placeholderId = teams[0].id

    // 3. Nettoyer les matchs 1/8 et suivants (quarter_final round 1)
    const quarterFinalRound1Matches = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'quarter_final')
      .eq('round_number', 1)

    for (const match of quarterFinalRound1Matches.data || []) {
      // D'abord mettre des placeholders
      await supabase
        .from('matches')
        .update({
          team1_id: placeholderId,
          team2_id: placeholderId
        })
        .eq('id', match.id)

      // Puis remettre à null
      await supabase
        .from('matches')
        .update({
          team1_id: null,
          team2_id: null
        })
        .eq('id', match.id)
    }

    // 4. Nettoyer les matchs 1/4 (quarter_final round 2)
    const quarterFinalRound2Matches = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'quarter_final')
      .eq('round_number', 2)

    for (const match of quarterFinalRound2Matches.data || []) {
      await supabase
        .from('matches')
        .update({
          team1_id: placeholderId,
          team2_id: placeholderId
        })
        .eq('id', match.id)

      await supabase
        .from('matches')
        .update({
          team1_id: null,
          team2_id: null
        })
        .eq('id', match.id)
    }

    // 5. Nettoyer les demi-finales
    const semiFinalMatches = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'semi_final')

    for (const match of semiFinalMatches.data || []) {
      await supabase
        .from('matches')
        .update({
          team1_id: placeholderId,
          team2_id: placeholderId
        })
        .eq('id', match.id)

      await supabase
        .from('matches')
        .update({
          team1_id: null,
          team2_id: null
        })
        .eq('id', match.id)
    }

    // 6. Nettoyer la finale
    const finalMatches = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('match_type', 'final')

    for (const match of finalMatches.data || []) {
      await supabase
        .from('matches')
        .update({
          team1_id: placeholderId,
          team2_id: placeholderId
        })
        .eq('id', match.id)

      await supabase
        .from('matches')
        .update({
          team1_id: null,
          team2_id: null
        })
        .eq('id', match.id)
    }

    console.log('✅ Structure du bracket nettoyée')

    // Vérification
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, match_type, round_number, team1_id, team2_id, status')
      .eq('tournament_id', tournamentId)
      .order('match_type, round_number')

    console.log('\n📋 Structure après nettoyage:')
    allMatches?.forEach(m => {
      const team1 = m.team1_id ? 'SET' : 'NULL'
      const team2 = m.team2_id ? 'SET' : 'NULL'
      console.log(`${m.match_type} round ${m.round_number}: ${team1} vs ${team2} (${m.status})`)
    })

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

resetBracketStructure()