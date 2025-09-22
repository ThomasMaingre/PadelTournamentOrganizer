import { signUp } from '@/lib/actions'

// Mock de FormData pour les tests
class MockFormData {
  private data: { [key: string]: string } = {}

  get(key: string): string | null {
    return this.data[key] || null
  }

  set(key: string, value: string) {
    this.data[key] = value
  }
}

// Mock des dépendances externes
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: jest.fn().mockReturnValue([]),
    set: jest.fn(),
  }),
}))

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn().mockReturnValue({
    auth: {
      signUp: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({ error: null }),
    }),
  }),
}))

describe('Inscription utilisateur', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('devrait valider les champs obligatoires', async () => {
    const formData = new MockFormData()
    // Ne pas remplir tous les champs

    const result = await signUp(null, formData as any)

    expect(result.error).toBe('Veuillez remplir tous les champs obligatoires.')
  })

  it('devrait créer un compte avec des données valides', async () => {
    const { createServerClient } = require('@supabase/ssr')
    const mockSupabase = {
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({ error: null }),
      }),
    }
    createServerClient.mockReturnValue(mockSupabase)

    const formData = new MockFormData()
    formData.set('email', 'test@example.com')
    formData.set('password', 'motdepasse123')
    formData.set('firstName', 'Jean')
    formData.set('lastName', 'Dupont')

    const result = await signUp(null, formData as any)

    expect(result.success).toBe('Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription.')
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'motdepasse123',
      options: {
        emailRedirectTo: expect.any(String),
      },
    })
  })

  it('devrait gérer les erreurs de Supabase', async () => {
    const { createServerClient } = require('@supabase/ssr')
    const mockSupabase = {
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User already registered' },
        }),
      },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({ error: null }),
      }),
    }
    createServerClient.mockReturnValue(mockSupabase)

    const formData = new MockFormData()
    formData.set('email', 'test@example.com')
    formData.set('password', 'motdepasse123')
    formData.set('firstName', 'Jean')
    formData.set('lastName', 'Dupont')

    const result = await signUp(null, formData as any)

    expect(result.error).toBe('Un compte existe déjà avec cette adresse email.')
  })
})