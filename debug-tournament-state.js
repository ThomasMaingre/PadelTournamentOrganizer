const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugTournamentState() {
  try {
    const tournamentId = 'd26286ae-de90-4e99-bd4c-2dff32c85dc8'

    console.log('🔍 DEBUG: État détaillé de tous les matchs...\n')

    // Récupérer TOUS les matchs avec détails complets
    const { data: allMatches, error } = await supabase
      .from('matches')
      .select(`
        id,
        match_type,
        round_number,
        status,
        team1_id,
        team2_id,
        winner_team_id,
        player1_score,
        player2_score,
        created_at,
        team1:teams!matches_team1_id_fkey(id, name, seed_position),
        team2:teams!matches_team2_id_fkey(id, name, seed_position)
      `)
      .eq('tournament_id', tournamentId)
      .order('match_type, round_number, created_at')

    if (error) {
      console.error('❌ Erreur récupération matchs:', error)
      return
    }

    console.log(`📊 TOTAL: ${allMatches.length} matchs trouvés\n`)

    // Grouper par round pour analyse
    const rounds = [
      { type: 'round_of_16', round: 1, label: '1/16 de finale' },
      { type: 'quarter_final', round: 1, label: '1/8 de finale' },
      { type: 'quarter_final', round: 2, label: '1/4 de finale' },
      { type: 'semi_final', round: 3, label: '1/2 finale' },
      { type: 'final', round: 4, label: 'Finale' }
    ]

    let duplicateCount = 0
    let nullTeamCount = 0

    rounds.forEach(roundInfo => {
      const roundMatches = allMatches.filter(m =>
        m.match_type === roundInfo.type &&
        m.round_number === roundInfo.round
      )

      if (roundMatches.length === 0) return

      console.log(`🏆 ${roundInfo.label} (${roundMatches.length} matchs):`)

      roundMatches.forEach((match, i) => {
        const team1Name = match.team1?.name || 'NULL'
        const team2Name = match.team2?.name || 'NULL'
        const team1Id = match.team1_id || 'NULL'
        const team2Id = match.team2_id || 'NULL'

        // Détecter les problèmes
        const isDuplicate = team1Id === team2Id && team1Id !== 'NULL'
        const hasNullTeam = team1Id === 'NULL' || team2Id === 'NULL'

        if (isDuplicate) duplicateCount++
        if (hasNullTeam) nullTeamCount++

        const status = isDuplicate ? '🚨 DUPLIQUÉ' : hasNullTeam ? '⚠️  NULL' : '✅ OK'

        console.log(`  ${i+1}. ${status} ${match.id}`)
        console.log(`     Team1: ${team1Name} (${team1Id})`)
        console.log(`     Team2: ${team2Name} (${team2Id})`)
        console.log(`     Status: ${match.status}, Score: ${match.player1_score}-${match.player2_score}`)

        if (isDuplicate) {
          console.log(`     ❌ PROBLÈME: Même équipe des deux côtés!`)
        }
        if (hasNullTeam) {
          console.log(`     ⚠️  PROBLÈME: Équipe(s) manquante(s)`)
        }
        console.log('')
      })
    })

    console.log(`\n📈 RÉSUMÉ DES PROBLÈMES:`)
    console.log(`- Matchs avec équipes dupliquées: ${duplicateCount}`)
    console.log(`- Matchs avec équipes NULL: ${nullTeamCount}`)
    console.log(`- Matchs corrects: ${allMatches.length - duplicateCount - nullTeamCount}`)

    // Analyser la contrainte problématique
    console.log(`\n🔒 ANALYSE DE LA CONTRAINTE:`)
    const problematicMatches = allMatches.filter(m =>
      (m.team1_id === m.team2_id && m.team1_id !== null) ||
      m.team1_id === null ||
      m.team2_id === null
    )

    console.log(`Matchs affectés par contraintes: ${problematicMatches.length}`)
    problematicMatches.forEach(m => {
      console.log(`- ${m.id}: team1=${m.team1_id}, team2=${m.team2_id}`)
    })

    // Vérifier si les données en DB correspondent à l'affichage
    console.log(`\n🎯 FOCUS SUR LES MATCHS PROBLÉMATIQUES VISIBLES:`)

    // Les matchs visibles dans l'interface qui sont dupliqués
    const visible1_8_duplicates = allMatches.filter(m =>
      m.match_type === 'quarter_final' &&
      m.round_number === 1 &&
      m.team1_id === m.team2_id &&
      m.team1?.name === 'Maingre/Bouraoui'
    )

    console.log(`Matchs 1/8 "Maingre vs Maingre": ${visible1_8_duplicates.length}`)
    visible1_8_duplicates.forEach(m => {
      console.log(`- ID: ${m.id}, Créé: ${m.created_at}`)
    })

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

debugTournamentState()