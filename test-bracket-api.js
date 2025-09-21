// Tests complets de l'API de génération de brackets

const {
  generateTournamentBracket,
  validateBracket,
  getBracketStats
} = require('./lib/bracket-generator.ts')

// Fonction utilitaire pour créer des équipes de test
function createTestTeams(count) {
  const teams = []
  for (let i = 1; i <= count; i++) {
    teams.push({
      id: `team-${i.toString().padStart(3, '0')}`,
      name: `Équipe ${i}`,
      seed_position: i
    })
  }
  return teams
}

// Test pour un nombre spécifique d'équipes
function testTeamCount(teamCount) {
  console.log(`\n🧪 Test avec ${teamCount} équipes`)
  console.log('='.repeat(50))

  try {
    const teams = createTestTeams(teamCount)
    const bracket = generateTournamentBracket(teams, 'test-tournament')
    const errors = validateBracket(bracket, teams)
    const stats = getBracketStats(bracket, teams)

    console.log(`✅ Génération réussie`)
    console.log(`📊 Stats:`)
    console.log(`   - Équipes: ${stats.teams_count}`)
    console.log(`   - Taille bracket: ${stats.bracket_size}`)
    console.log(`   - Rounds: ${stats.total_rounds}`)
    console.log(`   - Total matchs: ${stats.total_matches}`)
    console.log(`   - Premier round: ${stats.first_round_matches} matchs`)
    console.log(`   - Matchs normaux: ${stats.normal_matches}`)
    console.log(`   - BYE: ${stats.bye_matches}`)

    if (errors.length > 0) {
      console.log(`❌ Erreurs de validation:`)
      errors.forEach(error => console.log(`   - ${error}`))
    } else {
      console.log(`✅ Validation OK`)
    }

    // Afficher le premier round en détail
    console.log(`\n🏁 Premier round:`)
    bracket[0].matches.forEach((match, i) => {
      const team1 = teams.find(t => t.id === match.team1_id)
      const team2 = teams.find(t => t.id === match.team2_id)

      if (match.team1_id === match.team2_id && match.status === 'completed') {
        console.log(`   Match ${i+1}: ${team1?.name} (BYE)`)
      } else {
        console.log(`   Match ${i+1}: ${team1?.name} vs ${team2?.name}`)
      }
    })

    return { success: true, stats, errors }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Test de tous les nombres d'équipes courants
async function runAllTests() {
  console.log('🚀 Tests complets de l\'API de génération de brackets')
  console.log('='.repeat(60))

  const testCounts = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 24, 32]
  const results = {}

  for (const count of testCounts) {
    const result = testTeamCount(count)
    results[count] = result
  }

  // Résumé des résultats
  console.log('\n📋 RÉSUMÉ DES TESTS')
  console.log('='.repeat(60))

  const successful = Object.entries(results).filter(([_, result]) => result.success)
  const failed = Object.entries(results).filter(([_, result]) => !result.success)

  console.log(`✅ Réussis: ${successful.length}/${testCounts.length}`)
  console.log(`❌ Échoués: ${failed.length}/${testCounts.length}`)

  if (failed.length > 0) {
    console.log('\n❌ Tests échoués:')
    failed.forEach(([count, result]) => {
      console.log(`   - ${count} équipes: ${result.error}`)
    })
  }

  // Tableau comparatif pour les réussis
  if (successful.length > 0) {
    console.log('\n📊 Tableau comparatif (tests réussis):')
    console.log('Équipes | Bracket | Rounds | Matchs | BYE')
    console.log('--------|---------|--------|--------|----')
    successful.forEach(([count, result]) => {
      const stats = result.stats
      console.log(`   ${count.toString().padStart(2)} | ${stats.bracket_size.toString().padStart(7)} | ${stats.total_rounds.toString().padStart(6)} | ${stats.total_matches.toString().padStart(6)} | ${stats.bye_matches.toString().padStart(3)}`)
    })
  }

  return results
}

// Exécuter les tests
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { testTeamCount, runAllTests, createTestTeams }