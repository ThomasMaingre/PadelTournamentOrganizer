const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tournamentId = '119baed7-1d2e-4f75-bfd8-c8eac97df04b';

async function verifyP501Fix() {
  console.log('🔍 VÉRIFICATION P501 - PLACEMENT SCADUTO/HUC');

  // 1. État des quarts de finale
  const { data: quarters } = await supabase
    .from('matches')
    .select(`
      id, match_type, status, winner_team_id,
      team1:team1_id(name), team2:team2_id(name)
    `)
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'quarter_final')
    .order('id');

  console.log(`🏆 QUARTS DE FINALE (${quarters?.length}):`);
  quarters?.forEach((match, i) => {
    const t1 = match.team1?.name || 'NULL';
    const t2 = match.team2?.name || 'NULL';
    const winner = match.winner_team_id ? '✅' : '❌';
    const status = match.status;

    console.log(`  ${i + 1}. ${t1} vs ${t2} - ${status} ${winner}`);

    if (t1?.includes('Scaduto') || t2?.includes('Scaduto')) {
      console.log(`    🎯 SCADUTO/HUC TROUVÉ DANS LES QUARTS !`);
    }
  });

  // 2. Vérifier qu'il n'y a plus de TBD dans les quarts
  const quartersWithTBD = quarters?.filter(q =>
    q.team1?.name === 'TBD' || q.team2?.name === 'TBD'
  ).length || 0;

  console.log(`\n📊 Quarts avec TBD restants: ${quartersWithTBD}`);

  if (quartersWithTBD === 0) {
    console.log(`✅ SUCCÈS: Tous les slots TBD des quarts sont remplis !`);
  } else {
    console.log(`⚠️  Il reste encore des slots TBD non remplis`);
  }

  // 3. Chercher tous les gagnants du 1er tour
  const { data: firstRoundMatches } = await supabase
    .from('matches')
    .select(`
      id, status, winner_team_id,
      team1:team1_id(name), team2:team2_id(name)
    `)
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'round_of_16')
    .eq('status', 'completed');

  console.log(`\n🎾 GAGNANTS DU 1ER TOUR:`);
  firstRoundMatches?.forEach((match, i) => {
    const winnerName = match.winner_team_id === match.team1_id ?
      match.team1?.name : match.team2?.name;
    console.log(`  ${i + 1}. ${winnerName}`);
  });

  console.log(`\n📈 RÉSUMÉ:`);
  console.log(`  - Matches 1er tour terminés: ${firstRoundMatches?.length}`);
  console.log(`  - Quarts avec TBD restants: ${quartersWithTBD}`);
  console.log(`  - Scaduto/Huc dans les quarts: ${quarters?.some(q =>
    q.team1?.name?.includes('Scaduto') || q.team2?.name?.includes('Scaduto')
  ) ? 'OUI ✅' : 'NON ❌'}`);
}

verifyP501Fix().catch(console.error);