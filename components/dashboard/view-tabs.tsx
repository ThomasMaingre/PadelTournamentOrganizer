"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CalendarCheck, History as HistoryIcon, Loader2 } from "lucide-react"

interface ViewTabsProps {
  currentView: string
  currentCategory: string
  currentCount?: number
  historyCount?: number
}

export default function ViewTabs({
  currentView,
  currentCategory,
  currentCount,
  historyCount
}: ViewTabsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadingView, setLoadingView] = useState<string | null>(null)

  const handleViewChange = (view: string) => {
    if (view === currentView) return

    setLoadingView(view)
    startTransition(() => {
      router.push(`/dashboard?view=${view}&category=${currentCategory}`)
    })
  }

  const tabCard = (active: boolean) =>
    `group rounded-2xl border bg-card/90 backdrop-blur hover:bg-card transition-all hover:shadow-md cursor-pointer ${
      active ? "ring-2 ring-primary" : "ring-0"
    }`

  return (
    <>
      {/* Tournois en cours */}
      <div onClick={() => handleViewChange("current")}>
        <Card className={tabCard(currentView === "current")}>
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center group-hover:scale-105 transition">
              {loadingView === "current" && isPending ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <CalendarCheck className="h-6 w-6" />
              )}
            </div>
            <CardTitle className="mt-2">
              Tournois en cours {typeof currentCount === "number" ? `(${currentCount})` : ""}
            </CardTitle>
            <CardDescription>Brouillons &amp; En cours</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Historique */}
      <div onClick={() => handleViewChange("history")}>
        <Card className={tabCard(currentView === "history")}>
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center group-hover:scale-105 transition">
              {loadingView === "history" && isPending ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <HistoryIcon className="h-6 w-6" />
              )}
            </div>
            <CardTitle className="mt-2">
              Historique {typeof historyCount === "number" ? `(${historyCount})` : ""}
            </CardTitle>
            <CardDescription>Tournois terminés</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  )
}