"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// Sign in action for judges
export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Erreur de formulaire. Veuillez réessayer." }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Veuillez saisir votre email et mot de passe." }
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
      // Messages d'erreur Supabase personnalisés
      if (error.message.includes("Invalid login credentials")) {
        return { error: "Email ou mot de passe incorrect." }
      }
      if (error.message.includes("Email not confirmed")) {
        return { error: "Veuillez confirmer votre email avant de vous connecter." }
      }
      if (error.message.includes("Too many requests")) {
        return { error: "Trop de tentatives. Veuillez patienter avant de réessayer." }
      }
      return { error: "Erreur de connexion. Vérifiez vos identifiants." }
    }

    return { success: true }
  } catch (error) {
    console.error("Erreur de connexion:", error)
    return { error: "Erreur de connexion. Veuillez vérifier votre connexion internet et réessayer." }
  }
}

// Sign up action for judges
export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Erreur de formulaire. Veuillez réessayer." }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const firstName = formData.get("firstName")
  const lastName = formData.get("lastName")

  if (!email || !password || !firstName || !lastName) {
    return { error: "Veuillez remplir tous les champs obligatoires." }
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
      // Messages d'erreur Supabase personnalisés pour l'inscription
      if (error.message.includes("User already registered")) {
        return { error: "Un compte existe déjà avec cette adresse email." }
      }
      if (error.message.includes("Password should be at least")) {
        return { error: "Le mot de passe doit contenir au moins 6 caractères." }
      }
      if (error.message.includes("Invalid email")) {
        return { error: "Veuillez saisir une adresse email valide." }
      }
      if (error.message.includes("signup is disabled")) {
        return { error: "Les inscriptions sont temporairement désactivées." }
      }
      return { error: "Erreur lors de la création du compte. Veuillez réessayer." }
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
        return { error: "Compte créé mais erreur lors de la configuration du profil. Contactez le support." }
      }
    }

    return { success: "Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription." }
  } catch (error) {
    console.error("Erreur d'inscription:", error)
    return { error: "Erreur lors de l'inscription. Veuillez vérifier votre connexion internet et réessayer." }
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
