import { createSlug, decodeSlug } from '@/lib/utils/slug'

describe('Slug utilities', () => {
  describe('createSlug', () => {
    it('should convert a simple tournament name to slug', () => {
      expect(createSlug('P1000')).toBe('p1000')
    })

    it('should handle tournament name with spaces', () => {
      expect(createSlug('P250 Mixte')).toBe('p250-mixte')
    })

    it('should handle tournament name with date', () => {
      expect(createSlug('P1000 Hommes 25/12/2024')).toBe('p1000-hommes-25-12-2024')
    })

    it('should handle special characters', () => {
      expect(createSlug('P500 Été 2024')).toBe('p500-t-2024')
    })

    it('should handle multiple spaces and special characters', () => {
      expect(createSlug('  P250  Mixte  01/01/2025  ')).toBe('p250-mixte-01-01-2025')
    })

    it('should handle empty string', () => {
      expect(createSlug('')).toBe('')
    })

    it('should handle string with only special characters', () => {
      expect(createSlug('!@#$%')).toBe('')
    })

    it('should remove multiple consecutive dashes', () => {
      expect(createSlug('P1000---Test')).toBe('p1000-test')
    })
  })

  describe('decodeSlug', () => {
    it('should convert slug back to readable format', () => {
      expect(decodeSlug('p1000-mixte')).toBe('p1000 mixte')
    })

    it('should handle complex slug', () => {
      expect(decodeSlug('p250-hommes-25-12-2024')).toBe('p250 hommes 25 12 2024')
    })

    it('should handle empty string', () => {
      expect(decodeSlug('')).toBe('')
    })

    it('should handle slug without dashes', () => {
      expect(decodeSlug('p1000')).toBe('p1000')
    })
  })
})