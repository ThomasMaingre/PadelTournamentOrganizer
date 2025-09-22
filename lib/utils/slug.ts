/**
 * Génère un slug de tournoi basé sur difficulté-date-type
 * Exemple: createTournamentSlug('P100', '2025-09-21', 'mixte') -> "p100-21-09-2025-mixte"
 */
export function createTournamentSlug(difficulty: string, startDate: string, category: string): string {
  // Formatter la date au format DD-MM-YYYY
  const date = new Date(startDate)
  const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`

  // Créer le slug de base: difficulte-date-type
  const baseSlug = `${difficulty}-${formattedDate}-${category}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return baseSlug
}

/**
 * Génère un slug unique en vérifiant les doublons et en ajoutant un suffixe si nécessaire
 * Exemple: si "p100-21-09-2025-mixte" existe déjà, retourne "p100-21-09-2025-mixte-2"
 */
export async function generateUniqueSlug(
  difficulty: string,
  startDate: string,
  category: string,
  excludeId?: string,
  supabaseClient?: any
): Promise<string> {
  if (!supabaseClient) {
    // Fallback au slug de base si pas de client Supabase
    return createTournamentSlug(difficulty, startDate, category)
  }

  const baseSlug = createTournamentSlug(difficulty, startDate, category)

  // Vérifier si le slug de base existe déjà
  let query = supabaseClient
    .from('tournaments')
    .select('id')
    .eq('difficulty', difficulty)
    .eq('start_date', startDate)
    .eq('category', category)

  // Exclure l'ID actuel si on modifie un tournoi existant
  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data: existingTournaments } = await query

  if (!existingTournaments || existingTournaments.length === 0) {
    return baseSlug
  }

  // Si il y a des doublons, ajouter un suffixe numérique
  const suffix = existingTournaments.length + 1
  return `${baseSlug}-${suffix}`
}

/**
 * Trouve le tournoi qui correspond à un slug avec suffixe
 * Exemple: "p100-25-09-2025-femme-3" trouve le 3ème tournoi P100 Femmes 25/09/2025
 */
export function findTournamentBySlug(tournaments: any[], slug: string): any | null {
  // Extraire le suffixe numérique du slug
  const slugParts = slug.split('-')
  const lastPart = slugParts[slugParts.length - 1]
  const suffixNumber = parseInt(lastPart)

  // Si le dernier élément est un nombre, c'est un suffixe
  let baseSlug = slug
  let targetIndex = 0

  if (!isNaN(suffixNumber) && suffixNumber > 1) {
    // Enlever le suffixe pour avoir le slug de base
    baseSlug = slugParts.slice(0, -1).join('-')
    targetIndex = suffixNumber - 1 // Index 0-based
  }

  // Trouver tous les tournois qui correspondent au slug de base
  const matchingTournaments = tournaments.filter(t => {
    const tournamentSlug = createTournamentSlug(t.difficulty, t.start_date, t.category)
    return tournamentSlug === baseSlug
  })

  // Trier par date de création pour avoir un ordre cohérent
  matchingTournaments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  // Retourner le tournoi à l'index demandé
  return matchingTournaments[targetIndex] || null
}

/**
 * Génère le slug complet avec suffixe pour un tournoi spécifique
 * Utilisé pour les liens dans le dashboard
 */
export function getTournamentSlugWithSuffix(tournament: any, allTournaments: any[]): string {
  const baseSlug = createTournamentSlug(tournament.difficulty, tournament.start_date, tournament.category)

  // Trouver tous les tournois avec les mêmes paramètres
  const matchingTournaments = allTournaments.filter(t => {
    const tSlug = createTournamentSlug(t.difficulty, t.start_date, t.category)
    return tSlug === baseSlug
  })

  // S'il n'y a qu'un tournoi, pas de suffixe
  if (matchingTournaments.length <= 1) {
    return baseSlug
  }

  // Trier par date de création pour avoir un ordre cohérent
  matchingTournaments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  // Trouver l'index du tournoi actuel
  const index = matchingTournaments.findIndex(t => t.id === tournament.id)

  // Le premier tournoi n'a pas de suffixe, les suivants ont -2, -3, etc.
  if (index === 0) {
    return baseSlug
  } else {
    return `${baseSlug}-${index + 1}`
  }
}

/**
 * Trouve l'ID d'un tournoi à partir de son slug
 * Utilisé pour convertir un slug en ID pour les actions serveur
 */
export async function getTournamentIdFromSlug(slug: string, supabaseClient: any): Promise<string | null> {
  // Récupérer tous les tournois
  const { data: tournaments } = await supabaseClient
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: true })

  if (!tournaments) return null

  // Utiliser findTournamentBySlug pour trouver le bon tournoi
  const tournament = findTournamentBySlug(tournaments, slug)

  return tournament ? tournament.id.toString() : null
}

/**
 * @deprecated Ancienne fonction, remplacée par createTournamentSlug
 */
export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}