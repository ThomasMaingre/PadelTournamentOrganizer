const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function findP500Tournament() {
  try {
    console.log('🔍 Recherche du tournoi P500...')

    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('id, name, status')
      .ilike('name', '%P500%')

    if (error) {
      console.error('Erreur:', error)
      return
    }

    console.log('Tournois trouvés:')
    tournaments.forEach(t => {
      console.log(`- ID: ${t.id}, Nom: ${t.name}, Statut: ${t.status}`)
    })

    if (tournaments.length > 0) {
      const p500 = tournaments[0]
      console.log(`\n📋 Analyse du tournoi ${p500.name} (${p500.id})`)

      const { data: matches } = await supabase
        .from('matches')
        .select('id, match_type, round_number, status, team1_id, team2_id')
        .eq('tournament_id', p500.id)
        .order('created_at')

      console.log(`${matches?.length || 0} matchs trouvés:`)
      matches?.forEach(m => {
        console.log(`- ${m.match_type} round ${m.round_number}: ${m.status} (teams: ${m.team1_id ? '✓' : '✗'}, ${m.team2_id ? '✓' : '✗'})`)
      })
    }

  } catch (error) {
    console.error('Erreur générale:', error)
  }
}

findP500Tournament()