"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { updateProfile, updatePassword } from "@/lib/account-actions"
import AvatarUpload from "./avatar-upload"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url?: string | null
}

interface AccountFormProps {
  user: User
}

export default function AccountForm({ user }: AccountFormProps) {
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url)

  const [profileData, setProfileData] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
  })

  const userInitials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || 'U'

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl)
  }

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  })

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profileData.first_name.trim()) {
      toast.error("Le prénom est requis")
      return
    }

    if (!profileData.last_name.trim()) {
      toast.error("Le nom est requis")
      return
    }

    if (!profileData.email.trim()) {
      toast.error("L'email est requis")
      return
    }

    setIsUpdatingProfile(true)
    try {
      await updateProfile(user.id, {
        first_name: profileData.first_name.trim(),
        last_name: profileData.last_name.trim(),
        email: profileData.email.trim(),
      })
      toast.success("Profil mis à jour avec succès")
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error)
      toast.error("Erreur lors de la mise à jour du profil")
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordData.newPassword) {
      toast.error("Le nouveau mot de passe est requis")
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }

    setIsUpdatingPassword(true)
    try {
      await updatePassword("", passwordData.newPassword)
      toast.success("Mot de passe mis à jour avec succès")
      setPasswordData({
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error)
      toast.error("Erreur lors de la mise à jour du mot de passe")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex justify-center">
        <AvatarUpload
          userId={user.id}
          currentAvatarUrl={avatarUrl}
          userInitials={userInitials}
          onAvatarUpdate={handleAvatarUpdate}
        />
      </div>

      <Separator />

      {/* Informations personnelles */}
      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom *</Label>
          <Input
            id="firstName"
            value={profileData.first_name}
            onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
            required
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Nom *</Label>
          <Input
            id="lastName"
            value={profileData.last_name}
            onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
            required
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            required
          />
        </div>

        <Button type="submit" disabled={isUpdatingProfile}>
          {isUpdatingProfile ? "Mise à jour..." : "Mettre à jour le profil"}
        </Button>
      </form>

      <Separator />

      {/* Changement de mot de passe */}
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <h3 className="text-lg font-medium">Changer le mot de passe</h3>

        <div className="space-y-2">
          <Label htmlFor="newPassword">Nouveau mot de passe *</Label>
          <Input
            id="newPassword"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            required
            minLength={6}
          />
          <p className="text-xs text-muted-foreground">
            Minimum 6 caractères
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe *</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            required
            minLength={6}
          />
        </div>

        <Button type="submit" disabled={isUpdatingPassword}>
          {isUpdatingPassword ? "Mise à jour..." : "Changer le mot de passe"}
        </Button>
      </form>
    </div>
  )
}