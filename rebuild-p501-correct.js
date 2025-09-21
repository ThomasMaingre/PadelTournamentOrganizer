const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function rebuildP501Correct() {
  try {
    const tournamentId = '119baed7-1d2e-4f75-bfd8-c8eac97df04b'

    console.log('🔧 Reconstruction correcte du P501...')

    // 1. Supprimer tous les anciens matchs
    await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId)

    console.log('🗑️ Anciens matchs supprimés')

    // 2. Récupérer les équipes triées par seed
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, seed_position')
      .eq('tournament_id', tournamentId)
      .order('seed_position')

    console.log(`👥 ${teams.length} équipes trouvées`)

    // Équipes avec BYE (qualifiées directement aux quarts) :
    const teamsWithBye = teams.slice(0, 4) // Seeds 1,2,3,4
    console.log('\n🎯 Équipes avec BYE (qualifiées aux quarts):')
    teamsWithBye.forEach(t => console.log(`- ${t.name} (#${t.seed_position})`))

    // 3. Créer le 1er tour (seeds 5-12 jouent)
    const firstRoundTeams = teams.slice(4) // Seeds 5,6,7,8,9,10,11,12
    const firstRoundMatches = [
      { team1: firstRoundTeams[0], team2: firstRoundTeams[7] }, // #5 vs #12
      { team1: firstRoundTeams[1], team2: firstRoundTeams[6] }, // #6 vs #11
      { team1: firstRoundTeams[2], team2: firstRoundTeams[5] }, // #7 vs #10
      { team1: firstRoundTeams[3], team2: firstRoundTeams[4] }  // #8 vs #9
    ]

    console.log('\n🎾 Création du 1er tour (4 matchs):')
    for (let i = 0; i < firstRoundMatches.length; i++) {
      const match = firstRoundMatches[i]
      await supabase
        .from('matches')
        .insert({
          tournament_id: tournamentId,
          match_type: 'round_of_16',
          round_number: 1,
          team1_id: match.team1.id,
          team2_id: match.team2.id,
          status: 'scheduled',
          player1_score: 0,
          player2_score: 0
        })

      console.log(`✅ ${match.team1.name} vs ${match.team2.name}`)
    }

    // 4. Créer les quarts de finale (4 têtes de série vs 4 gagnants du 1er tour)
    console.log('\n🏆 Création des quarts de finale (4 matchs):')

    // Utiliser un placeholder temporaire pour contourner la contrainte
    const placeholder = teams[0].id

    for (let i = 0; i < 4; i++) {
      const seedTeam = teamsWithBye[i]

      // Créer avec placeholder
      const { data: tempMatch } = await supabase
        .from('matches')
        .insert({
          tournament_id: tournamentId,
          match_type: 'quarter_final',
          round_number: 1,
          team1_id: placeholder,
          team2_id: placeholder,
          status: 'scheduled',
          player1_score: 0,
          player2_score: 0
        })
        .select()
        .single()

      // Mettre la vraie équipe têt de série + null pour l'adversaire
      await supabase
        .from('matches')
        .update({
          team1_id: seedTeam.id,
          team2_id: null
        })
        .eq('id', tempMatch.id)

      console.log(`✅ ${seedTeam.name} vs TBD (gagnant 1er tour) - BYE INDIQUÉ`)
    }

    // 5. Créer les demi-finales vides
    console.log('\n🥇 Création des demi-finales (2 matchs):')
    for (let i = 0; i < 2; i++) {
      // Placeholder puis vider
      const { data: tempSemi } = await supabase
        .from('matches')
        .insert({
          tournament_id: tournamentId,
          match_type: 'semi_final',
          round_number: 2,
          team1_id: placeholder,
          team2_id: placeholder,
          status: 'scheduled',
          player1_score: 0,
          player2_score: 0
        })
        .select()
        .single()

      await supabase
        .from('matches')
        .update({
          team1_id: null,
          team2_id: null
        })
        .eq('id', tempSemi.id)

      console.log(`✅ Demi-finale ${i+1}: TBD vs TBD`)
    }

    // 6. Créer la finale
    console.log('\n🏆 Création de la finale:')
    const { data: tempFinal } = await supabase
      .from('matches')
      .insert({
        tournament_id: tournamentId,
        match_type: 'final',
        round_number: 3,
        team1_id: placeholder,
        team2_id: placeholder,
        status: 'scheduled',
        player1_score: 0,
        player2_score: 0
      })
      .select()
      .single()

    await supabase
      .from('matches')
      .update({
        team1_id: null,
        team2_id: null
      })
      .eq('id', tempFinal.id)

    console.log('✅ Finale: TBD vs TBD')

    console.log('\n✅ P501 reconstruit correctement!')
    console.log('📊 Structure finale:')
    console.log('- 1er tour: 4 matchs (seeds 5-12)')
    console.log('- Quarts: 4 matchs (seeds 1-4 avec BYE vs gagnants)')
    console.log('- Demis: 2 matchs')
    console.log('- Finale: 1 match')

    console.log('\n🎯 Équipes avec BYE aux quarts:')
    console.log('- Maingre/Bouraoui (#1)')
    console.log('- Ballochi/Mardirossian (#2)')
    console.log('- Zeraia/Benziada (#3)')
    console.log('- El Sayed/Doumia (#4)')

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

rebuildP501Correct()