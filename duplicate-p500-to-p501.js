const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function duplicateP500ToP501() {
  try {
    const originalTournamentId = 'd26286ae-de90-4e99-bd4c-2dff32c85dc8'

    console.log('🏆 Duplication du tournoi P500 vers P501...')

    // 1. Récupérer le tournoi original
    const { data: originalTournament } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', originalTournamentId)
      .single()

    console.log(`📋 Tournoi original: ${originalTournament.name}`)

    // 2. Créer le nouveau tournoi P501
    const { data: newTournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name: 'P501',
        description: originalTournament.description,
        format: originalTournament.format,
        status: 'registration',
        max_teams: originalTournament.max_teams,
        registration_deadline: originalTournament.registration_deadline,
        start_date: originalTournament.start_date,
        end_date: originalTournament.end_date,
        location: originalTournament.location,
        entry_fee: originalTournament.entry_fee,
        created_by: originalTournament.created_by
      })
      .select()
      .single()

    if (tournamentError) {
      console.error('❌ Erreur création tournoi:', tournamentError)
      return
    }

    const newTournamentId = newTournament.id
    console.log(`✅ Nouveau tournoi P501 créé: ${newTournamentId}`)

    // 3. Dupliquer les équipes
    const { data: originalTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', originalTournamentId)
      .order('seed_position')

    console.log(`👥 Duplication de ${originalTeams.length} équipes...`)

    const teamMapping = {}
    for (const team of originalTeams) {
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: team.name,
          tournament_id: newTournamentId,
          seed_position: team.seed_position,
          player1_name: team.player1_name,
          player2_name: team.player2_name,
          created_by: team.created_by
        })
        .select()
        .single()

      if (teamError) {
        console.error(`❌ Erreur équipe ${team.name}:`, teamError)
      } else {
        teamMapping[team.id] = newTeam.id
        console.log(`✅ ${team.name} (seed #${team.seed_position})`)
      }
    }

    // 4. Dupliquer uniquement les matchs de 1/16 sans scores
    const { data: round16Matches } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', originalTournamentId)
      .eq('match_type', 'round_of_16')
      .order('created_at')

    console.log(`🎾 Duplication de ${round16Matches.length} matchs de 1/16...`)

    for (const match of round16Matches) {
      const { error: matchError } = await supabase
        .from('matches')
        .insert({
          tournament_id: newTournamentId,
          match_type: match.match_type,
          round_number: match.round_number,
          team1_id: teamMapping[match.team1_id],
          team2_id: teamMapping[match.team2_id],
          status: 'scheduled',
          player1_score: 0,
          player2_score: 0,
          winner_team_id: null,
          set_scores: null
        })

      if (matchError) {
        console.error(`❌ Erreur match:`, matchError)
      } else {
        const team1Name = originalTeams.find(t => t.id === match.team1_id)?.name
        const team2Name = originalTeams.find(t => t.id === match.team2_id)?.name
        console.log(`✅ ${team1Name} vs ${team2Name}`)
      }
    }

    console.log(`\n🎉 P501 créé avec succès!`)
    console.log(`📊 Résumé:`)
    console.log(`- Tournoi ID: ${newTournamentId}`)
    console.log(`- Équipes: ${originalTeams.length}`)
    console.log(`- Matchs 1/16: ${round16Matches.length}`)
    console.log(`- Status: registration (sans scores)`)

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

duplicateP500ToP501()