const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tournamentId = '119baed7-1d2e-4f75-bfd8-c8eac97df04b';

async function fixP501Final() {
  console.log('🚀 CORRECTION P501 - PLACEMENT SCADUTO/HUC');

  // 1. Trouver l'équipe Scaduto/Huc
  const { data: scadutoTeam } = await supabase
    .from('teams')
    .select('id, name')
    .eq('tournament_id', tournamentId)
    .ilike('name', '%scaduto%')
    .single();

  if (!scadutoTeam) {
    console.log('❌ Équipe Scaduto non trouvée');
    return;
  }

  console.log(`🎯 Équipe trouvée: ${scadutoTeam.name} (${scadutoTeam.id.slice(0,8)})`);

  // 2. Vérifier qu'elle a bien gagné son match du 1er tour
  const { data: firstRoundMatch } = await supabase
    .from('matches')
    .select('id, status, winner_team_id, match_type')
    .eq('tournament_id', tournamentId)
    .or(`team1_id.eq.${scadutoTeam.id},team2_id.eq.${scadutoTeam.id}`)
    .eq('match_type', 'round_of_16')
    .single();

  if (!firstRoundMatch || firstRoundMatch.status !== 'completed' || firstRoundMatch.winner_team_id !== scadutoTeam.id) {
    console.log('❌ Scaduto/Huc n\'a pas gagné son match du 1er tour');
    return;
  }

  console.log(`✅ Match du 1er tour gagné: ${firstRoundMatch.id.slice(0,8)}`);

  // 3. Chercher un quart de finale libre (avec TBD)
  const { data: tbdTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('name', 'TBD')
    .single();

  console.log(`🔍 TBD ID: ${tbdTeam?.id?.slice(0,8)}`);

  const { data: freeQuarter } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id')
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'quarter_final')
    .or(`team1_id.eq.${tbdTeam.id},team2_id.eq.${tbdTeam.id}`)
    .limit(1)
    .single();

  if (!freeQuarter) {
    console.log('❌ Aucun quart de finale libre trouvé');
    return;
  }

  console.log(`🎯 Quart libre trouvé: ${freeQuarter.id.slice(0,8)}`);
  console.log(`   team1: ${freeQuarter.team1_id?.slice(0,8)}, team2: ${freeQuarter.team2_id?.slice(0,8)}`);

  // 4. Déterminer quel champ mettre à jour
  const updateField = freeQuarter.team1_id === tbdTeam.id ? 'team1_id' : 'team2_id';
  console.log(`📝 Champ à mettre à jour: ${updateField}`);

  // 5. Placer Scaduto/Huc dans le quart libre
  const { error } = await supabase
    .from('matches')
    .update({ [updateField]: scadutoTeam.id })
    .eq('id', freeQuarter.id);

  if (error) {
    console.error('❌ Erreur placement:', error);
    return;
  }

  console.log('✅ Scaduto/Huc placé avec succès dans les quarts de finale !');

  // 6. Vérification finale
  const { data: updatedQuarter } = await supabase
    .from('matches')
    .select(`
      id, team1_id, team2_id,
      team1:team1_id(name), team2:team2_id(name)
    `)
    .eq('id', freeQuarter.id)
    .single();

  console.log(`📊 État final du quart:`);
  console.log(`   ${updatedQuarter.team1?.name} vs ${updatedQuarter.team2?.name}`);
}

fixP501Final().catch(console.error);