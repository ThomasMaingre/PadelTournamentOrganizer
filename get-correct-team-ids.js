// Récupérer les vrais IDs complets des équipes

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getCorrectTeamIds() {
  console.log('🔍 Récupération des vrais IDs des équipes...')

  // Récupérer le tournoi P501
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', 'P501')
    .single()

  // Récupérer toutes les équipes du tournoi avec leurs noms exacts
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('tournament_id', tournament.id)
    .order('name', { ascending: true })

  console.log('\n📋 Toutes les équipes du P501:')
  teams?.forEach((team, i) => {
    console.log(`   ${i+1}. ${team.name}`)
    console.log(`      ID: ${team.id}`)
  })

  // Identifier les 4 gagnants des quarts
  const targetTeams = [
    'El Sayed/Doumia',
    'Zeraia/Benziada',
    'Ballochi/Mardirossian',
    'Maingre/Bouraoui'
  ]

  console.log('\n🏆 IDs des gagnants des quarts:')
  const winnerIds = {}
  targetTeams.forEach(name => {
    const team = teams?.find(t => t.name === name)
    if (team) {
      winnerIds[name] = team.id
      console.log(`   ${name}: ${team.id}`)
    } else {
      console.log(`   ❌ ${name}: NON TROUVÉ`)
    }
  })

  // Maintenant corriger les demi-finales avec les bons IDs
  const { data: semiMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true })

  if (semiMatches && semiMatches.length === 2 && Object.keys(winnerIds).length === 4) {
    console.log('\n🔧 Correction avec les vrais IDs...')

    // Demi 1: El Sayed/Doumia vs Zeraia/Benziada
    const update1 = await supabase
      .from('matches')
      .update({
        team1_id: winnerIds['El Sayed/Doumia'],
        team2_id: winnerIds['Zeraia/Benziada']
      })
      .eq('id', semiMatches[0].id)

    console.log(`✅ Demi 1: El Sayed/Doumia vs Zeraia/Benziada`)
    if (update1.error) console.log(`   ❌ Error:`, update1.error)

    // Demi 2: Ballochi/Mardirossian vs Maingre/Bouraoui
    const update2 = await supabase
      .from('matches')
      .update({
        team1_id: winnerIds['Ballochi/Mardirossian'],
        team2_id: winnerIds['Maingre/Bouraoui']
      })
      .eq('id', semiMatches[1].id)

    console.log(`✅ Demi 2: Ballochi/Mardirossian vs Maingre/Bouraoui`)
    if (update2.error) console.log(`   ❌ Error:`, update2.error)
  }

  // Vérification finale
  const { data: finalCheck } = await supabase
    .from('matches')
    .select(`
      id,
      team1:teams!matches_team1_id_fkey(name),
      team2:teams!matches_team2_id_fkey(name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true })

  console.log('\n📊 Demi-finales finales:')
  finalCheck?.forEach((match, i) => {
    console.log(`   Demi ${i+1}: ${match.team1?.name} vs ${match.team2?.name}`)
  })

  // Vérifier l'unicité
  const uniqueTeams = new Set()
  finalCheck?.forEach(match => {
    if (match.team1) uniqueTeams.add(match.team1.name)
    if (match.team2) uniqueTeams.add(match.team2.name)
  })

  console.log(`\n🔍 Équipes uniques: ${uniqueTeams.size}/4`)
  if (uniqueTeams.size === 4) {
    console.log('✅ SUCCÈS: 4 équipes uniques en demi-finales!')
  } else {
    console.log('❌ Encore des doublons...')
  }
}

getCorrectTeamIds().catch(console.error)