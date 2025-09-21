// Corriger le problème: Zeraia/Benziada manque en demi-finale

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixMissingTeamInSemifinal() {
  console.log('🔧 Correction de l\'équipe manquante en demi-finale...')

  // Récupérer le tournoi P501
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('name', 'P501')
    .single()

  // Les 4 gagnants des quarts (dans l'ordre logique)
  const quarterWinners = [
    { id: 'a5ce03ce', name: 'El Sayed/Doumia' },
    { id: 'b4402f75', name: 'Zeraia/Benziada' },      // MANQUANT en demi !
    { id: '83039396', name: 'Ballochi/Mardirossian' },
    { id: '799cdaba', name: 'Maingre/Bouraoui' }
  ]

  console.log('📋 Gagnants des quarts:')
  quarterWinners.forEach((w, i) => {
    console.log(`   ${i+1}. ${w.name} (${w.id.slice(0,8)})`)
  })

  // Récupérer les demi-finales
  const { data: semiMatches } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id')
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true })

  console.log('\n📊 Demi-finales actuelles:')
  semiMatches?.forEach((match, i) => {
    console.log(`   Demi ${i+1}: ${match.team1_id?.slice(0,8)} vs ${match.team2_id?.slice(0,8)}`)
  })

  // Correction: répartir équitablement les 4 gagnants sur 2 demi-finales
  if (semiMatches && semiMatches.length === 2) {
    console.log('\n✅ Redistribution correcte des 4 équipes sur 2 demi-finales...')

    // Demi 1: El Sayed/Doumia vs Zeraia/Benziada
    await supabase
      .from('matches')
      .update({
        team1_id: quarterWinners[0].id, // El Sayed/Doumia
        team2_id: quarterWinners[1].id  // Zeraia/Benziada
      })
      .eq('id', semiMatches[0].id)

    console.log(`   Demi 1: ${quarterWinners[0].name} vs ${quarterWinners[1].name}`)

    // Demi 2: Ballochi/Mardirossian vs Maingre/Bouraoui
    await supabase
      .from('matches')
      .update({
        team1_id: quarterWinners[2].id, // Ballochi/Mardirossian
        team2_id: quarterWinners[3].id  // Maingre/Bouraoui
      })
      .eq('id', semiMatches[1].id)

    console.log(`   Demi 2: ${quarterWinners[2].name} vs ${quarterWinners[3].name}`)

    console.log('\n✅ Correction terminée!')
  }

  // Vérification finale
  const { data: updatedSemiMatches } = await supabase
    .from('matches')
    .select(`
      id, team1_id, team2_id,
      team1:teams!matches_team1_id_fkey(id, name),
      team2:teams!matches_team2_id_fkey(id, name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true })

  console.log('\n📊 Demi-finales corrigées:')
  updatedSemiMatches?.forEach((match, i) => {
    console.log(`   Demi ${i+1}: ${match.team1?.name} vs ${match.team2?.name}`)
  })

  // Vérifier que les 4 équipes sont maintenant uniques
  const uniqueTeams = new Set()
  updatedSemiMatches?.forEach(match => {
    if (match.team1_id) uniqueTeams.add(match.team1_id)
    if (match.team2_id) uniqueTeams.add(match.team2_id)
  })

  console.log(`\n🔍 Équipes uniques en demi-finales: ${uniqueTeams.size}/4`)
  if (uniqueTeams.size === 4) {
    console.log('✅ Problème résolu: 4 équipes uniques en demi-finales!')
  } else {
    console.log('❌ Problème persistant: équipes dupliquées')
  }
}

fixMissingTeamInSemifinal().catch(console.error)