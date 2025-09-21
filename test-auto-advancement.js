const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tournamentId = '119baed7-1d2e-4f75-bfd8-c8eac97df04b';

async function testAutoAdvancement() {
  console.log('🧪 TEST AVANCEMENT AUTOMATIQUE');

  // 1. Lister tous les matches du premier tour
  const { data: firstRoundMatches } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id, status, match_type, round_number')
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'round_of_16')
    .order('id', { ascending: true });

  console.log(`📋 Premier tour - ${firstRoundMatches?.length} matches trouvés:`);
  firstRoundMatches?.forEach((match, i) => {
    const t1 = match.team1_id?.slice(0, 8) || 'NULL';
    const t2 = match.team2_id?.slice(0, 8) || 'NULL';
    console.log(`  ${i + 1}. ${match.id.slice(0, 8)}: ${t1} vs ${t2} (${match.status})`);
  });

  // 2. Prendre le premier match qui n'est pas terminé
  const unfinishedMatch = firstRoundMatches?.find(m => m.status !== 'completed');

  if (!unfinishedMatch) {
    console.log('❌ Aucun match non-terminé trouvé');
    return;
  }

  console.log(`🎯 Test sur le match: ${unfinishedMatch.id.slice(0, 8)}`);

  // 3. Simuler la complétion du match (équipe 1 gagne)
  console.log('⚽ Simulation: équipe 1 gagne 2-0');

  const { error: updateError } = await supabase
    .from('matches')
    .update({
      status: 'completed',
      player1_score: 2,
      player2_score: 0,
      winner_team_id: unfinishedMatch.team1_id
    })
    .eq('id', unfinishedMatch.id);

  if (updateError) {
    console.error('❌ Erreur mise à jour match:', updateError);
    return;
  }

  console.log('✅ Match marqué comme terminé');
  console.log('🔄 L\'avancement automatique devrait se déclencher...');

  // 4. Attendre un peu puis vérifier l'état des quarts
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { data: quarters } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id, match_type')
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'quarter_final')
    .order('id', { ascending: true });

  console.log(`📊 État des quarts après avancement:`);
  quarters?.forEach((q, i) => {
    const t1 = q.team1_id?.slice(0, 8) || 'NULL';
    const t2 = q.team2_id?.slice(0, 8) || 'NULL';
    console.log(`  ${i + 1}. ${q.id.slice(0, 8)}: ${t1} vs ${t2}`);
  });
}

// Exécuter le test
testAutoAdvancement().catch(console.error);