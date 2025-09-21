const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyP500Final() {
  try {
    const tournamentId = 'd26286ae-de90-4e99-bd4c-2dff32c85dc8'

    console.log('🔍 Vérification finale du tournoi P500...')

    // Récupérer tous les matchs avec les équipes
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        match_type,
        round_number,
        status,
        player1_score,
        player2_score,
        winner_team_id,
        team1:teams!matches_team1_id_fkey ( id, name ),
        team2:teams!matches_team2_id_fkey ( id, name )
      `)
      .eq('tournament_id', tournamentId)
      .order('match_type, round_number, created_at')

    if (error) {
      console.error('Erreur:', error)
      return
    }

    console.log(`\n📋 Structure complète du tournoi (${matches.length} matchs):`)

    // Grouper par type et round
    const rounds = [
      { type: 'round_of_16', label: '1/16 de finale' },
      { type: 'quarter_final', round: 1, label: '1/8 de finale' },
      { type: 'quarter_final', round: 2, label: '1/4 de finale' },
      { type: 'semi_final', label: '1/2 finale' },
      { type: 'final', label: 'Finale' }
    ]

    rounds.forEach(round => {
      const roundMatches = matches.filter(m =>
        m.match_type === round.type &&
        (!round.round || m.round_number === round.round)
      )

      console.log(`\n🏆 ${round.label} (${roundMatches.length} matchs):`)

      roundMatches.forEach((m, i) => {
        const team1Name = m.team1?.name || 'TBD'
        const team2Name = m.team2?.name || 'TBD'
        const score = m.status === 'completed' ? `${m.player1_score}-${m.player2_score}` : 'Programmé'
        const status = m.status === 'completed' ? '✅' : '⏳'

        console.log(`  ${i+1}. ${status} ${team1Name} vs ${team2Name} (${score})`)

        if (m.status === 'completed' && m.winner_team_id) {
          const winnerName = m.winner_team_id === m.team1?.id ? team1Name : team2Name
          console.log(`     🏅 Gagnant: ${winnerName}`)
        }
      })
    })

    // Vérifier le champion
    const finalMatch = matches.find(m => m.match_type === 'final')
    if (finalMatch && finalMatch.status === 'completed') {
      const championName = finalMatch.winner_team_id === finalMatch.team1?.id
        ? finalMatch.team1?.name
        : finalMatch.team2?.name

      console.log(`\n🏆🎉 CHAMPION DU TOURNOI P500: ${championName} 🎉🏆`)
    }

    // Statistiques
    const completedMatches = matches.filter(m => m.status === 'completed').length
    const totalMatches = matches.length

    console.log(`\n📊 Statistiques:`)
    console.log(`- Matchs joués: ${completedMatches}/${totalMatches}`)
    console.log(`- Progression: ${Math.round(completedMatches/totalMatches*100)}%`)

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

verifyP500Final()