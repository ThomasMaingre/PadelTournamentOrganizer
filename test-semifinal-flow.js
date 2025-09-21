// Tester le flow des demi-finales vers la finale

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSemifinalFlow() {
  console.log('🧪 Test du flow demi-finales → finale...')

  // Récupérer le tournoi P501
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', 'P501')
    .single()

  // Récupérer les demi-finales
  const { data: semiMatches } = await supabase
    .from('matches')
    .select(`
      id, status, team1_id, team2_id,
      team1:teams!matches_team1_id_fkey(name),
      team2:teams!matches_team2_id_fkey(name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true })

  console.log('\n📊 État actuel des demi-finales:')
  semiMatches?.forEach((match, i) => {
    console.log(`   Demi ${i+1}: ${match.team1?.name} vs ${match.team2?.name} (Status: ${match.status})`)
  })

  // Simuler la fin de la première demi-finale
  if (semiMatches && semiMatches.length >= 1) {
    console.log('\n🎮 Simulation: El Sayed/Doumia gagne la demi 1...')

    const update1 = await supabase
      .from('matches')
      .update({
        status: 'completed',
        player1_score: 2,
        player2_score: 0,
        winner_team_id: semiMatches[0].team1_id
      })
      .eq('id', semiMatches[0].id)

    console.log('✅ Demi 1 terminée')
    if (update1.error) console.log('❌ Error:', update1.error)
  }

  // Simuler la fin de la deuxième demi-finale
  if (semiMatches && semiMatches.length >= 2) {
    console.log('\n🎮 Simulation: Maingre/Bouraoui gagne la demi 2...')

    const update2 = await supabase
      .from('matches')
      .update({
        status: 'completed',
        player1_score: 0,
        player2_score: 2,
        winner_team_id: semiMatches[1].team2_id
      })
      .eq('id', semiMatches[1].id)

    console.log('✅ Demi 2 terminée')
    if (update2.error) console.log('❌ Error:', update2.error)
  }

  // Vérifier si une finale a été créée automatiquement
  const { data: finalMatch } = await supabase
    .from('matches')
    .select(`
      id, status, team1_id, team2_id,
      team1:teams!matches_team1_id_fkey(name),
      team2:teams!matches_team2_id_fkey(name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'final')
    .order('id', { ascending: true })

  console.log('\n🏆 État de la finale:')
  if (finalMatch && finalMatch.length > 0) {
    finalMatch.forEach((match, i) => {
      console.log(`   Finale ${i+1}: ${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'} (Status: ${match.status})`)
    })
  } else {
    console.log('   ❌ Aucune finale trouvée')
  }

  // Vérification du flow d'avancement automatique
  console.log('\n🔍 Vérification du système d\'avancement automatique...')

  const { data: updatedSemiMatches } = await supabase
    .from('matches')
    .select(`
      id, status, winner_team_id,
      winner:teams!matches_winner_team_id_fkey(name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .eq('status', 'completed')

  console.log('🏆 Gagnants des demi-finales:')
  updatedSemiMatches?.forEach((match, i) => {
    console.log(`   Demi ${i+1}: ${match.winner?.name} (${match.winner_team_id?.slice(0,8)})`)
  })

  return {
    semiCompleted: updatedSemiMatches?.length || 0,
    finalExists: finalMatch && finalMatch.length > 0
  }
}

testSemifinalFlow().catch(console.error)