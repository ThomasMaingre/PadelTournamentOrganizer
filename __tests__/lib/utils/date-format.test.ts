import {
  formatDateFR,
  formatDateShort,
  isFutureDate,
  daysDifference
} from '@/lib/utils/date-format'

describe('Date formatting utilities', () => {
  describe('formatDateFR', () => {
    it('should format date in French format', () => {
      const date = new Date('2024-12-25')
      const formatted = formatDateFR(date)
      expect(formatted).toMatch(/25 déc\.? 2024/)
    })

    it('should handle string dates', () => {
      const formatted = formatDateFR('2024-01-15')
      expect(formatted).toMatch(/15 janv\.? 2024/)
    })

    it('should handle invalid dates', () => {
      expect(formatDateFR('invalid-date')).toBe('Date invalide')
      expect(formatDateFR(new Date('invalid'))).toBe('Date invalide')
    })
  })

  describe('formatDateShort', () => {
    it('should format date in DD/MM/YYYY format', () => {
      const date = new Date('2024-12-25')
      expect(formatDateShort(date)).toBe('25/12/2024')
    })

    it('should handle string dates', () => {
      expect(formatDateShort('2024-01-01')).toBe('01/01/2024')
    })

    it('should handle invalid dates', () => {
      expect(formatDateShort('invalid-date')).toBe('Date invalide')
    })
  })

  describe('isFutureDate', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7) // 7 jours dans le futur
      expect(isFutureDate(futureDate)).toBe(true)
    })

    it('should return false for past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7) // 7 jours dans le passé
      expect(isFutureDate(pastDate)).toBe(false)
    })

    it('should return false for today', () => {
      const today = new Date()
      expect(isFutureDate(today)).toBe(false)
    })

    it('should handle invalid dates', () => {
      expect(isFutureDate('invalid-date')).toBe(false)
    })
  })

  describe('daysDifference', () => {
    it('should calculate correct difference between dates', () => {
      const date1 = new Date('2024-01-01')
      const date2 = new Date('2024-01-08')
      expect(daysDifference(date1, date2)).toBe(7)
    })

    it('should return negative for reversed dates', () => {
      const date1 = new Date('2024-01-08')
      const date2 = new Date('2024-01-01')
      expect(daysDifference(date1, date2)).toBe(-7)
    })

    it('should handle string dates', () => {
      expect(daysDifference('2024-01-01', '2024-01-03')).toBe(2)
    })

    it('should return 0 for same dates', () => {
      const date = new Date('2024-01-01')
      expect(daysDifference(date, date)).toBe(0)
    })

    it('should handle invalid dates', () => {
      expect(daysDifference('invalid', '2024-01-01')).toBe(0)
      expect(daysDifference('2024-01-01', 'invalid')).toBe(0)
    })
  })
})