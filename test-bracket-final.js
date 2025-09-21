// Tests complets de l'API - Version corrigée

// API de génération de brackets
function getNextPowerOfTwo(num) {
  const powers = [2, 4, 8, 16, 32]
  return powers.find(p => p >= num) || 32
}

function getRoundType(size) {
  switch (size) {
    case 2: return 'final'
    case 4: return 'semi_final'
    case 8: return 'quarter_final'
    case 16: return 'round_of_16'
    case 32: return 'round_of_32'
    default: return 'round_of_16'
  }
}

function generateSeededPositions(teams, bracketSize) {
  const positions = new Array(bracketSize).fill(null)

  const seedPlacements = {
    2: [0, 1],
    4: [0, 3, 1, 2],
    8: [0, 7, 3, 4, 1, 6, 2, 5],
    16: [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10],
    32: [
      0, 31, 15, 16, 7, 24, 8, 23, 3, 28, 12, 19, 4, 27, 11, 20,
      1, 30, 14, 17, 6, 25, 9, 22, 2, 29, 13, 18, 5, 26, 10, 21
    ]
  }

  const placements = seedPlacements[bracketSize] || []

  for (let i = 0; i < Math.min(teams.length, placements.length); i++) {
    positions[placements[i]] = teams[i].id
  }

  return positions
}

function generateRounds(bracketSize) {
  const rounds = []
  let currentSize = bracketSize
  let roundNumber = 1

  while (currentSize >= 2) {
    const roundType = getRoundType(currentSize)
    const numMatches = currentSize / 2

    rounds.push({
      type: roundType,
      round_number: roundNumber,
      num_matches: numMatches
    })

    currentSize = currentSize / 2
    roundNumber++
  }

  return rounds
}

function createMatch(tournamentId, roundInfo, team1Id, team2Id, teams) {
  const match = {
    tournament_id: tournamentId,
    match_type: roundInfo.type,
    round_number: roundInfo.round_number,
    status: 'scheduled',
    team1_id: null,
    team2_id: null,
    player1_score: 0,
    player2_score: 0
  }

  if (team1Id && team2Id) {
    match.team1_id = team1Id
    match.team2_id = team2Id
  } else if (team1Id && !team2Id) {
    match.team1_id = team1Id
    match.team2_id = team1Id
    match.status = 'completed'
    match.winner_team_id = team1Id
    match.player1_score = 2
  } else if (!team1Id && team2Id) {
    match.team1_id = team2Id
    match.team2_id = team2Id
    match.status = 'completed'
    match.winner_team_id = team2Id
    match.player2_score = 2
  } else {
    return null
  }

  return match
}

function generateTournamentBracket(teams, tournamentId) {
  if (teams.length < 2) {
    throw new Error('Au moins 2 équipes requises')
  }

  if (teams.length > 32) {
    throw new Error('Maximum 32 équipes supportées')
  }

  const sortedTeams = [...teams].sort((a, b) => a.seed_position - b.seed_position)
  const bracketSize = getNextPowerOfTwo(teams.length)
  const positions = generateSeededPositions(sortedTeams, bracketSize)
  const rounds = generateRounds(bracketSize)

  const bracketRounds = []

  for (const roundInfo of rounds) {
    const roundMatches = []

    if (roundInfo.round_number === 1) {
      for (let i = 0; i < roundInfo.num_matches; i++) {
        const pos1 = i * 2
        const pos2 = i * 2 + 1

        const team1Id = positions[pos1]
        const team2Id = positions[pos2]

        const match = createMatch(tournamentId, roundInfo, team1Id, team2Id, sortedTeams)
        if (match) {
          roundMatches.push(match)
        }
      }
    } else {
      const placeholderTeamId = sortedTeams[0]?.id || null

      for (let i = 0; i < roundInfo.num_matches; i++) {
        if (placeholderTeamId) {
          roundMatches.push({
            tournament_id: tournamentId,
            match_type: roundInfo.type,
            round_number: roundInfo.round_number,
            status: 'scheduled',
            team1_id: placeholderTeamId,
            team2_id: placeholderTeamId,
            player1_score: 0,
            player2_score: 0
          })
        }
      }
    }

    bracketRounds.push({
      type: roundInfo.type,
      round_number: roundInfo.round_number,
      matches: roundMatches
    })
  }

  return bracketRounds
}

function validateBracket(bracket, teams) {
  const errors = []

  if (bracket.length === 0) {
    errors.push('Bracket vide')
    return errors
  }

  const firstRound = bracket[0]
  const teamsInBracket = new Set()

  firstRound.matches.forEach(match => {
    if (match.team1_id && match.team1_id !== match.team2_id) {
      teamsInBracket.add(match.team1_id)
    }
    if (match.team2_id && match.team1_id !== match.team2_id) {
      teamsInBracket.add(match.team2_id)
    }
    if (match.team1_id === match.team2_id && match.status === 'completed') {
      teamsInBracket.add(match.team1_id)
    }
  })

  teams.forEach(team => {
    if (!teamsInBracket.has(team.id)) {
      errors.push('Équipe ' + team.name + ' absente du bracket')
    }
  })

  return errors
}

