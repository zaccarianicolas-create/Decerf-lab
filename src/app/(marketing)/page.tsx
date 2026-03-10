import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FlaskConical,
  Shield,
  Zap,
  MessageSquare,
  Upload,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Star,
} from "lucide-react";

const services = [
  {
    icon: FlaskConical,
    title: "Prothèses fixes",
    description:
      "Couronnes, bridges, inlays/onlays en zircone, e.max, métal-céramique. Précision et esthétique remarquables.",
  },
  {
    icon: Shield,
    title: "Prothèses amovibles",
    description:
      "Prothèses partielles et complètes, châssis métalliques. Confort optimal pour vos patients.",
  },
  {
    icon: Zap,
    title: "Orthodontie",
    description:
      "Gouttières d'alignement, appareils orthodontiques sur mesure. Solutions modernes et discrètes.",
  },
  {
    icon: Upload,
    title: "Flux numérique",
    description:
      "Réception de fichiers STL, conception CFAO, impression 3D. Workflow 100% digital.",
  },
  {
    icon: MessageSquare,
    title: "Communication directe",
    description:
      "Chat en temps réel avec le laboratoire. Suivez l'avancement de vos travaux en temps réel.",
  },
  {
    icon: CreditCard,
    title: "Paiement simplifié",
    description:
      "Facturation claire et paiement en ligne sécurisé. Gestion de compte simplifiée.",
  },
];

const steps = [
  {
    step: "01",
    title: "Créez votre compte",
    description: "Inscription rapide et gratuite en tant que praticien.",
  },
  {
    step: "02",
    title: "Passez commande",
    description:
      "Décrivez vos travaux, envoyez vos fichiers STL et photos.",
  },
  {
    step: "03",
    title: "Suivi en temps réel",
    description:
      "Suivez l'avancement de vos commandes et échangez avec le labo.",
  },
  {
    step: "04",
    title: "Réception",
    description:
      "Recevez vos prothèses avec un contrôle qualité rigoureux.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
              <Star className="mr-1.5 h-3.5 w-3.5" />
              Laboratoire dentaire de confiance
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              L&apos;excellence dentaire à portée de{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                clic
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              DECERF LAB allie savoir-faire artisanal et technologie de pointe
              pour vous offrir des prothèses dentaires d&apos;exception. Commandez,
              suivez et échangez depuis votre espace dédié.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Créer mon espace praticien
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/#services">
                <Button variant="outline" size="lg">
                  Découvrir nos services
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative gradient */}
        <div className="absolute inset-x-0 -bottom-40 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="mx-auto aspect-[1155/678] w-[72rem] bg-gradient-to-tr from-blue-200 to-indigo-200 opacity-30" />
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Nos services
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Une gamme complète de solutions prothétiques pour répondre à tous
              vos besoins cliniques.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card
                key={service.title}
                className="group transition-all hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <service.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Comment ça marche ?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Un processus simple et efficace pour vos commandes de travaux.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* À propos */}
      <section id="about" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Un laboratoire à votre écoute
              </h2>
              <p className="mt-6 text-lg text-gray-600">
                Depuis sa création, DECERF LAB s&apos;engage à fournir des
                prothèses dentaires et orthodontiques de la plus haute qualité.
                Notre équipe de prothésistes qualifiés combine expertise
                traditionnelle et technologies numériques de dernière
                génération.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Équipe de prothésistes expérimentés",
                  "Technologie CFAO de dernière génération",
                  "Matériaux certifiés et traçabilité complète",
                  "Délais respectés et qualité garantie",
                  "Support et communication en temps réel",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 p-12">
              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                  <div className="text-3xl font-bold text-blue-600">15+</div>
                  <div className="mt-1 text-sm text-gray-500">
                    Années d&apos;expérience
                  </div>
                </div>
                <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                  <div className="text-3xl font-bold text-blue-600">500+</div>
                  <div className="mt-1 text-sm text-gray-500">
                    Praticiens partenaires
                  </div>
                </div>
                <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                  <div className="text-3xl font-bold text-blue-600">10k+</div>
                  <div className="mt-1 text-sm text-gray-500">
                    Prothèses réalisées
                  </div>
                </div>
                <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                  <div className="text-3xl font-bold text-blue-600">98%</div>
                  <div className="mt-1 text-sm text-gray-500">
                    Satisfaction client
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / CTA */}
      <section
        id="contact"
        className="bg-gradient-to-r from-blue-600 to-indigo-600 py-24 sm:py-32"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Prêt à collaborer avec nous ?
            </h2>
            <p className="mt-6 text-lg text-blue-100">
              Rejoignez les centaines de praticiens qui font confiance à DECERF
              LAB pour leurs travaux prothétiques. Inscription gratuite et sans
              engagement.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="gap-2 bg-white text-blue-600 hover:bg-blue-50"
                >
                  Créer mon compte gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="mailto:contact@decerflab.fr">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Nous contacter
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
