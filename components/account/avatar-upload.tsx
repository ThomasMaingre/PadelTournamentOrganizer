"use client"

import { useState, useRef } from "react"
import { Camera, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { uploadAvatar } from "@/lib/account-actions"
import { toast } from "sonner"

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl?: string | null
  userInitials: string
  onAvatarUpdate?: (newAvatarUrl: string) => void
}

export default function AvatarUpload({
  userId,
  currentAvatarUrl,
  userInitials,
  onAvatarUpdate
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validation côté client
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5MB")
      return
    }

    setIsUploading(true)
    try {
      const result = await uploadAvatar(userId, file)
      setAvatarUrl(result.avatar_url)
      onAvatarUpdate?.(result.avatar_url)
      toast.success("Avatar mis à jour avec succès")
    } catch (error) {
      console.error("Erreur upload avatar:", error)
      toast.error("Erreur lors de l'upload de l'avatar")
    } finally {
      setIsUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="h-24 w-24">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt="Avatar" />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {userInitials}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Overlay avec icône caméra */}
        <button
          onClick={handleFileSelect}
          disabled={isUploading}
          className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center disabled:cursor-not-allowed"
        >
          <Camera className="h-6 w-6" />
        </button>
      </div>

      <div className="text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFileSelect}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Upload..." : "Changer l'avatar"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          JPG, PNG • Max 5MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}