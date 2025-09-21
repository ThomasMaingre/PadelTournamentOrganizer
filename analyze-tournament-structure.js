const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeTournamentStructure() {
  try {
    const tournamentId = 'd26286ae-de90-4e99-bd4c-2dff32c85dc8'

    console.log('🔍 Analyse détaillée de la structure du tournoi...')

    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        match_type,
        round_number,
        status,
        team1_id,
        team2_id,
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

    console.log(`\n📋 Structure détaillée (${matches.length} matchs):`)

    // Grouper par type et round
    const roundTypes = ['round_of_16', 'quarter_final', 'semi_final', 'final']

    roundTypes.forEach(type => {
      const typeMatches = matches.filter(m => m.match_type === type)
      if (typeMatches.length === 0) return

      console.log(`\n🏆 ${type.toUpperCase()}:`)

      // Grouper par round_number
      const rounds = {}
      typeMatches.forEach(m => {
        if (!rounds[m.round_number]) rounds[m.round_number] = []
        rounds[m.round_number].push(m)
      })

      Object.keys(rounds).sort().forEach(roundNum => {
        const roundMatches = rounds[roundNum]
        console.log(`\n  Round ${roundNum} (${roundMatches.length} matchs):`)

        roundMatches.forEach((m, i) => {
          const team1 = m.team1?.name || 'NULL'
          const team2 = m.team2?.name || 'NULL'
          const status = m.status === 'completed' ? '✅' : '⏳'

          console.log(`    ${i+1}. ${status} ${m.id}`)
          console.log(`       Team1: ${team1} (${m.team1_id})`)
          console.log(`       Team2: ${team2} (${m.team2_id})`)
          if (m.winner_team_id) {
            console.log(`       Winner: ${m.winner_team_id}`)
          }
        })
      })
    })

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

analyzeTournamentStructure()