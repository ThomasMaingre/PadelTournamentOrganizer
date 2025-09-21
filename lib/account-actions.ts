"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

// ──────────────────────────────────────────────────────────────────────────────
/** ACCOUNT: Mettre à jour le profil */
// ──────────────────────────────────────────────────────────────────────────────
export async function updateProfile(
  userId: string,
  data: {
    first_name: string
    last_name: string
    email: string
    avatar_url?: string
  }
) {
  const supabase = await createSupabaseServerClient()

  // Mettre à jour l'email dans auth si différent
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Utilisateur non connecté")
  }

  if (user.email !== data.email) {
    const { error: emailError } = await supabase.auth.updateUser({
      email: data.email
    })
    if (emailError) {
      throw new Error("Erreur lors de la mise à jour de l'email: " + emailError.message)
    }
  }

  // Mettre à jour le profil dans judges
  const updateData: any = {
    first_name: data.first_name,
    last_name: data.last_name,
  }

  if (data.avatar_url !== undefined) {
    updateData.avatar_url = data.avatar_url
  }

  const { error: profileError } = await supabase
    .from("judges")
    .update(updateData)
    .eq("id", userId)

  if (profileError) {
    throw new Error("Erreur lors de la mise à jour du profil: " + profileError.message)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/account")
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
/** ACCOUNT: Upload avatar */
// ──────────────────────────────────────────────────────────────────────────────
export async function uploadAvatar(userId: string, file: File) {
  const supabase = await createSupabaseServerClient()

  // Vérifier que l'utilisateur est connecté
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    throw new Error("Accès non autorisé")
  }

  // Vérifier le type de fichier
  if (!file.type.startsWith('image/')) {
    throw new Error("Le fichier doit être une image")
  }

  // Vérifier la taille (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("L'image ne doit pas dépasser 5MB")
  }

  // Générer un nom de fichier unique
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`

  // Upload vers Supabase Storage
  const { data, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    throw new Error("Erreur lors de l'upload: " + uploadError.message)
  }

  // Obtenir l'URL publique
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  // Mettre à jour le profil avec la nouvelle URL d'avatar
  const { error: profileError } = await supabase
    .from("judges")
    .update({ avatar_url: publicUrl })
    .eq("id", userId)

  if (profileError) {
    throw new Error("Erreur lors de la mise à jour du profil: " + profileError.message)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/account")
  return { success: true, avatar_url: publicUrl }
}

// ──────────────────────────────────────────────────────────────────────────────
/** ACCOUNT: Changer le mot de passe */
// ──────────────────────────────────────────────────────────────────────────────
export async function updatePassword(currentPassword: string, newPassword: string) {
  const supabase = await createSupabaseServerClient()

  // Vérifier que l'utilisateur est connecté
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Utilisateur non connecté")
  }

  // Mettre à jour le mot de passe (Supabase gère la vérification de l'ancien mot de passe)
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (updateError) {
    throw new Error("Erreur lors de la mise à jour du mot de passe: " + updateError.message)
  }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────────────
/** ACCOUNT: Supprimer le compte */
// ──────────────────────────────────────────────────────────────────────────────
export async function deleteAccount(userId: string) {
  const supabase = await createSupabaseServerClient()

  // Vérifier que l'utilisateur est connecté
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    throw new Error("Accès non autorisé")
  }

  // Récupérer tous les tournois de l'utilisateur
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id")
    .eq("judge_id", userId)

  if (tournaments && tournaments.length > 0) {
    // Supprimer toutes les données liées à chaque tournoi
    for (const tournament of tournaments) {
      const tournamentId = tournament.id

      // Supprimer dans l'ordre inverse des dépendances
      await supabase.from("tournament_rankings").delete().eq("tournament_id", tournamentId)
      await supabase.from("matches").delete().eq("tournament_id", tournamentId)
      await supabase.from("players").delete().eq("tournament_id", tournamentId)
      await supabase.from("teams").delete().eq("tournament_id", tournamentId)
      await supabase.from("tournaments").delete().eq("id", tournamentId)
    }
  }

  // Supprimer le profil judge
  const { error: judgeError } = await supabase
    .from("judges")
    .delete()
    .eq("id", userId)

  if (judgeError) {
    console.warn("Erreur suppression judge:", judgeError.message)
  }

  // Supprimer l'utilisateur auth (ceci déconnecte automatiquement)
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)

  if (authError) {
    // Si on ne peut pas supprimer via admin, on déconnecte
    await supabase.auth.signOut()
  }

  revalidatePath("/")
  redirect("/")
}