const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function findCorrectP500() {
  try {
    console.log('🔍 Recherche du bon tournoi P500 avec les bonnes équipes...')

    // Chercher tous les tournois P500
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('id, name, status')
      .ilike('name', '%P500%')

    if (error) {
      console.error('Erreur:', error)
      return
    }

    console.log(`${tournaments.length} tournois P500 trouvés`)

    for (const tournament of tournaments) {
      console.log(`\n📋 Analyse du tournoi ${tournament.id}`)

      // Vérifier les équipes pour identifier le bon tournoi
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, seed_position')
        .eq('tournament_id', tournament.id)
        .order('seed_position', { ascending: true, nullsLast: true })

      console.log(`Équipes (${teams?.length || 0}):`)
      teams?.forEach(t => {
        console.log(`- ${t.name} (seed: ${t.seed_position})`)
      })

      // Chercher les équipes caractéristiques mentionnées
      const hasMonster = teams?.some(t => t.name?.includes('Monster'))
      const hasBelzunce = teams?.some(t => t.name?.includes('Belzunce'))
      const hasGibilaro = teams?.some(t => t.name?.includes('Gibilaro'))

      if (hasMonster || hasBelzunce || hasGibilaro) {
        console.log(`\n✅ TOURNOI CIBLE TROUVÉ: ${tournament.id}`)
        console.log(`Nom: ${tournament.name}, Statut: ${tournament.status}`)

        // Analyser la structure des matchs
        const { data: matches } = await supabase
          .from('matches')
          .select('id, match_type, round_number, status, team1_id, team2_id')
          .eq('tournament_id', tournament.id)
          .order('match_type, round_number')

        console.log(`\n📋 Structure des matchs (${matches?.length || 0}):`)
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

        return tournament.id
      }
    }

    console.log('\n❌ Aucun tournoi P500 correspondant trouvé')
    return null

  } catch (error) {
    console.error('Erreur générale:', error)
  }
}

findCorrectP500()