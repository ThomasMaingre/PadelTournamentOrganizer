// import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
// import { redirect } from "next/navigation"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Trophy, Users, Calendar, BarChart3 } from "lucide-react"
// import Link from "next/link"

// export default async function Home() {
//   // If Supabase is not configured, show setup message
//   if (!isSupabaseConfigured) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-background">
//         <Card className="w-full max-w-md">
//           <CardHeader className="text-center">
//             <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
//             <CardTitle className="text-2xl">Padel Tournament Organizer</CardTitle>
//             <CardDescription>Connectez Supabase pour commencer à organiser vos tournois</CardDescription>
//           </CardHeader>
//         </Card>
//       </div>
//     )
//   }

//   // Check if user is already logged in
//   const supabase = createClient()
//   const {
//     data: { user },
//   } = await supabase.auth.getUser()

//   // If user is logged in, redirect to dashboard
//   if (user) {
//     redirect("/dashboard")
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
//       <div className="container mx-auto px-4 py-16">
//         {/* Hero Section */}
//         <div className="text-center mb-16">
//           <div className="flex justify-center mb-6">
//             <Trophy className="h-16 w-16 text-primary" />
//           </div>
//           <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
//             Padel Tournament
//             <span className="text-primary block">Organizer</span>
//           </h1>
//           <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
//             La solution moderne pour les juges-arbitres de padel. Organisez vos tournois efficacement, sans papier, sans
//             erreur.
//           </p>
//           <div className="flex flex-col sm:flex-row gap-4 justify-center">
//             <Button asChild size="lg" className="text-lg px-8 py-6">
//               <Link href="/auth/login">Se connecter</Link>
//             </Button>
//             <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 bg-transparent">
//               <Link href="/auth/sign-up">Créer un compte</Link>
//             </Button>
//           </div>
//         </div>

//         {/* Features Section */}
//         <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
//           <Card className="text-center">
//             <CardHeader>
//               <Users className="h-12 w-12 text-primary mx-auto mb-4" />
//               <CardTitle>Gestion des joueurs</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <CardDescription>Enregistrez facilement les joueurs avec leur classement national</CardDescription>
//             </CardContent>
//           </Card>

//           <Card className="text-center">
//             <CardHeader>
//               <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
//               <CardTitle>Têtes de série</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <CardDescription>Calcul automatique des têtes de série selon les classements</CardDescription>
//             </CardContent>
//           </Card>

//           <Card className="text-center">
//             <CardHeader>
//               <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
//               <CardTitle>Organisation des matchs</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <CardDescription>Poules, phases finales et planning automatisés</CardDescription>
//             </CardContent>
//           </Card>

//           <Card className="text-center">
//             <CardHeader>
//               <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
//               <CardTitle>Classements</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <CardDescription>Suivi en temps réel et classement final automatique</CardDescription>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Benefits Section */}
//         <div className="text-center">
//           <h2 className="text-3xl font-bold text-foreground mb-8">Pourquoi choisir notre solution ?</h2>
//           <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
//             <div>
//               <h3 className="text-xl font-semibold text-foreground mb-4">⚡ Gain de temps</h3>
//               <p className="text-muted-foreground">Fini les calculs manuels et les erreurs de planning</p>
//             </div>
//             <div>
//               <h3 className="text-xl font-semibold text-foreground mb-4">📱 Responsive</h3>
//               <p className="text-muted-foreground">Utilisable sur tablette pendant vos tournois</p>
//             </div>
//             <div>
//               <h3 className="text-xl font-semibold text-foreground mb-4">🎯 Précision</h3>
//               <p className="text-muted-foreground">Organisation parfaite selon les règles officielles</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }




import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, Calendar, BarChart3 } from "lucide-react"
import Link from "next/link"

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
  if (userErr && userErr.message !== "Auth session missing!") {
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
            <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Trophy className="h-16 w-16 text-primary" />
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
              <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
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
          <h2 className="text-3xl font-bold text-foreground mb-8">Pourquoi choisir notre solution ?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">⚡ Gain de temps</h3>
              <p className="text-muted-foreground">Fini les calculs manuels et les erreurs de planning</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">📱 Responsive</h3>
              <p className="text-muted-foreground">Utilisable sur tablette pendant vos tournois</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">🎯 Précision</h3>
              <p className="text-muted-foreground">Organisation parfaite selon les règles officielles</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
