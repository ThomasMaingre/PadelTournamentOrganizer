import {
  isValidPadelSet,
  getSetWinner,
  getMatchWinner,
  formatSetScore,
  SetScore
} from '@/lib/utils/padel-score'

describe('Padel Score utilities', () => {
  describe('isValidPadelSet', () => {
    it('should validate correct padel sets', () => {
      expect(isValidPadelSet({ team1: 6, team2: 0 })).toBe(true)
      expect(isValidPadelSet({ team1: 6, team2: 4 })).toBe(true)
      expect(isValidPadelSet({ team1: 7, team2: 5 })).toBe(true)
      expect(isValidPadelSet({ team1: 7, team2: 6 })).toBe(true)
      expect(isValidPadelSet({ team1: 4, team2: 6 })).toBe(true)
    })

    it('should reject invalid padel sets', () => {
      expect(isValidPadelSet({ team1: 0, team2: 0 })).toBe(false)
      expect(isValidPadelSet({ team1: 5, team2: 4 })).toBe(false) // Pas assez élevé
      expect(isValidPadelSet({ team1: 6, team2: 5 })).toBe(false) // Écart insuffisant pour 6
      expect(isValidPadelSet({ team1: 7, team2: 4 })).toBe(false) // Écart trop grand pour 7
      expect(isValidPadelSet({ team1: 8, team2: 6 })).toBe(false) // Score trop élevé
      expect(isValidPadelSet({ team1: -1, team2: 6 })).toBe(false) // Score négatif
    })
  })

  describe('getSetWinner', () => {
    it('should return correct winner for valid sets', () => {
      expect(getSetWinner({ team1: 6, team2: 4 })).toBe(1)
      expect(getSetWinner({ team1: 4, team2: 6 })).toBe(2)
      expect(getSetWinner({ team1: 7, team2: 5 })).toBe(1)
      expect(getSetWinner({ team1: 5, team2: 7 })).toBe(2)
    })

    it('should return null for invalid sets', () => {
      expect(getSetWinner({ team1: 6, team2: 5 })).toBe(null)
      expect(getSetWinner({ team1: 5, team2: 4 })).toBe(null)
      expect(getSetWinner({ team1: 0, team2: 0 })).toBe(null)
    })
  })

  describe('getMatchWinner', () => {
    it('should determine match winner correctly', () => {
      // Team1 gagne 2-0
      const match1: SetScore[] = [
        { team1: 6, team2: 4 },
        { team1: 6, team2: 2 }
      ]
      expect(getMatchWinner(match1)).toBe(1)

      // Team2 gagne 2-1
      const match2: SetScore[] = [
        { team1: 6, team2: 4 },
        { team1: 3, team2: 6 },
        { team1: 5, team2: 7 }
      ]
      expect(getMatchWinner(match2)).toBe(2)
    })

    it('should return null when no winner yet', () => {
      // Match en cours 1-1
      const match: SetScore[] = [
        { team1: 6, team2: 4 },
        { team1: 4, team2: 6 }
      ]
      expect(getMatchWinner(match)).toBe(null)

      // Pas de sets valides
      const invalidMatch: SetScore[] = [
        { team1: 5, team2: 4 }
      ]
      expect(getMatchWinner(invalidMatch)).toBe(null)
    })
  })

  describe('formatSetScore', () => {
    it('should format set scores correctly', () => {
      expect(formatSetScore({ team1: 6, team2: 4 })).toBe('6-4')
      expect(formatSetScore({ team1: 7, team2: 5 })).toBe('7-5')
      expect(formatSetScore({ team1: 0, team2: 6 })).toBe('0-6')
    })
  })
})