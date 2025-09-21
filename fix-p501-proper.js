// Fixer P501 avec le bon nombre d'équipes et le seeding

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixP501Proper() {
  console.log('🔧 Correction P501 avec 13 équipes...')

  // Récupérer le tournoi P501
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', 'P501')
    .single()

  // Récupérer les équipes
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, seed_position')
    .eq('tournament_id', tournament.id)
    .order('name', { ascending: true })

  console.log(`📋 ${teams.length} équipes trouvées`)

  // 1. Assigner le seeding si pas fait
  const needsSeeding = teams.some(t => !t.seed_position)
  if (needsSeeding) {
    console.log('🎯 Attribution du seeding...')

    for (let i = 0; i < teams.length; i++) {
      await supabase
        .from('teams')
        .update({ seed_position: i + 1 })
        .eq('id', teams[i].id)
    }

    console.log('✅ Seeding attribué')
  }

  // 2. Récupérer les équipes avec seeding
  const { data: seededTeams } = await supabase
    .from('teams')
    .select('id, name, seed_position')
    .eq('tournament_id', tournament.id)
    .order('seed_position', { ascending: true })

  console.log('🏆 Équipes avec seeding:')
  seededTeams.forEach(team => {
    console.log(`   Seed ${team.seed_position}: ${team.name}`)
  })

  // 3. Test de génération de bracket pour 13 équipes
  console.log('\n🧪 Test génération bracket 13 équipes...')

  // Bracket size = 16 (prochaine puissance de 2)
  const bracketSize = 16
  const positions = new Array(bracketSize).fill(null)

  // Placement optimisé pour 16 positions
  const seedPlacements = [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10]

  // Placer les 13 équipes
  for (let i = 0; i < Math.min(seededTeams.length, seedPlacements.length); i++) {
    positions[seedPlacements[i]] = {
      id: seededTeams[i].id,
      name: seededTeams[i].name,
      seed: seededTeams[i].seed_position
    }
  }

  console.log('\n📊 Positions dans le bracket:')
  for (let i = 0; i < positions.length; i++) {
    const team = positions[i]
    console.log(`Position ${i}: ${team ? `${team.name} (seed ${team.seed})` : 'BYE'}`)
  }

  console.log('\n🥊 Premier round (8 matchs):')
  for (let i = 0; i < 8; i++) {
    const pos1 = i * 2
    const pos2 = i * 2 + 1
    const team1 = positions[pos1]
    const team2 = positions[pos2]

    if (!team1 && !team2) {
      console.log(`   Match ${i+1}: SKIP (aucune équipe)`)
    } else if (team1 && team2) {
      console.log(`   Match ${i+1}: ${team1.name} vs ${team2.name}`)
    } else if (team1 && !team2) {
      console.log(`   Match ${i+1}: ${team1.name} (BYE)`)
    } else if (!team1 && team2) {
      console.log(`   Match ${i+1}: ${team2.name} (BYE)`)
    }
  }

  // 4. Statistiques attendues
  const normalMatches = positions.filter((p, i) => {
    if (i % 2 === 1) return false // Seulement positions paires
    const team1 = positions[i]
    const team2 = positions[i + 1]
    return team1 && team2
  }).length

  const byeMatches = positions.filter((p, i) => {
    if (i % 2 === 1) return false // Seulement positions paires
    const team1 = positions[i]
    const team2 = positions[i + 1]
    return (team1 && !team2) || (!team1 && team2)
  }).length

  console.log(`\n📈 Statistiques:`)
  console.log(`   - Équipes: ${seededTeams.length}`)
  console.log(`   - Bracket size: ${bracketSize}`)
  console.log(`   - Matchs normaux: ${normalMatches}`)
  console.log(`   - BYE: ${byeMatches}`)
  console.log(`   - Total premier round: ${normalMatches + byeMatches}`)

  return { tournament, teams: seededTeams, positions }
}

fixP501Proper().catch(console.error)