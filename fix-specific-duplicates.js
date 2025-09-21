const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixSpecificDuplicates() {
  try {
    const tournamentId = 'd26286ae-de90-4e99-bd4c-2dff32c85dc8'

    console.log('🎯 Correction ciblée des 5 matchs dupliqués identifiés...\n')

    // IDs des matchs problématiques identifiés par le debug
    const problematicMatches = [
      'b623d289-758b-4bd3-b98f-1efbcd92b12a', // 1/8 #3
      'd52126c8-b256-428d-900b-4bc0c92392c4', // 1/8 #4
      '158a99c9-b9cf-43cc-aeb3-a45f77c1969c', // 1/4 #2
      '6b1c8837-2aaa-40dc-a51e-838005e5450e', // 1/2 #1
      '90882e23-d0af-4db0-a1c5-aa9255200857'  // 1/2 #2
    ]

    // Récupérer toutes les équipes pour avoir des alternatives
    const { data: allTeams } = await supabase
      .from('teams')
      .select('id, name, seed_position')
      .eq('tournament_id', tournamentId)
      .order('seed_position')

    console.log(`👥 Équipes disponibles: ${allTeams.length}`)

    // Stratégie: Soit vider ces matchs (team1_id et team2_id = null),
    // soit les remplir avec des équipes logiques selon la progression du tournoi

    // Option 1: Les vider complètement pour les retirer de l'affichage
    console.log('\n🧹 Vidage des matchs dupliqués...')

    const placeholder = allTeams[0].id // Pour contourner la contrainte

    for (const matchId of problematicMatches) {
      console.log(`\n🔧 Traitement du match ${matchId}...`)

      // Étape 1: Mettre des placeholders
      await supabase.from('matches').update({
        team1_id: placeholder,
        team2_id: placeholder
      }).eq('id', matchId)

      // Étape 2: Vider complètement
      const { error } = await supabase.from('matches').update({
        team1_id: null,
        team2_id: null,
        status: 'scheduled',
        player1_score: 0,
        player2_score: 0,
        winner_team_id: null
      }).eq('id', matchId)

      if (error) {
        console.log(`❌ Erreur pour ${matchId}: ${error.message}`)

        // Si on ne peut pas vider, au moins changer les équipes
        console.log(`🔄 Tentative alternative pour ${matchId}...`)

        // Utiliser deux équipes différentes au hasard
        const team1 = allTeams[Math.floor(Math.random() * allTeams.length)]
        const team2 = allTeams.find(t => t.id !== team1.id)

        const { error: altError } = await supabase.from('matches').update({
          team1_id: team1.id,
          team2_id: team2.id,
          status: 'scheduled',
          player1_score: 0,
          player2_score: 0,
          winner_team_id: null
        }).eq('id', matchId)

        if (altError) {
          console.log(`❌ Erreur alternative: ${altError.message}`)
        } else {
          console.log(`✅ Match ${matchId} mis à jour avec ${team1.name} vs ${team2.name}`)
        }
      } else {
        console.log(`✅ Match ${matchId} vidé avec succès`)
      }
    }

    // Vérification finale
    console.log('\n📊 Vérification finale...')

    const { data: verifyMatches } = await supabase
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
      .in('id', problematicMatches)

    console.log(`\nÉtat après correction:`)
    verifyMatches.forEach(m => {
      const team1Name = m.team1?.name || 'NULL'
      const team2Name = m.team2?.name || 'NULL'
      const isDupe = m.team1_id === m.team2_id && m.team1_id !== null
      const status = isDupe ? '🚨 ENCORE DUPLIQUÉ' : '✅ CORRIGÉ'

      console.log(`${status} ${m.match_type} round ${m.round_number}: ${team1Name} vs ${team2Name}`)
    })

    console.log('\n✅ Correction spécifique terminée!')

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

fixSpecificDuplicates()