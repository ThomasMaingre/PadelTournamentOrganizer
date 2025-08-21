"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// Sign in action for judges
export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Données du formulaire manquantes" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email et mot de passe requis" }
  }

  const cookieStore = await cookies() // ⬅️ Next 15: cookies() asynchrone
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options })
            )
          } catch {
            // Ignorer si appelé depuis un Server Component
          }
        },
      },
    },
  )

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Erreur de connexion:", error)
    return { error: "Une erreur inattendue s'est produite. Veuillez réessayer." }
  }
}

// Sign up action for judges
export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Données du formulaire manquantes" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const firstName = formData.get("firstName")
  const lastName = formData.get("lastName")

  if (!email || !password || !firstName || !lastName) {
    return { error: "Tous les champs sont requis" }
  }

  const cookieStore = await cookies() // ⬅️ Next 15
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options })
            )
          } catch {
            // Ignorer si appelé depuis un Server Component
          }
        },
      },
    },
  )

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard`,
      },
    })

    if (error) {
      return { error: error.message }
    }

    // Create judge profile in database
    if (data.user) {
      const { error: profileError } = await supabase.from("judges").insert({
        id: data.user.id,
        email: email.toString(),
        first_name: firstName.toString(),
        last_name: lastName.toString(),
      })

      if (profileError) {
        console.error("Erreur création profil juge:", profileError)
        return { error: "Erreur lors de la création du profil" }
      }
    }

    return { success: "Vérifiez votre email pour confirmer votre compte." }
  } catch (error) {
    console.error("Erreur d'inscription:", error)
    return { error: "Une erreur inattendue s'est produite. Veuillez réessayer." }
  }
}

// Sign out action
export async function signOut() {
  const cookieStore = await cookies() // ⬅️ Next 15
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options })
            )
          } catch {
            // Ignorer si appelé depuis un Server Component
          }
        },
      },
    },
  )

  try {
    await supabase.auth.signOut()
  } catch (e) {
    console.error("signOut error:", e)
  }

  // ⬇️ Retour à la page principale
  redirect("/")
}
