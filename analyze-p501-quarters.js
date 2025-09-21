// Analyser les quarts de finale du P501 pour comprendre pourquoi il manque une équipe

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function analyzeP501Quarters() {
  console.log('🔍 Analyse des quarts de finale P501...')

  // Récupérer le tournoi P501
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('name', 'P501')
    .single()

  if (!tournament) {
    console.log('❌ Tournoi P501 non trouvé')
    return
  }

  // Récupérer tous les matchs de quarts
  const { data: quarterMatches } = await supabase
    .from('matches')
    .select(`
      id, match_type, round_number, status, winner_team_id,
      player1_score, player2_score,
      team1_id, team2_id,
      team1:teams!matches_team1_id_fkey(id, name),
      team2:teams!matches_team2_id_fkey(id, name),
      winner:teams!matches_winner_team_id_fkey(id, name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'quarter_final')
    .order('round_number', { ascending: true })
    .order('id', { ascending: true })

  console.log(`\n📊 ${quarterMatches?.length} quarts de finale trouvés:`)

  quarterMatches?.forEach((match, i) => {
    console.log(`\n--- Quart ${i+1} (Round ${match.round_number}) ---`)
    console.log(`ID: ${match.id.slice(0,8)}`)
    console.log(`${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'}`)
    console.log(`Score: ${match.player1_score}-${match.player2_score}`)
    console.log(`Status: ${match.status}`)
    console.log(`Gagnant: ${match.winner?.name || 'Aucun'}`)
    console.log(`Winner ID: ${match.winner_team_id?.slice(0,8) || 'NULL'}`)
  })

  // Compter les matchs terminés et leurs gagnants
  const completedQuarters = quarterMatches?.filter(m => m.status === 'completed') || []
  const winners = completedQuarters.map(m => ({
    winnerId: m.winner_team_id,
    winnerName: m.winner?.name
  })).filter(w => w.winnerId)

  console.log(`\n🏆 ${completedQuarters.length} quarts terminés, ${winners.length} gagnants:`)
  winners.forEach((w, i) => {
    console.log(`   ${i+1}. ${w.winnerName} (${w.winnerId?.slice(0,8)})`)
  })

  // Vérifier s'il devrait y avoir 4 gagnants pour 2 demi-finales
  const expectedWinners = 4
  if (winners.length < expectedWinners) {
    console.log(`\n⚠️  Il manque ${expectedWinners - winners.length} gagnants pour remplir les demi-finales`)

    // Chercher les quarts qui ne sont pas terminés
    const incompleteQuarters = quarterMatches?.filter(m => m.status !== 'completed') || []
    console.log(`\n❌ ${incompleteQuarters.length} quarts non terminés:`)
    incompleteQuarters.forEach((match, i) => {
      console.log(`   ${i+1}. ${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'} (Status: ${match.status})`)
    })
  }

  // Analyser les demi-finales pour comprendre d'où viennent les équipes
  const { data: semiMatches } = await supabase
    .from('matches')
    .select(`
      id, team1_id, team2_id,
      team1:teams!matches_team1_id_fkey(id, name),
      team2:teams!matches_team2_id_fkey(id, name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true })

  console.log(`\n🔍 Équipes actuellement en demi-finales:`)
  const semiTeamIds = new Set()
  semiMatches?.forEach((match, i) => {
    console.log(`   Demi ${i+1}: ${match.team1?.name} vs ${match.team2?.name}`)
    if (match.team1_id) semiTeamIds.add(match.team1_id)
    if (match.team2_id) semiTeamIds.add(match.team2_id)
  })

  // Vérifier si les équipes en demi correspondent aux gagnants des quarts
  const winnerIds = new Set(winners.map(w => w.winnerId))
  console.log(`\n🔍 Correspondance gagnants quarts → équipes demis:`)
  Array.from(semiTeamIds).forEach(teamId => {
    const isWinner = winnerIds.has(teamId)
    const team = semiMatches?.find(m => m.team1_id === teamId || m.team2_id === teamId)
    const teamName = team?.team1_id === teamId ? team.team1?.name : team?.team2?.name
    console.log(`   ${teamName} (${teamId?.slice(0,8)}): ${isWinner ? '✅ Gagnant quart' : '❌ PAS gagnant quart'}`)
  })
}

analyzeP501Quarters().catch(console.error)