// Fix complet P501 - Bracket correct pour 13 équipes

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixP501Complete() {
  console.log('🔧 FIX COMPLET P501 - 13 équipes dans bracket 16');
  console.log('='.repeat(60));

  const { data: tournament } = await supabase.from('tournaments').select('id').eq('name', 'P501').single();

  // 1. Supprimer TOUS les matchs
  await supabase.from('matches').delete().eq('tournament_id', tournament.id);
  console.log('✅ Tous les matchs supprimés');

  // 2. Récupérer les équipes triées par seed
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, seed_position')
    .eq('tournament_id', tournament.id)
    .order('seed_position');

  console.log(`📋 ${teams.length} équipes avec seeding:`);
  teams.forEach(team => {
    console.log(`   Seed ${team.seed_position}: ${team.name}`);
  });

  // 3. Génération bracket correct pour 13 équipes
  // Bracket 16 positions avec seeding optimal
  const positions = new Array(16).fill(null);
  const seedPlacements = [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];

  // Placer les 13 équipes selon le seeding
  for (let i = 0; i < Math.min(teams.length, 13); i++) {
    positions[seedPlacements[i]] = teams[i];
  }

  console.log('\n📊 Positions dans le bracket 16:');
  for (let i = 0; i < 16; i++) {
    const team = positions[i];
    console.log(`Position ${i}: ${team ? `${team.name} (seed ${team.seed_position})` : 'BYE'}`);
  }

  // 4. Créer TOUS les matchs avec la structure correcte
  const matches = [];

  // 4A. PREMIER TOUR (round_of_16) - 8 matchs
  console.log('\n🥊 PREMIER TOUR (8 matchs):');
  for (let i = 0; i < 8; i++) {
    const pos1 = i * 2;
    const pos2 = i * 2 + 1;
    const team1 = positions[pos1];
    const team2 = positions[pos2];

    let match;
    if (team1 && team2) {
      // Match normal
      match = {
        tournament_id: tournament.id,
        match_type: 'round_of_16',
        round_number: 1,
        status: 'scheduled',
        team1_id: team1.id,
        team2_id: team2.id,
        player1_score: 0,
        player2_score: 0
      };
      console.log(`   Match ${i+1}: ${team1.name} vs ${team2.name}`);
    } else if (team1 && !team2) {
      // BYE pour team1
      match = {
        tournament_id: tournament.id,
        match_type: 'round_of_16',
        round_number: 1,
        status: 'completed',
        team1_id: team1.id,
        team2_id: team1.id,
        player1_score: 2,
        player2_score: 0,
        winner_team_id: team1.id
      };
      console.log(`   Match ${i+1}: ${team1.name} (BYE)`);
    } else if (!team1 && team2) {
      // BYE pour team2
      match = {
        tournament_id: tournament.id,
        match_type: 'round_of_16',
        round_number: 1,
        status: 'completed',
        team1_id: team2.id,
        team2_id: team2.id,
        player1_score: 0,
        player2_score: 2,
        winner_team_id: team2.id
      };
      console.log(`   Match ${i+1}: ${team2.name} (BYE)`);
    }

    if (match) matches.push(match);
  }

  // 4B. QUARTS DE FINALE - 4 matchs avec placeholders
  console.log('\n🏆 QUARTS DE FINALE (4 matchs avec placeholders):');
  const firstTeamId = teams[0].id; // Placeholder pour contrainte DB
  for (let i = 0; i < 4; i++) {
    matches.push({
      tournament_id: tournament.id,
      match_type: 'quarter_final',
      round_number: 2,
      status: 'scheduled',
      team1_id: firstTeamId,
      team2_id: firstTeamId,
      player1_score: 0,
      player2_score: 0
    });
    console.log(`   QF${i+1}: Placeholder (sera remplacé par les gagnants)`);
  }

  // 4C. DEMI-FINALES - 2 matchs avec placeholders
  console.log('\n🥈 DEMI-FINALES (2 matchs avec placeholders):');
  for (let i = 0; i < 2; i++) {
    matches.push({
      tournament_id: tournament.id,
      match_type: 'semi_final',
      round_number: 3,
      status: 'scheduled',
      team1_id: firstTeamId,
      team2_id: firstTeamId,
      player1_score: 0,
      player2_score: 0
    });
    console.log(`   SF${i+1}: Placeholder (sera remplacé par les gagnants)`);
  }

  // 4D. FINALE - 1 match avec placeholder
  console.log('\n🥇 FINALE (1 match avec placeholder):');
  matches.push({
    tournament_id: tournament.id,
    match_type: 'final',
    round_number: 4,
    status: 'scheduled',
    team1_id: firstTeamId,
    team2_id: firstTeamId,
    player1_score: 0,
    player2_score: 0
  });
  console.log(`   F1: Placeholder (sera remplacé par les gagnants)`);

  // 5. Insérer TOUS les matchs
  console.log(`\n📝 Insertion de ${matches.length} matchs...`);
  const { error } = await supabase.from('matches').insert(matches);

  if (error) {
    console.error('❌ Erreur insertion:', error.message);
    throw error;
  }

  // 6. Vérification finale
  const { data: inserted } = await supabase
    .from('matches')
    .select('match_type')
    .eq('tournament_id', tournament.id);

  const byType = {};
  inserted.forEach(m => {
    byType[m.match_type] = (byType[m.match_type] || 0) + 1;
  });

  console.log('\n✅ BRACKET CRÉÉ AVEC SUCCÈS:');
  console.log(`   - Premier tour: ${byType['round_of_16'] || 0} matchs`);
  console.log(`   - Quarts: ${byType['quarter_final'] || 0} matchs`);
  console.log(`   - Demis: ${byType['semi_final'] || 0} matchs`);
  console.log(`   - Finale: ${byType['final'] || 0} matchs`);
  console.log(`   - TOTAL: ${inserted.length} matchs`);

  console.log('\n🎉 P501 BRACKET CORRECT GÉNÉRÉ!');
  return true;
}

fixP501Complete().catch(console.error);