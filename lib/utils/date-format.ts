/**
 * Utilitaires de formatage de date pour l'application
 */

/**
 * Formate une date en français
 * @param date Date à formater
 * @returns Date formatée en français (ex: "25 déc. 2024")
 */
export function formatDateFR(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return 'Date invalide'
  }

  return dateObj.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Formate une date au format court (DD/MM/YYYY)
 * @param date Date à formater
 * @returns Date formatée (ex: "25/12/2024")
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return 'Date invalide'
  }

  return dateObj.toLocaleDateString('fr-FR')
}

/**
 * Vérifie si une date est dans le futur
 * @param date Date à vérifier
 * @returns true si la date est dans le futur
 */
export function isFutureDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return false
  }

  const now = new Date()
  // Comparer seulement les dates (sans l'heure)
  const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return dateOnly > nowOnly
}

/**
 * Calcule la différence en jours entre deux dates
 * @param date1 Première date
 * @param date2 Deuxième date
 * @returns Différence en jours (positif si date2 > date1)
 */
export function daysDifference(date1: Date | string, date2: Date | string): number {
  const dateObj1 = typeof date1 === 'string' ? new Date(date1) : date1
  const dateObj2 = typeof date2 === 'string' ? new Date(date2) : date2

  if (isNaN(dateObj1.getTime()) || isNaN(dateObj2.getTime())) {
    return 0
  }

  const diffTime = dateObj2.getTime() - dateObj1.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}