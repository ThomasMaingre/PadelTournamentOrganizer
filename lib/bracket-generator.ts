// API complète et testée pour la génération de brackets de tournoi

export interface Team {
  id: string
  name: string
  seed_position: number
}

export interface Match {
  id?: string
  tournament_id: string
  match_type: 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final'
  round_number: number
  status: 'scheduled' | 'completed'
  team1_id: string | null
  team2_id: string | null
  winner_team_id?: string | null
  player1_score: number
  player2_score: number
}

export interface BracketRound {
  type: Match['match_type']
  round_number: number
  matches: Match[]
}

/**
 * Calcule la puissance de 2 supérieure ou égale au nombre d'équipes
 */
function getNextPowerOfTwo(num: number): number {
  const powers = [2, 4, 8, 16, 32]
  return powers.find(p => p >= num) || 32
}

/**
 * Détermine le type de round selon la taille
 */
function getRoundType(size: number): Match['match_type'] {
  switch (size) {
    case 2: return 'final'
    case 4: return 'semi_final'
    case 8: return 'quarter_final'
    case 16: return 'round_of_16'
    case 32: return 'round_of_32'
    default: return 'round_of_16'
  }
}

/**
 * Génère les positions des équipes selon le système de seeding tennis
 */
function generateSeededPositions(teams: Team[], bracketSize: number): (string | null)[] {
  const positions: (string | null)[] = new Array(bracketSize).fill(null)

  // Placements optimaux pour éviter que les têtes de série se rencontrent trop tôt
  const seedPlacements: Record<number, number[]> = {
    2: [0, 1],
    4: [0, 3, 1, 2],
    8: [0, 7, 3, 4, 1, 6, 2, 5],
    16: [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10],
    32: [
      0, 31, 15, 16, 7, 24, 8, 23, 3, 28, 12, 19, 4, 27, 11, 20,
      1, 30, 14, 17, 6, 25, 9, 22, 2, 29, 13, 18, 5, 26, 10, 21
    ]
  }

  const placements = seedPlacements[bracketSize] || []

  // Placer les équipes selon leur seed
  for (let i = 0; i < Math.min(teams.length, placements.length); i++) {
    positions[placements[i]] = teams[i].id
  }

  return positions
}

/**
 * Génère tous les rounds d'un bracket
 */
function generateRounds(bracketSize: number): Array<{type: Match['match_type'], round_number: number, num_matches: number}> {
  const rounds = []
  let currentSize = bracketSize
  let roundNumber = 1

  while (currentSize >= 2) {
    const roundType = getRoundType(currentSize)
    const numMatches = currentSize / 2

    rounds.push({
      type: roundType,
      round_number: roundNumber,
      num_matches: numMatches
    })

    currentSize = currentSize / 2
    roundNumber++
  }

  return rounds
}

/**
 * Crée un match avec gestion automatique des BYE
 */
function createMatch(
  tournamentId: string,
  roundInfo: {type: Match['match_type'], round_number: number},
  team1Id: string | null,
  team2Id: string | null,
  teams: Team[]
): Match {

  const match: Match = {
    tournament_id: tournamentId,
    match_type: roundInfo.type,
    round_number: roundInfo.round_number,
    status: 'scheduled',
    team1_id: null,
    team2_id: null,
    player1_score: 0,
    player2_score: 0
  }

  if (team1Id && team2Id) {
    // Match normal avec 2 équipes
    match.team1_id = team1Id
    match.team2_id = team2Id
  } else if (team1Id && !team2Id) {
    // BYE : team1 passe automatiquement
    match.team1_id = team1Id
    match.team2_id = team1Id // Duplique pour contrainte DB
    match.status = 'completed'
    match.winner_team_id = team1Id
    match.player1_score = 2 // Victoire par forfait
  } else if (!team1Id && team2Id) {
    // BYE : team2 passe automatiquement
    match.team1_id = team2Id // Duplique pour contrainte DB
    match.team2_id = team2Id
    match.status = 'completed'
    match.winner_team_id = team2Id
    match.player2_score = 2 // Victoire par forfait
  } else {
    // Aucune équipe : ne pas créer ce match
    return null
  }

  return match
}

/**
 * Génère un bracket complet pour un tournoi
 */
