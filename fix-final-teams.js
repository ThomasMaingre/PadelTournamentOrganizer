// Corriger les équipes de la finale

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixFinalTeams() {
  console.log('🔧 Correction des équipes de la finale...')

  // Récupérer le tournoi P501
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', 'P501')
    .single()

  // Récupérer les gagnants des demi-finales
  const { data: semiWinners } = await supabase
    .from('matches')
    .select(`
      id, winner_team_id,
      winner:teams!matches_winner_team_id_fkey(name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .eq('status', 'completed')
    .order('id', { ascending: true })

  console.log('🏆 Gagnants des demi-finales:')
  semiWinners?.forEach((match, i) => {
    console.log(`   Demi ${i+1}: ${match.winner?.name} (${match.winner_team_id?.slice(0,8)})`)
  })

  // Récupérer la finale
  const { data: finalMatch } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id')
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'final')
    .single()

  if (finalMatch && semiWinners && semiWinners.length === 2) {
    console.log('\n🔧 Correction de la finale...')

    const update = await supabase
      .from('matches')
      .update({
        team1_id: semiWinners[0].winner_team_id,
        team2_id: semiWinners[1].winner_team_id
      })
      .eq('id', finalMatch.id)

    console.log('✅ Finale corrigée')
    if (update.error) console.log('❌ Error:', update.error)
  }

  // Vérification finale
  const { data: updatedFinal } = await supabase
    .from('matches')
    .select(`
      id, status,
      team1:teams!matches_team1_id_fkey(name),
      team2:teams!matches_team2_id_fkey(name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'final')
    .single()

  console.log('\n🏆 Finale corrigée:')
  console.log(`   ${updatedFinal?.team1?.name} vs ${updatedFinal?.team2?.name} (Status: ${updatedFinal?.status})`)

  // Vérifier l'unicité
  if (updatedFinal?.team1?.name !== updatedFinal?.team2?.name) {
    console.log('✅ SUCCÈS: Finale correctement configurée avec 2 équipes différentes!')
  } else {
    console.log('❌ Problème: Encore des équipes dupliquées en finale')
  }
}

fixFinalTeams().catch(console.error)