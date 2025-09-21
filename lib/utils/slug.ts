/**
 * Convertit un nom de tournoi en slug URL-safe
 * Exemple: "P1000 Mixte 25/12/2024" -> "p1000-mixte-25-12-2024"
 */
export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '-') // Remplace les caractères spéciaux par des tirets
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/-+/g, '-') // Remplace les tirets multiples par un seul
    .replace(/^-|-$/g, '') // Supprime les tirets au début et à la fin
}

/**
 * Decode un slug pour retrouver le nom original du tournoi
 * Cela nécessitera une recherche en base car la conversion n'est pas réversible
 */
export function decodeSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .trim()
}