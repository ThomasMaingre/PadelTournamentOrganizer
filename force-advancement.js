const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tournamentId = 'c7d8a117-df73-40f9-a192-9f7bd4af033b';

async function forceAdvancement() {
  console.log('🚀 FORÇAGE AVANCEMENT AUTOMATIQUE');

  // 1. Trouver tous les matches terminés qui n'ont pas avancé
  const { data: completedMatches } = await supabase
    .from('matches')
    .select('id, match_type, winner_team_id, status')
    .eq('tournament_id', tournamentId)
    .eq('status', 'completed')
    .in('match_type', ['quarter_final']);

  console.log(`📋 Matches terminés trouvés: ${completedMatches?.length}`);
  completedMatches?.forEach((match, i) => {
    console.log(`  ${i + 1}. ${match.match_type}: ${match.id.slice(0, 8)} (winner: ${match.winner_team_id?.slice(0, 8)})`);
  });

  // 2. Vérifier l'état des demi-finales
  const { data: semis } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id')
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'semi_final');

  console.log(`📊 État des demi-finales:`);
  semis?.forEach((semi, i) => {
    const t1 = semi.team1_id?.slice(0, 8) || 'NULL';
    const t2 = semi.team2_id?.slice(0, 8) || 'NULL';
    console.log(`  ${i + 1}. ${semi.id.slice(0, 8)}: ${t1} vs ${t2}`);
  });

  // 3. Trouver l'équipe TBD
  const { data: tbdTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('name', 'TBD')
    .single();

  console.log(`🔍 TBD ID: ${tbdTeam?.id?.slice(0, 8)}`);

  // 4. Placer les gagnants manquants dans les demi-finales
  for (const match of completedMatches || []) {
    if (!match.winner_team_id) continue;

    // Vérifier si cette équipe est déjà dans une demi-finale
    const alreadyInSemi = semis?.some(s =>
      s.team1_id === match.winner_team_id || s.team2_id === match.winner_team_id
    );

    if (alreadyInSemi) {
      console.log(`✅ ${match.winner_team_id.slice(0, 8)} déjà en demi-finale`);
      continue;
    }

    // Trouver un slot libre (avec TBD)
    const freeSlot = semis?.find(s =>
      s.team1_id === tbdTeam?.id || s.team2_id === tbdTeam?.id
    );

    if (freeSlot) {
      const updateField = freeSlot.team1_id === tbdTeam?.id ? 'team1_id' : 'team2_id';

      console.log(`🎯 Placement ${match.winner_team_id.slice(0, 8)} dans ${freeSlot.id.slice(0, 8)} (${updateField})`);

      const { error } = await supabase
        .from('matches')
        .update({ [updateField]: match.winner_team_id })
        .eq('id', freeSlot.id);

      if (error) {
        console.error('❌ Erreur placement:', error);
      } else {
        console.log('✅ Placement réussi!');
      }
    } else {
      console.log(`❌ Aucun slot libre pour ${match.winner_team_id.slice(0, 8)}`);
    }
  }

  console.log('🏁 Avancement forcé terminé');
}

forceAdvancement().catch(console.error);