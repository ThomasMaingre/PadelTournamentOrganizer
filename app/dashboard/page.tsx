// app/dashboard/page.tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getTournamentSlugWithSuffix } from "@/lib/utils/slug"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import UserDropdown from "@/components/user-dropdown"
import CategoryFilter from "@/components/dashboard/category-filter"
import ViewTabs from "@/components/dashboard/view-tabs"
import {
  Trophy,
  Plus,
  CalendarCheck,
  History as HistoryIcon,
  ChevronRight,
  CheckCircle2,
  PlayCircle,
  Clock,
} from "lucide-react"
import Logo from "@/components/ui/logo"

type Search = { view?: "current" | "history"; category?: "tous" | "homme" | "femme" | "mixte" }

const CURRENT_STATUSES = ["draft", "in_progress"] as const
const HISTORY_STATUSES = ["completed"] as const

function StatusBadge({ status }: { status: string }) {
  const map = {
    completed: {
      label: "Terminé",
      cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
      Icon: CheckCircle2,
    },
    in_progress: {
      label: "En cours",
      cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
      Icon: PlayCircle,
    },
    draft: {
      label: "Brouillon",
      cls: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
      Icon: Clock,
    },
  } as const

  const key = (["completed", "in_progress"] as const).includes(status as any)
    ? (status as keyof typeof map)
    : "draft"
  const M = map[key]
  const Icon = M.Icon

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${M.cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {M.label}
    </span>
  )
}

function formatTournamentTitle(difficulty: string, category: string, startDate: string | null) {
  const categoryLabels = {
    homme: 'Hommes',
    femme: 'Femmes',
    mixte: 'Mixte'
  }

  const categoryLabel = categoryLabels[category as keyof typeof categoryLabels] || 'Mixte'

  if (startDate) {
    const formattedDate = new Date(startDate).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    return `${difficulty} ${categoryLabel} ${formattedDate}`
  }

  return `${difficulty} ${categoryLabel}`
}

export default async function DashboardPage({
  searchParams,
}: {
  // Next 15 : searchParams peut être un Promise
  searchParams: Promise<Search>
}) {
  const { view = "current", category = "tous" } = await searchParams

  // Session utilisateur
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  console.log("🔍 Dashboard - Auth check:", {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    hasError: !!userErr,
    errorMessage: userErr?.message
  })

  if (userErr) console.error("getUser (dashboard):", userErr.message)
  if (!user) {
    console.log("❌ Dashboard - No user found, redirecting to login")
    redirect("/auth/login")
  }

  // Profil juge (facultatif)
  const { data: judge } = await supabase
    .from("judges")
    .select("id, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  // Compteurs (pratique pour les tuiles)
  const [{ count: currentCount }, { count: historyCount }] = await Promise.all([
    supabase
      .from("tournaments")
      .select("*", { count: "exact", head: true })
      .eq("judge_id", user.id)
      .in("status", CURRENT_STATUSES as unknown as string[]),
    supabase
      .from("tournaments")
      .select("*", { count: "exact", head: true })
      .eq("judge_id", user.id)
      .in("status", HISTORY_STATUSES as unknown as string[]),
  ])

  // Filtre + chargement des tournois listés
  const statuses = view === "history" ? [...HISTORY_STATUSES] : [...CURRENT_STATUSES]
  let tournamentsQuery = supabase
    .from("tournaments")
    .select("id, difficulty, created_at, status, category, start_date")
    .eq("judge_id", user.id)
    .in("status", statuses as unknown as string[])
    .order("created_at", { ascending: false })

  // Appliquer le filtre de catégorie si nécessaire
  if (category !== "tous") {
    tournamentsQuery = tournamentsQuery.eq("category", category)
  }

  const { data: tournaments, error: tErr } = await tournamentsQuery

  if (tErr) console.error("load tournaments:", tErr.message)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size={40} className="rounded-xl" />
              <Link
                href={`/dashboard/`}
                className="block -m-2 p-2 rounded-md hover:bg-muted/40 cursor-pointer"
              >
                <div>
                  <h1 className="text-xl font-bold">Padel Tournament Organizer</h1>
                </div>
              </Link>
            </div>
            <UserDropdown
              user={{
                first_name: judge?.first_name,
                last_name: judge?.last_name,
                email: user?.email,
                avatar_url: judge?.avatar_url,
              }}
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        {/* Actions rapides */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Nouveau tournoi */}
          <Link href="/dashboard/tournaments/new" className="block">
            <Card className="group cursor-pointer overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-50 to-blue-100/30 hover:from-blue-100 hover:to-white transition">
              <CardHeader className="text-center">
                <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center group-hover:scale-105 transition">
                  <Plus className="h-6 w-6" />
                </div>
                <CardTitle className="mt-2">Nouveau tournoi</CardTitle>
                <CardDescription>Créer et organiser un nouveau tournoi</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <ViewTabs
            currentView={view}
            currentCategory={category}
            currentCount={currentCount ?? undefined}
            historyCount={historyCount ?? undefined}
          />
        </section>

        {/* Filtres par catégorie */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {view === "history" ? "Tournois terminés" : "Mes tournois (brouillons & en cours)"}
            </h2>
            <CategoryFilter currentView={view} currentCategory={category} />
          </div>
        </section>

        {/* Liste filtrée */}
        <section>

          <div className="space-y-3">
            {(tournaments ?? []).length === 0 && (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-8 text-sm text-muted-foreground text-center">
                  Aucun tournoi à afficher pour ce filtre.
                </CardContent>
              </Card>
            )}

            {(tournaments ?? []).map((t) => (
              <Link key={t.id} href={`/dashboard/tournaments/${getTournamentSlugWithSuffix(t, tournaments || [])}`} className="block">
                <div className="group rounded-2xl border bg-card hover:bg-white/60 transition shadow-sm hover:shadow-md">
                  <div className="px-4 py-4 flex items-center gap-4">
                    <Logo size={40} className="shrink-0 rounded-xl" />

                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {formatTournamentTitle(t.difficulty, t.category || 'mixte', t.start_date)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Créé le {new Date(t.created_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                      <StatusBadge status={t.status} />
                      <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
