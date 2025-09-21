const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tournamentId = '119baed7-1d2e-4f75-bfd8-c8eac97df04b';

async function testLastQuarterAdvancement() {
  console.log('🧪 TEST AVANCEMENT DERNIER QUART DE FINALE');

  // 1. Vérifier l'état actuel des demi-finales
  const { data: semis } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id, match_type')
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true });

  console.log(`📊 État actuel des demi-finales:`);
  semis?.forEach((semi, i) => {
    const t1 = semi.team1_id?.slice(0, 8) || 'NULL';
    const t2 = semi.team2_id?.slice(0, 8) || 'NULL';
    console.log(`  ${i + 1}. ${semi.id.slice(0, 8)}: ${t1} vs ${t2}`);
  });

  // 2. Identifier l'équipe TBD
  const { data: tbdTeam } = await supabase
    .from('teams')
    .select('id, name')
    .eq('tournament_id', tournamentId)
    .eq('name', 'TBD')
    .single();

  console.log(`🔍 TBD team ID: ${tbdTeam?.id?.slice(0, 8)}`);

  // 3. Créer un match test avec l'équipe qui manque (799cdaba - Maingre/Bouraoui#9)
  const missingTeamId = '799cdaba-6a3d-424e-85ce-fecf0d45a58f'; // Maingre/Bouraoui#9

  console.log(`🎯 Test: Placer manuellement l'équipe manquante ${missingTeamId.slice(0, 8)}`);

  // Chercher un slot libre dans les demi-finales (avec TBD)
  const freeSlot = semis?.find(s => s.team1_id === tbdTeam?.id || s.team2_id === tbdTeam?.id);

  if (freeSlot) {
    const updateField = freeSlot.team1_id === tbdTeam?.id ? 'team1_id' : 'team2_id';
    console.log(`📝 Slot libre trouvé: ${freeSlot.id.slice(0, 8)}, field: ${updateField}`);

    const { error } = await supabase
      .from('matches')
      .update({ [updateField]: missingTeamId })
      .eq('id', freeSlot.id);

    if (error) {
      console.error('❌ Erreur placement:', error);
    } else {
      console.log('✅ Équipe manquante placée dans les demi-finales!');
    }
  } else {
    console.log('❌ Aucun slot libre trouvé dans les demi-finales');
  }

  // 4. Vérifier l'état final
  const { data: finalSemis } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id')
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'semi_final')
    .order('id', { ascending: true });

  console.log(`📊 État final des demi-finales:`);
  finalSemis?.forEach((semi, i) => {
    const t1 = semi.team1_id?.slice(0, 8) || 'NULL';
    const t2 = semi.team2_id?.slice(0, 8) || 'NULL';
    console.log(`  ${i + 1}. ${semi.id.slice(0, 8)}: ${t1} vs ${t2}`);
  });
}

testLastQuarterAdvancement().catch(console.error);