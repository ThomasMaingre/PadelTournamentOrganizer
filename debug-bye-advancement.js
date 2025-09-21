const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tournamentId = '119baed7-1d2e-4f75-bfd8-c8eac97df04b';

async function debugByeAdvancement() {
  console.log('🔍 DEBUG BYE ADVANCEMENT');

  // 1. Chercher tous les BYE matches terminés du 1er tour
  const { data: allFirstRound } = await supabase
    .from('matches')
    .select(`
      id, status, winner_team_id, team1_id, team2_id,
      team1:team1_id(name), team2:team2_id(name)
    `)
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'round_of_16')
    .eq('status', 'completed');

  console.log(`\n🎾 MATCHES 1ER TOUR TERMINÉS (${allFirstRound?.length}):`);

  const byeMatches = [];
  const normalMatches = [];

  allFirstRound?.forEach((match, i) => {
    const t1 = match.team1?.name || 'NULL';
    const t2 = match.team2?.name || 'NULL';
    const isBye = t1 === 'BYE' || t2 === 'BYE' || match.team1_id === match.team2_id;
    const winnerName = match.winner_team_id === match.team1_id ? t1 : t2;

    console.log(`  ${i + 1}. ${t1} vs ${t2} - Winner: ${winnerName} ${isBye ? '(BYE)' : '(NORMAL)'}`);

    if (isBye) {
      byeMatches.push({...match, winnerName});
    } else {
      normalMatches.push({...match, winnerName});
    }
  });

  console.log(`\n📊 RÉPARTITION:`);
  console.log(`  - BYE matches terminés: ${byeMatches.length}`);
  console.log(`  - Matches normaux terminés: ${normalMatches.length}`);

  // 2. Vérifier si ces gagnants sont dans les quarts
  const { data: quarters } = await supabase
    .from('matches')
    .select(`
      id, team1_id, team2_id,
      team1:team1_id(name), team2:team2_id(name)
    `)
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'quarter_final');

  console.log(`\n🏆 ÉTAT DES QUARTS:`);
  quarters?.forEach((q, i) => {
    const t1 = q.team1?.name || 'NULL';
    const t2 = q.team2?.name || 'NULL';
    console.log(`  ${i + 1}. ${t1} vs ${t2}`);
  });

  // 3. Vérifier quels gagnants BYE manquent dans les quarts
  console.log(`\n❌ GAGNANTS BYE MANQUANTS DANS LES QUARTS:`);
  byeMatches.forEach((bye) => {
    const isInQuarters = quarters?.some(q =>
      q.team1_id === bye.winner_team_id || q.team2_id === bye.winner_team_id
    );

    if (!isInQuarters) {
      console.log(`  - ${bye.winnerName} (${bye.winner_team_id.slice(0,8)}) PAS DANS LES QUARTS !`);
    } else {
      console.log(`  ✅ ${bye.winnerName} est bien dans les quarts`);
    }
  });

  // 4. Vérifier quels gagnants normaux manquent dans les quarts
  console.log(`\n❌ GAGNANTS NORMAUX MANQUANTS DANS LES QUARTS:`);
  normalMatches.forEach((normal) => {
    const isInQuarters = quarters?.some(q =>
      q.team1_id === normal.winner_team_id || q.team2_id === normal.winner_team_id
    );

    if (!isInQuarters) {
      console.log(`  - ${normal.winnerName} (${normal.winner_team_id.slice(0,8)}) PAS DANS LES QUARTS !`);
    } else {
      console.log(`  ✅ ${normal.winnerName} est bien dans les quarts`);
    }
  });

  // 5. Chercher les TBD restants dans les quarts
  const { data: tbdTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('name', 'TBD')
    .single();

  const quartersWithTBD = quarters?.filter(q =>
    q.team1_id === tbdTeam?.id || q.team2_id === tbdTeam?.id
  );

  console.log(`\n🔍 SLOTS TBD DISPONIBLES DANS LES QUARTS: ${quartersWithTBD?.length}`);
  quartersWithTBD?.forEach((q, i) => {
    const slot = q.team1_id === tbdTeam?.id ? 'team1_id' : 'team2_id';
    console.log(`  ${i + 1}. Match ${q.id.slice(0,8)} - slot libre: ${slot}`);
  });
}

debugByeAdvancement().catch(console.error);