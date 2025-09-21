const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function findKnockoutP500() {
  try {
    console.log('🔍 Recherche du tournoi P500 à élimination directe...')

    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('id, name, status')
      .ilike('name', '%P500%')

    if (error) {
      console.error('Erreur:', error)
      return
    }

    for (const tournament of tournaments) {
      console.log(`\n📋 Analyse du tournoi ${tournament.name} (${tournament.id})`)
      console.log(`Statut: ${tournament.status}`)

      const { data: matches } = await supabase
        .from('matches')
        .select('id, match_type, round_number, status, team1_id, team2_id')
        .eq('tournament_id', tournament.id)
        .order('match_type', { ascending: true })

      console.log(`${matches?.length || 0} matchs:`)

      // Grouper par type de match
      const grouped = {}
      matches?.forEach(m => {
        const key = `${m.match_type}_${m.round_number}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(m)
      })

      Object.keys(grouped).forEach(key => {
        const [type, round] = key.split('_')
        const matchList = grouped[key]
        const withTeams = matchList.filter(m => m.team1_id && m.team2_id).length
        console.log(`- ${type} round ${round}: ${matchList.length} matchs (${withTeams} avec équipes)`)
      })

      // Si on trouve un tournoi avec des matchs d'élimination, on s'arrête là
      if (matches?.some(m => ['round_of_16', 'quarter_final', 'semi_final', 'final'].includes(m.match_type))) {
        console.log(`\n✅ Tournoi à élimination trouvé: ${tournament.id}`)
        return tournament.id
      }
    }

  } catch (error) {
    console.error('Erreur générale:', error)
  }
}

findKnockoutP500()