function getBracketStats(bracket, teams) {
  const totalMatches = bracket.reduce((sum, round) => sum + round.matches.length, 0)
  const byeMatches = bracket[0]?.matches.filter(m => m.team1_id === m.team2_id && m.status === 'completed').length || 0
  const normalMatches = bracket[0]?.matches.filter(m => m.team1_id !== m.team2_id).length || 0

  return {
    teams_count: teams.length,
    bracket_size: getNextPowerOfTwo(teams.length),
    total_rounds: bracket.length,
    total_matches: totalMatches,
    first_round_matches: bracket[0]?.matches.length || 0,
    bye_matches: byeMatches,
    normal_matches: normalMatches
  }
}

// Tests
function createTestTeams(count) {
  const teams = []
  for (let i = 1; i <= count; i++) {
    teams.push({
      id: 'team-' + i.toString().padStart(3, '0'),
      name: 'Équipe ' + i,
      seed_position: i
    })
  }
  return teams
}

function testTeamCount(teamCount) {
  console.log('\n🧪 Test avec ' + teamCount + ' équipes')
  console.log('='.repeat(50))

  try {
    const teams = createTestTeams(teamCount)
    const bracket = generateTournamentBracket(teams, 'test-tournament')
    const errors = validateBracket(bracket, teams)
    const stats = getBracketStats(bracket, teams)

    console.log('✅ Génération réussie')
    console.log('📊 Stats:')
    console.log('   - Équipes: ' + stats.teams_count)
    console.log('   - Taille bracket: ' + stats.bracket_size)
    console.log('   - Rounds: ' + stats.total_rounds)
    console.log('   - Total matchs: ' + stats.total_matches)
    console.log('   - Premier round: ' + stats.first_round_matches + ' matchs')
    console.log('   - Matchs normaux: ' + stats.normal_matches)
    console.log('   - BYE: ' + stats.bye_matches)

    if (errors.length > 0) {
      console.log('❌ Erreurs de validation:')
      errors.forEach(error => console.log('   - ' + error))
    } else {
      console.log('✅ Validation OK')
    }

    console.log('\n🏁 Premier round:')
    bracket[0].matches.forEach((match, i) => {
      const team1 = teams.find(t => t.id === match.team1_id)
      const team2 = teams.find(t => t.id === match.team2_id)

      if (match.team1_id === match.team2_id && match.status === 'completed') {
        console.log('   Match ' + (i+1) + ': ' + (team1?.name || 'Unknown') + ' (BYE)')
      } else {
        console.log('   Match ' + (i+1) + ': ' + (team1?.name || 'Unknown') + ' vs ' + (team2?.name || 'Unknown'))
      }
    })

    return { success: true, stats, errors }

  } catch (error) {
    console.log('❌ Erreur: ' + error.message)
    return { success: false, error: error.message }
  }
}

function runAllTests() {
  console.log('🚀 Tests complets de l\'API de génération de brackets')
  console.log('='.repeat(60))

  const testCounts = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 24, 32]
  const results = {}

  for (const count of testCounts) {
    const result = testTeamCount(count)
    results[count] = result
  }

  console.log('\n📋 RÉSUMÉ DES TESTS')
  console.log('='.repeat(60))

  const successful = Object.entries(results).filter(([_, result]) => result.success)
  const failed = Object.entries(results).filter(([_, result]) => !result.success)

  console.log('✅ Réussis: ' + successful.length + '/' + testCounts.length)
  console.log('❌ Échoués: ' + failed.length + '/' + testCounts.length)

  if (failed.length > 0) {
    console.log('\n❌ Tests échoués:')
    failed.forEach(([count, result]) => {
      console.log('   - ' + count + ' équipes: ' + result.error)
    })
  }

  if (successful.length > 0) {
    console.log('\n📊 Tableau comparatif (tests réussis):')
    console.log('Équipes | Bracket | Rounds | Matchs | BYE')
    console.log('--------|---------|--------|--------|----')
    successful.forEach(([count, result]) => {
      const stats = result.stats
      const line = '   ' + count.toString().padStart(2) +
                   ' | ' + stats.bracket_size.toString().padStart(7) +
                   ' | ' + stats.total_rounds.toString().padStart(6) +
                   ' | ' + stats.total_matches.toString().padStart(6) +
                   ' | ' + stats.bye_matches.toString().padStart(3)
      console.log(line)
    })
  }

  return results
}

// Test spécifique pour 12 équipes comme P501
console.log('🎯 TEST SPÉCIFIQUE P501 (12 équipes)')
const p501Result = testTeamCount(12)

console.log('\n' + '='.repeat(60))
runAllTests()

module.exports = {
  generateTournamentBracket,
  validateBracket,
  getBracketStats
}