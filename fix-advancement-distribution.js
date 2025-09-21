// Script pour corriger la logique de distribution des équipes en demi-finales
// Le problème: tous les gagnants de quarts vont dans la même demi-finale

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixSemiFinalDistribution() {
  console.log('🔧 Correction de la distribution des demi-finales...')

  // Analyser le tournoi P501
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('name', 'P501')
    .single()

  if (!tournament) {
    console.log('❌ Tournoi P501 non trouvé')
    return
  }

  console.log(`📋 Tournoi trouvé: ${tournament.name} (${tournament.id.slice(0,8)})`)

  // Récupérer toutes les demi-finales
  const { data: semiMatches } = await supabase
    .from('matches')
    .select(`
      id, team1_id, team2_id, match_type, status,
      team1:teams!matches_team1_id_fkey(id, name),
      team2:teams!matches_team2_id_fkey(id, name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true })

  console.log('\n📊 État actuel des demi-finales:')
  semiMatches?.forEach((match, i) => {
    console.log(`   Demi ${i+1}: ${match.team1?.name || 'NULL'} vs ${match.team2?.name || 'NULL'}`)
    console.log(`     - Team1 ID: ${match.team1_id?.slice(0,8) || 'NULL'}`)
    console.log(`     - Team2 ID: ${match.team2_id?.slice(0,8) || 'NULL'}`)
  })

  // Identifier les équipes uniques en demi-finales
  const uniqueTeams = new Set()
  semiMatches?.forEach(match => {
    if (match.team1_id) uniqueTeams.add(match.team1_id)
    if (match.team2_id) uniqueTeams.add(match.team2_id)
  })

  console.log(`\n🔍 Équipes uniques en demi: ${uniqueTeams.size}`)
  const teams = Array.from(uniqueTeams)

  // Si on a exactement 4 équipes uniques, redistribuer équitablement
  if (teams.length === 4 && semiMatches?.length === 2) {
    console.log('✅ Redistribution des 4 équipes sur 2 demi-finales...')

    // Demi 1: équipes 0 et 1
    // Demi 2: équipes 2 et 3
    await supabase
      .from('matches')
      .update({
        team1_id: teams[0],
        team2_id: teams[1]
      })
      .eq('id', semiMatches[0].id)

    await supabase
      .from('matches')
      .update({
        team1_id: teams[2],
        team2_id: teams[3]
      })
      .eq('id', semiMatches[1].id)

    console.log('✅ Redistribution terminée!')
  } else {
    console.log(`⚠️  Configuration non standard: ${teams.length} équipes, ${semiMatches?.length} demi-finales`)
  }

  // Vérification finale
  const { data: updatedSemiMatches } = await supabase
    .from('matches')
    .select(`
      id, team1_id, team2_id, match_type, status,
      team1:teams!matches_team1_id_fkey(id, name),
      team2:teams!matches_team2_id_fkey(id, name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true })

  console.log('\n📊 État après correction:')
  updatedSemiMatches?.forEach((match, i) => {
    console.log(`   Demi ${i+1}: ${match.team1?.name || 'NULL'} vs ${match.team2?.name || 'NULL'}`)
  })
}

fixSemiFinalDistribution().catch(console.error)