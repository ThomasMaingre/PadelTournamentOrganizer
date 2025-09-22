import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, Calendar, BarChart3, Medal } from "lucide-react"
import Link from "next/link"
import Logo from "@/components/ui/logo"

export default async function Home() {
  // On essaie d'initialiser Supabase côté serveur.
  // Si les variables d'env manquent (ou autre souci), on affiche le message "Connectez Supabase…"
  let supabaseOk = true
  let user: any = null

  try {
  const supabase = await createSupabaseServerClient()

  // Déstructuration cohérente + noms explicites
  const { data: userData, error: userErr } = await supabase.auth.getUser()

  // Pas de panique si "Auth session missing!" : c'est normal quand on n'est pas connecté
  // Aussi ignorer "refresh_token_not_found" qui arrive avec des sessions expirées
  if (userErr &&
      userErr.message !== "Auth session missing!" &&
      userErr.code !== "refresh_token_not_found") {
    console.error("Supabase getUser error (home):", userErr.message)
  }

  user = userData?.user ?? null
} catch (e) {
  supabaseOk = false
  console.error("Supabase init error (home):", e)
}


  // Ancien "isSupabaseConfigured": on garde le même rendu si Supabase n'est pas prêt
  if (!supabaseOk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Logo size={48} className="mx-auto mb-4" />
            <CardTitle className="text-2xl">Padel Tournament Organizer</CardTitle>
            <CardDescription>Connectez Supabase pour commencer à organiser vos tournois</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Si l'utilisateur est connecté → dashboard
  if (user) {
    redirect("/dashboard")
  }

  // Landing publique (identique à ton code)
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex flex-col">
      <div className="container mx-auto px-4 py-16 flex-1">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Logo size={64} />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Padel Tournament
            <span className="text-primary block">Organizer</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            La solution moderne pour les juges-arbitres de padel. Organisez vos tournois efficacement, sans papier, sans
            erreur.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link href="/auth/login">Se connecter</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 bg-transparent">
              <Link href="/auth/sign-up">Créer un compte</Link>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Gestion des joueurs</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Enregistrez facilement les joueurs avec leur classement national</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Medal className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Têtes de série</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Calcul automatique des têtes de série selon les classements</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Organisation des matchs</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Poules, phases finales et planning automatisés</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Classements</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Suivi en temps réel et classement final automatique</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-8">Les avantages de notre plateforme</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Efficacité maximale</h3>
              <p className="text-muted-foreground">Automatisation complète des calculs et du planning. Plus d'erreurs humaines, plus de temps perdu en calculs manuels fastidieux.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Mobilité totale</h3>
              <p className="text-muted-foreground">Interface optimisée pour tablettes et smartphones. Gérez vos tournois directement sur le terrain, en temps réel.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Conformité garantie</h3>
              <p className="text-muted-foreground">Respect strict des règlements FFT et FIP. Organisation professionnelle conforme aux standards officiels du padel.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <Link
              href="/rgpd"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Protection des données personnelles (RGPD)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
