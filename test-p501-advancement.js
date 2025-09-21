const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tournamentId = 'c7d8a117-df73-40f9-a192-9f7bd4af033b'; // P501

async function analyzeP501State() {
  console.log('🔍 ANALYSE ÉTAT P501');

  // 1. Vérifier les équipes inscrites (hors TBD)
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, seed_position')
    .eq('tournament_id', tournamentId)
    .neq('name', 'TBD')
    .order('seed_position');

  console.log(`📋 Équipes inscrites: ${teams?.length}`);
  teams?.forEach((team, i) => {
    console.log(`  ${i + 1}. ${team.name} (seed: ${team.seed_position})`);
  });

  // 2. État des matches du 1er tour
  const { data: firstRound } = await supabase
    .from('matches')
    .select(`
      id, match_type, status, winner_team_id,
      team1:team1_id(name), team2:team2_id(name)
    `)
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'round_of_16')
    .order('id');

  console.log(`\n🎾 1ER TOUR (round_of_16):`);
  firstRound?.forEach((match, i) => {
    const t1 = match.team1?.name || 'NULL';
    const t2 = match.team2?.name || 'NULL';
    const winner = match.winner_team_id ? '✅' : '❌';
    const winnerName = match.status === 'completed' ?
      (match.winner_team_id === match.team1_id ? t1 : t2) : 'N/A';
    console.log(`  ${i + 1}. ${t1} vs ${t2} - ${match.status} ${winner} (Winner: ${winnerName})`);
  });

  // 3. État des quarts de finale
  const { data: quarters } = await supabase
    .from('matches')
    .select(`
      id, match_type, status, winner_team_id,
      team1:team1_id(name), team2:team2_id(name)
    `)
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'quarter_final')
    .order('id');

  console.log(`\n🏆 QUARTS DE FINALE:`);
  quarters?.forEach((match, i) => {
    const t1 = match.team1?.name || 'NULL';
    const t2 = match.team2?.name || 'NULL';
    const winner = match.winner_team_id ? '✅' : '❌';
    const winnerName = match.status === 'completed' ?
      (match.winner_team_id === match.team1_id ? t1 : t2) : 'N/A';
    console.log(`  ${i + 1}. ${t1} vs ${t2} - ${match.status} ${winner} (Winner: ${winnerName})`);
  });

  // 4. Rechercher spécifiquement "Scaduto/Huc" dans les gagnants
  const completedFirstRound = firstRound?.filter(m => m.status === 'completed') || [];
  console.log(`\n🔍 GAGNANTS DU 1ER TOUR TERMINÉS:`);
  completedFirstRound.forEach((match, i) => {
    const winnerName = match.winner_team_id === match.team1_id ?
      match.team1?.name : match.team2?.name;
    console.log(`  ${i + 1}. ${winnerName} (ID: ${match.winner_team_id?.slice(0,8)})`);

    if (winnerName?.includes('Scaduto') || winnerName?.includes('Huc')) {
      console.log(`    🎯 TROUVÉ SCADUTO/HUC! - À placer en quarts`);
    }
  });

  // 5. Chercher TBD dans les quarts
  const { data: tbdTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('name', 'TBD')
    .single();

  console.log(`\n🔍 TBD ID: ${tbdTeam?.id?.slice(0,8)}`);

  const quarterWithTBD = quarters?.filter(q =>
    q.team1_id === tbdTeam?.id || q.team2_id === tbdTeam?.id
  );

  console.log(`📊 Quarts avec TBD disponibles: ${quarterWithTBD?.length}`);
  quarterWithTBD?.forEach((match, i) => {
    const slotInfo = match.team1_id === tbdTeam?.id ? 'team1_id' : 'team2_id';
    console.log(`  ${i + 1}. ${match.id.slice(0,8)} - slot libre: ${slotInfo}`);
  });
}

analyzeP501State().catch(console.error);