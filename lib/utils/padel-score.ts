/**
 * Validation des scores de padel
 * Utilitaires pour valider les sets et déterminer les gagnants
 */

export interface SetScore {
  team1: number
  team2: number
}

/**
 * Vérifie si un set de padel est valide selon les règles officielles
 * @param set Le score du set à valider
 * @returns true si le set est valide, false sinon
 */
export function isValidPadelSet(set: SetScore): boolean {
  const { team1, team2 } = set

  // Vérifier que les scores sont dans la plage valide
  if (team1 < 0 || team2 < 0 || team1 > 7 || team2 > 7) {
    return false
  }

  // Un set ne peut pas être 0-0
  if (team1 === 0 && team2 === 0) {
    return false
  }

  const maxScore = Math.max(team1, team2)
  const minScore = Math.min(team1, team2)
  const diff = Math.abs(team1 - team2)

  // Un set doit aller au moins à 6
  if (maxScore < 6) {
    return false
  }

  // Règles de validation :
  // - 6-0, 6-1, 6-2, 6-3, 6-4 sont valides
  // - 7-5, 7-6 sont valides
  // - Pour un score de 6, l'adversaire doit avoir 4 ou moins
  // - Pour un score de 7, l'adversaire peut avoir 5 ou 6
  if (maxScore === 6) {
    return minScore <= 4
  } else if (maxScore === 7) {
    return minScore >= 5 && minScore <= 6
  }

  return false
}

/**
 * Détermine le gagnant d'un set de padel
 * @param set Le score du set
 * @returns 1 si team1 gagne, 2 si team2 gagne, null si le set est invalide ou égal
 */
export function getSetWinner(set: SetScore): 1 | 2 | null {
  if (!isValidPadelSet(set)) {
    return null
  }

  if (set.team1 > set.team2) {
    return 1
  } else if (set.team2 > set.team1) {
    return 2
  }

  return null // Ne devrait jamais arriver avec un set valide
}

/**
 * Détermine le gagnant d'un match de padel (meilleur de 3 sets)
 * @param sets Tableau des sets du match
 * @returns 1 si team1 gagne, 2 si team2 gagne, null si pas de gagnant déterminé
 */
export function getMatchWinner(sets: SetScore[]): 1 | 2 | null {
  let team1Wins = 0
  let team2Wins = 0

  for (const set of sets) {
    const winner = getSetWinner(set)
    if (winner === 1) team1Wins++
    else if (winner === 2) team2Wins++
  }

  if (team1Wins >= 2) return 1
  if (team2Wins >= 2) return 2

  return null
}

/**
 * Formate un score de set pour l'affichage
 * @param set Le score du set
 * @returns String formatée du score (ex: "6-4")
 */
export function formatSetScore(set: SetScore): string {
  return `${set.team1}-${set.team2}`
}