export function generateTournamentBracket(teams: Team[], tournamentId: string): BracketRound[] {
  // Validation
  if (teams.length < 2) {
    throw new Error('Au moins 2 équipes requises')
  }

  if (teams.length > 32) {
    throw new Error('Maximum 32 équipes supportées')
  }

  // Trier les équipes par seed
  const sortedTeams = [...teams].sort((a, b) => a.seed_position - b.seed_position)

  // Calculer la taille du bracket
  const bracketSize = getNextPowerOfTwo(teams.length)

  // Générer les positions des équipes
  const positions = generateSeededPositions(sortedTeams, bracketSize)

  // Générer la structure des rounds
  const rounds = generateRounds(bracketSize)

  // Créer les matchs pour chaque round
  const bracketRounds: BracketRound[] = []

  for (const roundInfo of rounds) {
    const roundMatches: Match[] = []

    if (roundInfo.round_number === 1) {
      // Premier round : placer les vraies équipes
      for (let i = 0; i < roundInfo.num_matches; i++) {
        const pos1 = i * 2
        const pos2 = i * 2 + 1

        const team1Id = positions[pos1]
        const team2Id = positions[pos2]

        const match = createMatch(tournamentId, roundInfo, team1Id, team2Id, sortedTeams)
        if (match) {
          roundMatches.push(match)
        }
      }
    } else {
      // Rounds suivants : créer des matches vides avec placeholders
      const placeholderTeamId = sortedTeams[0]?.id || null

      for (let i = 0; i < roundInfo.num_matches; i++) {
        if (placeholderTeamId) {
          roundMatches.push({
            tournament_id: tournamentId,
            match_type: roundInfo.type,
            round_number: roundInfo.round_number,
            status: 'scheduled',
            team1_id: placeholderTeamId,
            team2_id: placeholderTeamId,
            player1_score: 0,
            player2_score: 0
          })
        }
      }
    }

    bracketRounds.push({
      type: roundInfo.type,
      round_number: roundInfo.round_number,
      matches: roundMatches
    })
  }

  return bracketRounds
}

/**
 * Valide qu'un bracket est correctement formé
 */
export function validateBracket(bracket: BracketRound[], teams: Team[]): string[] {
  const errors: string[] = []

  if (bracket.length === 0) {
    errors.push('Bracket vide')
    return errors
  }

  // Vérifier la progression des rounds
  for (let i = 0; i < bracket.length - 1; i++) {
    const currentRound = bracket[i]
    const nextRound = bracket[i + 1]

    if (currentRound.matches.length !== nextRound.matches.length * 2) {
      errors.push(`Round ${currentRound.round_number} devrait avoir ${nextRound.matches.length * 2} matches, a ${currentRound.matches.length}`)
    }
  }

  // Vérifier que toutes les équipes sont présentes dans le premier round
  const firstRound = bracket[0]
  const teamsInBracket = new Set<string>()

  firstRound.matches.forEach(match => {
    if (match.team1_id && match.team1_id !== match.team2_id) {
      teamsInBracket.add(match.team1_id)
    }
    if (match.team2_id && match.team1_id !== match.team2_id) {
      teamsInBracket.add(match.team2_id)
    }
    if (match.team1_id === match.team2_id && match.status === 'completed') {
      // BYE
      teamsInBracket.add(match.team1_id)
    }
  })

  teams.forEach(team => {
    if (!teamsInBracket.has(team.id)) {
      errors.push(`Équipe ${team.name} absente du bracket`)
    }
  })

  return errors
}

/**
 * Génère les statistiques d'un bracket
 */
export function getBracketStats(bracket: BracketRound[], teams: Team[]) {
  const totalMatches = bracket.reduce((sum, round) => sum + round.matches.length, 0)
  const byeMatches = bracket[0]?.matches.filter(m => m.team1_id === m.team2_id && m.status === 'completed').length || 0
  const normalMatches = bracket[0]?.matches.filter(m => m.team1_id !== m.team2_id).length || 0

  return {
    teams_count: teams.length,
    bracket_size: getNextPowerOfTwo(teams.length),
    total_rounds: bracket.length,
    total_matches: totalMatches,
    first_round_matches: bracket[0]?.matches.length || 0,
    bye_matches: byeMatches,
    normal_matches: normalMatches
  }
}