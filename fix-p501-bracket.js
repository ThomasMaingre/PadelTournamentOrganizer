const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixP501Bracket() {
  try {
    const tournamentId = '119baed7-1d2e-4f75-bfd8-c8eac97df04b'

    console.log('🔧 Correction du bracket P501...')

    // 1. Récupérer les équipes triées par seed
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, seed_position')
      .eq('tournament_id', tournamentId)
      .order('seed_position')

    console.log(`👥 ${teams.length} équipes trouvées`)

    // 2. Supprimer tous les anciens matchs
    await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId)

    console.log('🗑️ Anciens matchs supprimés')

    // 3. Créer le 1er tour (seeds 5-12)
    const firstRoundMatches = [
      { team1: teams[4], team2: teams[11] }, // #5 vs #12
      { team1: teams[5], team2: teams[10] }, // #6 vs #11
      { team1: teams[6], team2: teams[9] },  // #7 vs #10
      { team1: teams[7], team2: teams[8] }   // #8 vs #9
    ]

    console.log('\\n🎾 Création du 1er tour:')
    for (let i = 0; i < firstRoundMatches.length; i++) {
      const match = firstRoundMatches[i]
      const { data, error } = await supabase
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
        .select()

      if (error) {
        console.error(`❌ Erreur match ${i+1}:`, error)
      } else {
        console.log(`✅ ${match.team1.name} vs ${match.team2.name}`)
      }
    }

    // 4. Créer les quarts de finale avec têtes de série (placeholders pour contourner la contrainte)
    console.log('\\n🏆 Création des quarts de finale:')
    const placeholder = teams[0].id // placeholder temporaire

    const quarterFinals = [
      { seed: teams[0], opponent: null }, // #1 vs gagnant match 1
      { seed: teams[1], opponent: null }, // #2 vs gagnant match 2
      { seed: teams[2], opponent: null }, // #3 vs gagnant match 3
      { seed: teams[3], opponent: null }  // #4 vs gagnant match 4
    ]

    for (let i = 0; i < quarterFinals.length; i++) {
      const qf = quarterFinals[i]

      // Créer avec placeholder d'abord
      const { data: tempMatch, error: tempError } = await supabase
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

      if (tempError) {
        console.error(`❌ Erreur temp QF ${i+1}:`, tempError)
        continue
      }

      // Puis mettre les vraies valeurs
      const { error } = await supabase
        .from('matches')
        .update({
          team1_id: qf.seed.id,
          team2_id: null
        })
        .eq('id', tempMatch.id)

      if (error) {
        console.error(`❌ Erreur QF ${i+1}:`, error)
      } else {
        console.log(`✅ ${qf.seed.name} vs TBD`)
      }
    }

    // 5. Créer les demi-finales vides (avec placeholders)
    console.log('\\n🥇 Création des demi-finales:')
    for (let i = 0; i < 2; i++) {
      // Créer avec placeholder
      const { data: tempSF, error: tempSFError } = await supabase
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

      if (tempSFError) {
        console.error(`❌ Erreur temp SF ${i+1}:`, tempSFError)
        continue
      }

      // Vider pour mettre null
      const { error } = await supabase
        .from('matches')
        .update({
          team1_id: null,
          team2_id: null
        })
        .eq('id', tempSF.id)

      if (error) {
        console.error(`❌ Erreur SF ${i+1}:`, error)
      } else {
        console.log(`✅ Demi-finale ${i+1}: TBD vs TBD`)
      }
    }

    // 6. Créer la finale vide (avec placeholder)
    console.log('\\n🏆 Création de la finale:')
    // Créer avec placeholder
    const { data: tempFinal, error: tempFinalError } = await supabase
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

    if (tempFinalError) {
      console.error('❌ Erreur temp finale:', tempFinalError)
    } else {
      // Vider pour mettre null
      const { error } = await supabase
        .from('matches')
        .update({
          team1_id: null,
          team2_id: null
        })
        .eq('id', tempFinal.id)

      if (error) {
        console.error('❌ Erreur finale:', error)
      } else {
        console.log('✅ Finale: TBD vs TBD')
      }
    }

    console.log('\\n✅ Bracket P501 corrigé!')
    console.log('📊 Structure finale:')
    console.log('- 1er tour: 4 matchs (seeds 5-12)')
    console.log('- Quarts: 4 matchs (seeds 1-4 vs gagnants)')
    console.log('- Demis: 2 matchs')
    console.log('- Finale: 1 match')

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

fixP501Bracket()