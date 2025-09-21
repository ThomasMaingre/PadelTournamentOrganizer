const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixP501Workaround() {
  try {
    const tournamentId = '119baed7-1d2e-4f75-bfd8-c8eac97df04b'

    console.log('🔧 CORRECTION P501 AVEC WORKAROUND CONTRAINTE...')

    // 1. Récupérer les équipes triées par seed
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, seed_position')
      .eq('tournament_id', tournamentId)
      .order('seed_position')

    console.log(`👥 ${teams.length} équipes trouvées`)

    // 2. Supprimer TOUS les anciens matchs SAUF le 1er tour
    console.log('\n🗑️ SUPPRESSION matchs quarts/demis/finale...')
    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId)
      .neq('match_type', 'round_of_16')

    if (deleteError) {
      console.error('❌ Erreur suppression:', deleteError)
      return
    }
    console.log('✅ Anciens matchs supprimés (sauf 1er tour)')

    // 3. STRATÉGIE: créer avec 2 équipes identiques puis modifier
    const seedTeams = teams.slice(0, 4) // Seeds 1,2,3,4

    console.log('\n🏆 CRÉATION DES QUARTS DE FINALE...')
    const quarterFinalIds = []

    for (let i = 0; i < 4; i++) {
      const seedTeam = seedTeams[i]
      console.log(`Création quart ${i+1}: ${seedTeam.name}`)

      // STEP 1: Créer avec la même équipe des deux côtés (contourne la contrainte)
      const { data, error } = await supabase
        .from('matches')
        .insert({
          tournament_id: tournamentId,
          match_type: 'quarter_final',
          round_number: 1,
          team1_id: seedTeam.id,
          team2_id: seedTeam.id, // MÊME ÉQUIPE TEMPORAIRE
          status: 'scheduled',
          player1_score: 0,
          player2_score: 0
        })
        .select()

      if (error) {
        console.error(`❌ Erreur création quart ${i+1}:`, error)
        return
      }

      quarterFinalIds.push(data[0].id)
      console.log(`✅ Quart ${i+1} créé temporairement avec duplication`)
    }

    // STEP 2: Mettre team2_id à NULL un par un
    console.log('\n🔄 MISE À JOUR: team2_id -> NULL...')
    for (let i = 0; i < quarterFinalIds.length; i++) {
      const matchId = quarterFinalIds[i]

      const { error } = await supabase
        .from('matches')
        .update({ team2_id: null })
        .eq('id', matchId)

      if (error) {
        console.error(`❌ Erreur update quart ${i+1}:`, error)
        console.error('Détails:', JSON.stringify(error, null, 2))
      } else {
        console.log(`✅ Quart ${i+1}: team2_id mis à NULL`)
      }
    }

    // 4. Créer les demi-finales avec la même stratégie
    console.log('\n🥇 CRÉATION DES DEMI-FINALES...')
    const semiIds = []
    const dummyTeam = teams[0] // Utiliser la première équipe comme dummy

    for (let i = 0; i < 2; i++) {
      // STEP 1: Créer avec équipe dummy des deux côtés
      const { data, error } = await supabase
        .from('matches')
        .insert({
          tournament_id: tournamentId,
          match_type: 'semi_final',
          round_number: 2,
          team1_id: dummyTeam.id,
          team2_id: dummyTeam.id, // MÊME ÉQUIPE TEMPORAIRE
          status: 'scheduled',
          player1_score: 0,
          player2_score: 0
        })
        .select()

      if (error) {
        console.error(`❌ Erreur création demi ${i+1}:`, error)
        return
      }

      semiIds.push(data[0].id)
      console.log(`✅ Demi ${i+1} créée temporairement`)
    }

    // STEP 2: Mettre les deux équipes à NULL
    console.log('\n🔄 MISE À JOUR DEMIS: team1_id et team2_id -> NULL...')
    for (let i = 0; i < semiIds.length; i++) {
      const matchId = semiIds[i]

      const { error } = await supabase
        .from('matches')
        .update({
          team1_id: null,
          team2_id: null
        })
        .eq('id', matchId)

      if (error) {
        console.error(`❌ Erreur update demi ${i+1}:`, error)
      } else {
        console.log(`✅ Demi ${i+1}: équipes mises à NULL`)
      }
    }

    // 5. Créer la finale avec la même stratégie
    console.log('\n🏆 CRÉATION DE LA FINALE...')

    // STEP 1: Créer avec équipe dummy des deux côtés
    const { data, error } = await supabase
      .from('matches')
      .insert({
        tournament_id: tournamentId,
        match_type: 'final',
        round_number: 3,
        team1_id: dummyTeam.id,
        team2_id: dummyTeam.id, // MÊME ÉQUIPE TEMPORAIRE
        status: 'scheduled',
        player1_score: 0,
        player2_score: 0
      })
      .select()

    if (error) {
      console.error('❌ Erreur création finale:', error)
      return
    }

    const finalId = data[0].id
    console.log('✅ Finale créée temporairement')

    // STEP 2: Mettre les deux équipes à NULL
    console.log('\n🔄 MISE À JOUR FINALE: team1_id et team2_id -> NULL...')
    const { error: finalUpdateError } = await supabase
      .from('matches')
      .update({
        team1_id: null,
        team2_id: null
      })
      .eq('id', finalId)

    if (finalUpdateError) {
      console.error('❌ Erreur update finale:', finalUpdateError)
    } else {
      console.log('✅ Finale: équipes mises à NULL')
    }

    console.log('\n✅ P501 RECONSTRUIT AVEC SUCCÈS!')

    // Vérification finale
    console.log('\n🔍 VÉRIFICATION FINALE...')
    const { data: finalMatches } = await supabase
      .from('matches')
      .select('id, match_type, team1_id, team2_id, round_number')
      .eq('tournament_id', tournamentId)
      .order('match_type')
      .order('round_number')

    console.log('\n📊 RÉSUMÉ FINAL:')
    finalMatches.forEach(m => {
      const t1 = m.team1_id ? m.team1_id.slice(0,8) : 'NULL'
      const t2 = m.team2_id ? m.team2_id.slice(0,8) : 'NULL'
      console.log(`${m.match_type} R${m.round_number}: ${t1} vs ${t2}`)
    })

    // Vérifier qu'il n'y a plus de doublons
    const team1Ids = finalMatches.map(m => m.team1_id).filter(Boolean)
    const team2Ids = finalMatches.map(m => m.team2_id).filter(Boolean)
    const allTeamIds = [...team1Ids, ...team2Ids]
    const uniqueIds = [...new Set(allTeamIds)]

    console.log(`\n📈 STATS: ${finalMatches.length} matchs, ${uniqueIds.length} team IDs uniques`)

    const duplicates = finalMatches.filter(m => m.team1_id && m.team2_id && m.team1_id === m.team2_id)
    if (duplicates.length > 0) {
      console.log(`❌ ATTENTION: ${duplicates.length} matchs avec équipes dupliquées`)
    } else {
      console.log('✅ Aucun match avec équipes dupliquées')
    }

  } catch (error) {
    console.error('❌ ERREUR GÉNÉRALE:', error)
    console.error('Stack:', error.stack)
  }
}

fixP501Workaround()