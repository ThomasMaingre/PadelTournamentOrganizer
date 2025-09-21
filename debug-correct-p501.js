const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tournamentId = '119baed7-1d2e-4f75-bfd8-c8eac97df04b'; // CORRECT P501

async function debugCorrectP501() {
  console.log('🔍 DEBUG CORRECT P501 - 119baed7');

  // 1. Chercher spécifiquement Scaduto/Huc
  const { data: allTeams } = await supabase
    .from('teams')
    .select('id, name, seed_position')
    .eq('tournament_id', tournamentId)
    .order('seed_position');

  console.log(`👥 TOUTES LES ÉQUIPES (${allTeams?.length}):`);
  allTeams?.forEach((team, i) => {
    console.log(`  ${i + 1}. ${team.name} (ID: ${team.id.slice(0,8)}, seed: ${team.seed_position})`);
  });

  const scadutoTeam = allTeams?.find(t => t.name?.toLowerCase().includes('scaduto'));
  if (scadutoTeam) {
    console.log(`\n🎯 ÉQUIPE SCADUTO TROUVÉE: ${scadutoTeam.name} (ID: ${scadutoTeam.id.slice(0,8)})`);
  } else {
    console.log(`\n❌ ÉQUIPE SCADUTO NON TROUVÉE`);
    return;
  }

  // 2. Tous les matches
  const { data: allMatches } = await supabase
    .from('matches')
    .select(`
      id, match_type, status, winner_team_id, round_number,
      team1_id, team2_id, player1_score, player2_score
    `)
    .eq('tournament_id', tournamentId)
    .order('match_type', { ascending: true })
    .order('id', { ascending: true });

  console.log(`\n📋 Total matches: ${allMatches?.length}`);

  // 3. Matches avec Scaduto/Huc
  const scadutoMatches = allMatches?.filter(m =>
    m.team1_id === scadutoTeam.id || m.team2_id === scadutoTeam.id
  );

  console.log(`\n📊 Matches avec Scaduto/Huc: ${scadutoMatches?.length}`);
  scadutoMatches?.forEach((match, i) => {
    const isTeam1 = match.team1_id === scadutoTeam.id;
    const opponentId = isTeam1 ? match.team2_id : match.team1_id;
    const opponent = allTeams?.find(t => t.id === opponentId);
    const isWinner = match.winner_team_id === scadutoTeam.id;
    const status = match.status;
    const score = `${match.player1_score || 0}-${match.player2_score || 0}`;

    console.log(`  ${i + 1}. ${match.match_type} vs ${opponent?.name || 'Unknown'} - ${status} ${score} ${isWinner ? '🏆 WON' : '❌ LOST/PENDING'}`);
    console.log(`      Match ID: ${match.id.slice(0,8)}`);
  });

  // 4. État des quarts de finale
  const quarters = allMatches?.filter(m => m.match_type === 'quarter_final');
  console.log(`\n🏆 QUARTS DE FINALE (${quarters?.length}):`);
  quarters?.forEach((match, i) => {
    const team1 = allTeams?.find(t => t.id === match.team1_id);
    const team2 = allTeams?.find(t => t.id === match.team2_id);
    const winner = match.winner_team_id ? '✅' : '❌';
    const winnerName = match.status === 'completed' ?
      (match.winner_team_id === match.team1_id ? team1?.name : team2?.name) : 'N/A';

    console.log(`  ${i + 1}. ${team1?.name || 'NULL'} vs ${team2?.name || 'NULL'} - ${match.status} ${winner}`);
    console.log(`      Winner: ${winnerName}, Match ID: ${match.id.slice(0,8)}`);
  });

  // 5. Chercher TBD disponibles dans les quarts
  const tbdTeam = allTeams?.find(t => t.name === 'TBD');
  if (tbdTeam) {
    console.log(`\n🔍 TBD ID: ${tbdTeam.id.slice(0,8)}`);

    const quarterWithTBD = quarters?.filter(q =>
      q.team1_id === tbdTeam.id || q.team2_id === tbdTeam.id
    );

    console.log(`📊 Quarts avec TBD disponibles: ${quarterWithTBD?.length}`);
    quarterWithTBD?.forEach((match, i) => {
      const slotInfo = match.team1_id === tbdTeam.id ? 'team1_id' : 'team2_id';
      console.log(`  ${i + 1}. ${match.id.slice(0,8)} - slot libre: ${slotInfo}`);
    });
  }
}

debugCorrectP501().catch(console.error);