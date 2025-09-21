const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tournamentId = '119baed7-1d2e-4f75-bfd8-c8eac97df04b';

async function fixMissingTeam() {
  console.log('🚀 CORRECTION ÉQUIPE MANQUANTE');

  // 1. Trouver Celui/Levrai
  const { data: celuiTeam } = await supabase
    .from('teams')
    .select('id, name, seed_position')
    .eq('tournament_id', tournamentId)
    .ilike('name', '%celui%')
    .single();

  if (!celuiTeam) {
    console.log('❌ Équipe Celui/Levrai non trouvée');
    return;
  }

  console.log(`🎯 Équipe trouvée: ${celuiTeam.name} (seed: ${celuiTeam.seed_position})`);

  // 2. Chercher l'équipe TBD
  const { data: tbdTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('name', 'TBD')
    .single();

  if (!tbdTeam) {
    console.log('❌ Équipe TBD non trouvée');
    return;
  }

  // 3. Créer le 4ème quart de finale manquant avec Celui/Levrai
  const { error } = await supabase
    .from('matches')
    .insert({
      tournament_id: tournamentId,
      match_type: 'quarter_final',
      round_number: 1,
      status: 'scheduled',
      team1_id: celuiTeam.id, // Celui/Levrai (BYE automatique)
      team2_id: tbdTeam.id, // TBD pour l'autre équipe à qualifier
      player1_id: null,
      player2_id: null,
    });

  if (error) {
    console.error('❌ Erreur création match:', error);
    return;
  }

  console.log('✅ 4ème quart de finale créé avec Celui/Levrai !');

  // 4. Vérification
  const { data: quarters } = await supabase
    .from('matches')
    .select(`
      id, team1_id, team2_id,
      team1:team1_id(name), team2:team2_id(name)
    `)
    .eq('tournament_id', tournamentId)
    .eq('match_type', 'quarter_final');

  console.log(`\n📊 QUARTS APRÈS CORRECTION (${quarters?.length}):`);
  quarters?.forEach((q, i) => {
    const t1 = q.team1?.name || 'NULL';
    const t2 = q.team2?.name || 'NULL';
    console.log(`  ${i + 1}. ${t1} vs ${t2}`);
  });
}

fixMissingTeam().catch(console.error);