"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

interface CategoryFilterProps {
  currentView: string
  currentCategory: string
}

export default function CategoryFilter({ currentView, currentCategory }: CategoryFilterProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null)

  const handleCategoryChange = (category: string) => {
    if (category === currentCategory) return

    setLoadingCategory(category)
    startTransition(() => {
      router.push(`/dashboard?view=${currentView}&category=${category}`)
    })
  }

  const categories = [
    { key: "tous", label: "Tous" },
    { key: "mixte", label: "Mixte" },
    { key: "homme", label: "Hommes" },
    { key: "femme", label: "Femmes" },
  ]

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-sm text-muted-foreground">Filtrer par catégorie :</span>
      <div className="flex rounded-lg border bg-background p-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategoryChange(cat.key)}
            disabled={isPending}
            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1 sm:gap-2 ${
              currentCategory === cat.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
            }`}
          >
            {loadingCategory === cat.key && isPending && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}