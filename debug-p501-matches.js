const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tournamentId = 'c7d8a117-df73-40f9-a192-9f7bd4af033b'; // P501

async function debugP501() {
  console.log('🔍 DEBUG P501 MATCHES');

  // 1. Tous les matches
  const { data: allMatches } = await supabase
    .from('matches')
    .select(`
      id, match_type, status, winner_team_id, round_number,
      team1_id, team2_id, player1_score, player2_score
    `)
    .eq('tournament_id', tournamentId)
    .order('match_type', { ascending: true })
    .order('id', { ascending: true });

  console.log(`📋 Total matches: ${allMatches?.length}`);

  // Grouper par type
  const byType = {};
  allMatches?.forEach(m => {
    byType[m.match_type] ||= [];
    byType[m.match_type].push(m);
  });

  Object.keys(byType).forEach(type => {
    console.log(`\n🎯 ${type.toUpperCase()} (${byType[type].length} matches):`);
    byType[type].forEach((match, i) => {
      const status = match.status;
      const score = `${match.player1_score || 0}-${match.player2_score || 0}`;
      const winner = match.winner_team_id ? `(winner: ${match.winner_team_id.slice(0,8)})` : '';
      console.log(`  ${i + 1}. ${match.id.slice(0,8)} - ${status} ${score} ${winner}`);
      console.log(`      team1: ${match.team1_id?.slice(0,8)}, team2: ${match.team2_id?.slice(0,8)}`);
    });
  });

  // 2. Vérifier les équipes et leurs noms
  const { data: allTeams } = await supabase
    .from('teams')
    .select('id, name, seed_position')
    .eq('tournament_id', tournamentId)
    .order('seed_position');

  console.log(`\n👥 TOUTES LES ÉQUIPES (${allTeams?.length}):`);
  allTeams?.forEach((team, i) => {
    console.log(`  ${i + 1}. ${team.name} (ID: ${team.id.slice(0,8)}, seed: ${team.seed_position})`);
  });

  // 3. Chercher spécifiquement Scaduto/Huc
  const scadutoTeam = allTeams?.find(t => t.name?.toLowerCase().includes('scaduto'));
  if (scadutoTeam) {
    console.log(`\n🎯 ÉQUIPE SCADUTO TROUVÉE: ${scadutoTeam.name} (ID: ${scadutoTeam.id.slice(0,8)})`);

    // Chercher dans quels matches cette équipe apparaît
    const scadutoMatches = allMatches?.filter(m =>
      m.team1_id === scadutoTeam.id || m.team2_id === scadutoTeam.id
    );

    console.log(`📊 Matches avec Scaduto/Huc: ${scadutoMatches?.length}`);
    scadutoMatches?.forEach((match, i) => {
      const isTeam1 = match.team1_id === scadutoTeam.id;
      const opponentId = isTeam1 ? match.team2_id : match.team1_id;
      const opponent = allTeams?.find(t => t.id === opponentId);
      const isWinner = match.winner_team_id === scadutoTeam.id;
      const status = match.status;

      console.log(`  ${i + 1}. ${match.match_type} vs ${opponent?.name || 'Unknown'} - ${status} ${isWinner ? 'WON' : 'LOST/PENDING'}`);
    });
  } else {
    console.log(`\n❌ ÉQUIPE SCADUTO NON TROUVÉE`);
  }
}

debugP501().catch(console.error);