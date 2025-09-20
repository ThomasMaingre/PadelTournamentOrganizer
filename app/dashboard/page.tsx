// app/dashboard/page.tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { signOut } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Trophy,
  LogOut,
  Plus,
  CalendarCheck,
  History as HistoryIcon,
  ChevronRight,
  CheckCircle2,
  PlayCircle,
  Clock,
} from "lucide-react"

type Search = { view?: "current" | "history" }

const CURRENT_STATUSES = ["draft", "in_progress"] as const
const HISTORY_STATUSES = ["completed"] as const

function StatusBadge({ status }: { status: string }) {
  const map = {
    completed: {
      label: "Terminé",
      cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
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

export default async function DashboardPage({
  searchParams,
}: {
  // Next 15 : searchParams peut être un Promise
  searchParams: Promise<Search>
}) {
  const { view = "current" } = await searchParams

  // Session utilisateur
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr) console.error("getUser (dashboard):", userErr.message)
  if (!user) redirect("/auth/login")

  // Profil juge (facultatif)
  const { data: judge } = await supabase
    .from("judges")
    .select("id, first_name, last_name")
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
  const { data: tournaments, error: tErr } = await supabase
    .from("tournaments")
    .select("id, name, created_at, status")
    .eq("judge_id", user.id)
    .in("status", statuses as unknown as string[])
    .order("created_at", { ascending: false })

  if (tErr) console.error("load tournaments:", tErr.message)

  const tabCard = (active: boolean) =>
    `group rounded-2xl border bg-card/90 backdrop-blur hover:bg-card transition-all hover:shadow-md ${active ? "ring-2 ring-emerald-600" : "ring-0"
    }`

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600/10 text-emerald-700 grid place-items-center">
                <Trophy className="h-6 w-6" />
              </div>
              <Link
                href={`/dashboard/`}
                className="block -m-2 p-2 rounded-md hover:bg-muted/40 cursor-pointer"
              >
                <div>
                  <h1 className="text-xl font-bold">Padel Tournament Organizer</h1>
                  <p className="text-sm text-muted-foreground">
                    Bienvenue, {judge?.first_name ?? ""} {judge?.last_name ?? ""}
                  </p>
                </div>
              </Link>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        {/* Actions rapides */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Nouveau tournoi */}
          <Link href="/dashboard/tournaments/new" className="block">
            <Card className="group cursor-pointer overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50 to-emerald-100/30 hover:from-emerald-100 hover:to-white transition">
              <CardHeader className="text-center">
                <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-600/10 text-emerald-700 grid place-items-center group-hover:scale-105 transition">
                  <Plus className="h-6 w-6" />
                </div>
                <CardTitle className="mt-2">Nouveau tournoi</CardTitle>
                <CardDescription>Créer et organiser un nouveau tournoi</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Tournois en cours */}
          <Link href="/dashboard?view=current" className="block">
            <Card className={tabCard(view === "current")}>
              <CardHeader className="text-center">
                <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-600/10 text-emerald-700 grid place-items-center group-hover:scale-105 transition">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <CardTitle className="mt-2">
                  Tournois en cours {typeof currentCount === "number" ? `(${currentCount})` : ""}
                </CardTitle>
                <CardDescription>Brouillons &amp; En cours</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Historique */}
          <Link href="/dashboard?view=history" className="block">
            <Card className={tabCard(view === "history")}>
              <CardHeader className="text-center">
                <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-600/10 text-emerald-700 grid place-items-center group-hover:scale-105 transition">
                  <HistoryIcon className="h-6 w-6" />
                </div>
                <CardTitle className="mt-2">
                  Historique {typeof historyCount === "number" ? `(${historyCount})` : ""}
                </CardTitle>
                <CardDescription>Tournois terminés</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </section>

        {/* Liste filtrée */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            {view === "history" ? "Tournois terminés" : "Mes tournois (brouillons & en cours)"}
          </h2>

          <div className="space-y-3">
            {(tournaments ?? []).length === 0 && (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-8 text-sm text-muted-foreground text-center">
                  Aucun tournoi à afficher pour ce filtre.
                </CardContent>
              </Card>
            )}

            {(tournaments ?? []).map((t) => (
              <Link key={t.id} href={`/dashboard/tournaments/${t.id}`} className="block">
                <div className="group rounded-2xl border bg-card hover:bg-white/60 transition shadow-sm hover:shadow-md">
                  <div className="px-4 py-4 flex items-center gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600/10 text-emerald-700 grid place-items-center">
                      <Trophy className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold truncate">{t.name}</div>
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
