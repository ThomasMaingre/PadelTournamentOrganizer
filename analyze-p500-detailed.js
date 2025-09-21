const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeP500Detailed() {
  try {
    const tournamentId = 'dc61c6c4-491f-49b9-8b3b-089a7ed0dc9e'

    console.log(`🔍 Analyse détaillée du tournoi ${tournamentId}`)

    const { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at')

    if (error) {
      console.error('Erreur:', error)
      return
    }

    console.log(`\n📋 ${matches.length} matchs trouvés:`)
    matches.forEach((m, i) => {
      console.log(`${i+1}. ID: ${m.id}`)
      console.log(`   Type: "${m.match_type}", Round: ${m.round_number}`)
      console.log(`   Statut: ${m.status}`)
      console.log(`   Team1: ${m.team1_id}, Team2: ${m.team2_id}`)
      console.log(`   Scores: ${m.player1_score} - ${m.player2_score}`)
      console.log('')
    })

    // Vérifier les équipes
    console.log('\n🏆 Équipes du tournoi:')
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('tournament_id', tournamentId)

    teams?.forEach(t => {
      console.log(`- ${t.id}: ${t.name}`)
    })

  } catch (error) {
    console.error('Erreur générale:', error)
  }
}

analyzeP500Detailed()