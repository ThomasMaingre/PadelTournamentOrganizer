import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Logo from "@/components/ui/logo"

export default function RGPDPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <Logo size={32} />
                <h1 className="text-xl font-bold">Protection des données personnelles</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-card rounded-lg shadow-sm border p-8">
          <h1 className="text-3xl font-bold mb-6">Politique de Protection des Données Personnelles (RGPD)</h1>

          <div className="space-y-6 text-sm leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Responsable du traitement</h2>
              <p>
                Cette application de gestion de tournois de padel collecte et traite vos données personnelles
                dans le cadre de l'organisation d'événements sportifs.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Données collectées</h2>
              <p>Nous collectons uniquement les données nécessaires au fonctionnement de l'application :</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Informations d'authentification (email, mot de passe chiffré)</li>
                <li>Données des joueurs (prénom, nom, classement national)</li>
                <li>Résultats de matchs et classements</li>
                <li>Données techniques de connexion</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Finalité du traitement</h2>
              <p>Vos données sont utilisées exclusivement pour :</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>La gestion des tournois de padel</li>
                <li>L'organisation des équipes et des matchs</li>
                <li>Le calcul des classements et résultats</li>
                <li>L'amélioration de l'expérience utilisateur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Base légale</h2>
              <p>
                Le traitement de vos données repose sur votre consentement libre et éclairé,
                ainsi que sur l'intérêt légitime de l'organisation d'événements sportifs.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Hébergement et sécurité</h2>
              <p>
                Vos données sont hébergées de manière sécurisée par Supabase, une plateforme certifiée
                qui respecte les standards de sécurité européens et américains. Toutes les données
                sont chiffrées en transit et au repos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Durée de conservation</h2>
              <p>
                Vos données sont conservées pendant la durée nécessaire à la gestion des tournois,
                et supprimées automatiquement après 3 ans d'inactivité.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Vos droits</h2>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Droit d'accès à vos données personnelles</li>
                <li>Droit de rectification des données inexactes</li>
                <li>Droit à l'effacement de vos données</li>
                <li>Droit à la portabilité de vos données</li>
                <li>Droit d'opposition au traitement</li>
                <li>Droit de retrait de votre consentement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Partage des données</h2>
              <p>
                Aucune donnée personnelle n'est partagée avec des tiers à des fins commerciales.
                Les données des tournois peuvent être visibles par les autres participants
                uniquement dans le cadre de la compétition.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Cookies</h2>
              <p>
                Cette application utilise uniquement des cookies techniques nécessaires
                au fonctionnement de l'authentification et de la navigation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
              <p>
                Pour exercer vos droits ou pour toute question relative à la protection
                de vos données personnelles, vous pouvez nous contacter via les paramètres
                de votre compte utilisateur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Mise à jour</h2>
              <p>
                Cette politique peut être mise à jour pour refléter les évolutions de l'application
                ou de la réglementation. La date de dernière mise à jour est indiquée ci-dessous.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t text-center text-muted-foreground">
              <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}