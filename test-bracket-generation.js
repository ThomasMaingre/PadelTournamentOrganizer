// Test de la génération du bracket P501

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testBracketGeneration() {
  console.log('🧪 Test de la génération du bracket P501...')

  // Récupérer le tournoi P501
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('name', 'P501')
    .single()

  if (!tournament) {
    console.log('❌ Tournoi P501 non trouvé')
    return
  }

  console.log(`📋 Tournoi: ${tournament.name} (${tournament.id.slice(0,8)})`)

  // Récupérer les équipes avec leurs seed_position
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, seed_position')
    .eq('tournament_id', tournament.id)
    .order('seed_position', { ascending: true, nullsLast: true })

  console.log(`\n👥 ${teams?.length} équipes trouvées:`)
  teams?.forEach((team, i) => {
    console.log(`   ${i+1}. ${team.name} (seed: ${team.seed_position || 'null'})`)
  })

  // Test du seeding si pas fait
  if (teams?.some(t => !t.seed_position)) {
    console.log('\n🎯 Calcul du seeding d\'abord...')

    // Simuler le calcul de seeding
    const seedingUpdates = teams.map((team, index) => ({
      id: team.id,
      seed_position: index + 1
    }))

    for (const update of seedingUpdates) {
      await supabase
        .from('teams')
        .update({ seed_position: update.seed_position })
        .eq('id', update.id)
    }

    console.log('✅ Seeding calculé')
  }

  // Récupérer les équipes avec le seeding
  const { data: seededTeams } = await supabase
    .from('teams')
    .select('id, name, seed_position')
    .eq('tournament_id', tournament.id)
    .order('seed_position', { ascending: true })

  console.log(`\n🏆 Équipes avec seeding:`)
  seededTeams?.forEach((team, i) => {
    console.log(`   Seed ${team.seed_position}: ${team.name} (${team.id.slice(0,8)})`)
  })

  return { tournament, teams: seededTeams }
}

testBracketGeneration().catch(console.error)