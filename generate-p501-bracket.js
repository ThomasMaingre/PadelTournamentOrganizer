// Générer le bracket P501 avec la logique corrigée

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Copie de la fonction generateSeededPositions
function generateSeededPositions(teams, size) {
  const positions = new Array(size).fill(null)
  const seedPlacements = {
    2: [0, 1],
    4: [0, 3, 1, 2],
    8: [0, 7, 3, 4, 1, 6, 2, 5],
    16: [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10],
    32: [0, 31, 15, 16, 7, 24, 8, 23, 3, 28, 12, 19, 4, 27, 11, 20, 1, 30, 14, 17, 6, 25, 9, 22, 2, 29, 13, 18, 5, 26, 10, 21]
  }
  const placements = seedPlacements[size] || []
  for (let i = 0; i < Math.min(teams.length, placements.length); i++) {
    positions[placements[i]] = teams[i].id
  }
  return positions
}

function roundLabel(size) {
  const labels = {
    2: "final",
    4: "semi_final",
    8: "quarter_final",
    16: "round_of_16",
    32: "round_of_32"
  }
  return labels[size] || "round_of_16"
}

async function generateP501Bracket() {
  console.log('🎯 Génération du bracket P501...')

  // Récupérer le tournoi
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', 'P501')
    .single()

  // Récupérer les équipes avec seeding
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, seed_position')
    .eq('tournament_id', tournament.id)
    .order('seed_position', { ascending: true })

  console.log(`👥 ${teams.length} équipes trouvées`)

  // Calculer la taille du bracket
  const sizes = [2, 4, 8, 16, 32]
  const size = sizes.find(s => s >= teams.length) || teams.length

  console.log(`📏 Taille du bracket: ${size}`)

  // Générer les positions
  const positions = generateSeededPositions(teams, size)

  // Structure des rounds
  const rounds = []
  let currentSize = size
  while (currentSize >= 2) {
    const roundType = roundLabel(currentSize)
    const numMatches = currentSize / 2
    rounds.unshift({ type: roundType, numMatches, size: currentSize })
    currentSize = currentSize / 2
  }

  console.log(`🔄 ${rounds.length} rounds:`, rounds.map(r => `${r.type}(${r.numMatches})`).join(' → '))

  // Supprimer les anciens matchs
  await supabase
    .from('matches')
    .delete()
    .eq('tournament_id', tournament.id)

  // Créer les nouveaux matchs
  const allMatches = []

  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
    const round = rounds[roundIndex]

    for (let matchIndex = 0; matchIndex < round.numMatches; matchIndex++) {
      if (roundIndex === 0) {
        // Premier round : placer les équipes
        const pos1 = matchIndex * 2
        const pos2 = matchIndex * 2 + 1
        const team1 = positions[pos1] || null
        const team2 = positions[pos2] || null

        // Skip les matchs sans équipes
        if (!team1 && !team2) continue

        const match = {
          tournament_id: tournament.id,
          match_type: round.type,
          round_number: roundIndex + 1,
          status: "scheduled",
          player1_score: 0,
          player2_score: 0,
        }

        // Gestion des équipes et BYEs
        if (team1 && team2) {
          // Match normal
          match.team1_id = team1
          match.team2_id = team2
        } else if (team1 && !team2) {
          // BYE pour team1
          match.team1_id = team1
          match.team2_id = team1 // Duplique pour DB
          match.status = "completed"
          match.winner_team_id = team1
          match.player1_score = 2
        } else if (!team1 && team2) {
          // BYE pour team2
          match.team1_id = team2 // Duplique pour DB
          match.team2_id = team2
          match.status = "completed"
          match.winner_team_id = team2
          match.player2_score = 2
        }

        allMatches.push(match)
      } else {
        // Rounds suivants : placeholders
        const firstTeamId = teams[0].id
        allMatches.push({
          tournament_id: tournament.id,
          match_type: round.type,
          round_number: roundIndex + 1,
          status: "scheduled",
          player1_score: 0,
          player2_score: 0,
          team1_id: firstTeamId,
          team2_id: firstTeamId,
        })
      }
    }
  }

  // Insérer les matchs
  console.log(`📝 Insertion de ${allMatches.length} matchs...`)
  const { error } = await supabase.from('matches').insert(allMatches)
  if (error) {
    console.error('❌ Erreur insertion:', error)
    return
  }

  console.log('✅ Bracket généré avec succès!')

  // Vérification
  const { data: createdMatches } = await supabase
    .from('matches')
    .select(`
      id, match_type, team1_id, team2_id, status,
      team1:teams!matches_team1_id_fkey(name),
      team2:teams!matches_team2_id_fkey(name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'round_of_16')
    .order('id')

  console.log('\n📊 Premier round créé:')
  createdMatches?.forEach((match, i) => {
    const isDuplicate = match.team1_id === match.team2_id
    console.log(`   Match ${i+1}: ${match.team1?.name} vs ${match.team2?.name} ${isDuplicate ? '(BYE)' : ''} [${match.status}]`)
  })
}

generateP501Bracket().catch(console.error)