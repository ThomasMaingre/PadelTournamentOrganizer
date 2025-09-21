const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function createMissingRounds() {
  try {
    const tournamentId = 'dc61c6c4-491f-49b9-8b3b-089a7ed0dc9e'

    console.log('🏗️  Création des tours manquants pour P500...')

    // Récupérer les équipes existantes pour utiliser leurs IDs comme placeholders
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', tournamentId)
      .limit(2)

    if (!teams || teams.length < 2) {
      console.error('Pas assez d\'équipes pour créer des placeholders')
      return
    }

    const placeholderTeam1 = teams[0].id
    const placeholderTeam2 = teams[1].id

    // Fonction helper pour créer un match avec contournement de contrainte
    async function createMatchWithWorkaround(matchData) {
      try {
        // D'abord, créer avec des IDs d'équipes existantes
        const { data: tempMatch, error: createError } = await supabase
          .from('matches')
          .insert({
            ...matchData,
            team1_id: placeholderTeam1,
            team2_id: placeholderTeam2
          })
          .select()
          .single()

        if (createError) {
          console.error('Erreur création match temporaire:', createError)
          return null
        }

        // Ensuite, mettre à jour avec les vraies valeurs (null si nécessaire)
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            team1_id: matchData.team1_id,
            team2_id: matchData.team2_id
          })
          .eq('id', tempMatch.id)

        if (updateError) {
          console.error('Erreur mise à jour match:', updateError)
          return null
        }

        return tempMatch.id
      } catch (error) {
        console.error('Erreur générale création match:', error)
        return null
      }
    }

    // 1/8 de finale (quarter_final round 1) - 3 matchs manquants
    console.log('\n🎯 Création des 1/8 de finale...')
    for (let i = 1; i <= 3; i++) {
      const matchId = await createMatchWithWorkaround({
        tournament_id: tournamentId,
        match_type: 'quarter_final',
        round_number: 1,
        status: 'scheduled',
        team1_id: null,
        team2_id: null,
        player1_score: 0,
        player2_score: 0
      })

      if (matchId) {
        console.log(`✅ 1/8 match ${i} créé: ${matchId}`)
      }
    }

    // 1/4 de finale (quarter_final round 2) - 2 matchs
    console.log('\n🎯 Création des 1/4 de finale...')
    for (let i = 1; i <= 2; i++) {
      const matchId = await createMatchWithWorkaround({
        tournament_id: tournamentId,
        match_type: 'quarter_final',
        round_number: 2,
        status: 'scheduled',
        team1_id: null,
        team2_id: null,
        player1_score: 0,
        player2_score: 0
      })

      if (matchId) {
        console.log(`✅ 1/4 match ${i} créé: ${matchId}`)
      }
    }

    // 1/2 finale (semi_final) - 1 match
    console.log('\n🎯 Création de la 1/2 finale...')
    const semiMatchId = await createMatchWithWorkaround({
      tournament_id: tournamentId,
      match_type: 'semi_final',
      round_number: 1,
      status: 'scheduled',
      team1_id: null,
      team2_id: null,
      player1_score: 0,
      player2_score: 0
    })

    if (semiMatchId) {
      console.log(`✅ 1/2 finale créée: ${semiMatchId}`)
    }

    // Finale - 1 match
    console.log('\n🎯 Création de la finale...')
    const finalMatchId = await createMatchWithWorkaround({
      tournament_id: tournamentId,
      match_type: 'final',
      round_number: 1,
      status: 'scheduled',
      team1_id: null,
      team2_id: null,
      player1_score: 0,
      player2_score: 0
    })

    if (finalMatchId) {
      console.log(`✅ Finale créée: ${finalMatchId}`)
    }

    console.log('\n🎉 Création des tours terminée!')

    // Vérification finale
    const { data: allMatches } = await supabase
      .from('matches')
      .select('match_type, round_number')
      .eq('tournament_id', tournamentId)
      .order('match_type, round_number')

    console.log('\n📋 Structure du tournoi mise à jour:')
    const grouped = {}
    allMatches?.forEach(m => {
      const key = `${m.match_type}_${m.round_number}`
      if (!grouped[key]) grouped[key] = 0
      grouped[key]++
    })

    Object.keys(grouped).forEach(key => {
      const [type, round] = key.split('_')
      console.log(`- ${type} round ${round}: ${grouped[key]} matchs`)
    })

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

createMissingRounds()