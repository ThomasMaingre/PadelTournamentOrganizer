// Force la correction directe des demi-finales avec les bons IDs

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function forceCorrectSemifinal() {
  console.log('⚡ Force la correction des demi-finales P501...')

  // Récupérer le tournoi P501
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', 'P501')
    .single()

  // Récupérer les demi-finales avec leurs IDs exacts
  const { data: semiMatches } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id')
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true })

  console.log('📋 IDs des demi-finales:')
  semiMatches?.forEach((match, i) => {
    console.log(`   Demi ${i+1}: ${match.id}`)
  })

  // Les 4 gagnants des quarts avec leurs IDs exacts
  const teamIds = {
    'El Sayed/Doumia': 'a5ce03ce-2d61-47f6-a0fb-9af7b32d1159',
    'Zeraia/Benziada': 'b4402f75-4d22-47d0-bb39-ad8fc33e8b83',
    'Ballochi/Mardirossian': '83039396-0beb-4e5f-b36a-e3e9a41a1dd8',
    'Maingre/Bouraoui': '799cdaba-3b52-4b79-8c18-9e2b1e7e22ac'
  }

  if (semiMatches && semiMatches.length === 2) {
    console.log('\n🔧 Correction directe...')

    // Demi 1: El Sayed/Doumia vs Zeraia/Benziada
    const update1 = await supabase
      .from('matches')
      .update({
        team1_id: teamIds['El Sayed/Doumia'],
        team2_id: teamIds['Zeraia/Benziada']
      })
      .eq('id', semiMatches[0].id)

    console.log(`✅ Demi 1 corrigée: El Sayed/Doumia vs Zeraia/Benziada`)
    console.log(`   Error:`, update1.error)

    // Demi 2: Ballochi/Mardirossian vs Maingre/Bouraoui
    const update2 = await supabase
      .from('matches')
      .update({
        team1_id: teamIds['Ballochi/Mardirossian'],
        team2_id: teamIds['Maingre/Bouraoui']
      })
      .eq('id', semiMatches[1].id)

    console.log(`✅ Demi 2 corrigée: Ballochi/Mardirossian vs Maingre/Bouraoui`)
    console.log(`   Error:`, update2.error)
  }

  // Vérification finale avec noms
  const { data: finalCheck } = await supabase
    .from('matches')
    .select(`
      id,
      team1:teams!matches_team1_id_fkey(name),
      team2:teams!matches_team2_id_fkey(name)
    `)
    .eq('tournament_id', tournament.id)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true })

  console.log('\n📊 Résultat final:')
  finalCheck?.forEach((match, i) => {
    console.log(`   Demi ${i+1}: ${match.team1?.name} vs ${match.team2?.name}`)
  })
}

forceCorrectSemifinal().catch(console.error)