import Link from "next/link";
import Image from "next/image";
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
  Quote,
  Microscope,
  Clock,
  Award,
} from "lucide-react";

const services = [
  {
    icon: FlaskConical,
    title: "Prothèses fixes",
    description:
      "Couronnes, bridges, inlays/onlays en zircone, e.max, métal-céramique.",
    color: "bg-sky-50 text-sky-600",
  },
  {
    icon: Shield,
    title: "Prothèses amovibles",
    description:
      "Prothèses partielles et complètes, châssis métalliques. Confort optimal.",
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: Zap,
    title: "Orthodontie",
    description:
      "Gouttières d'alignement, appareils orthodontiques sur mesure.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Upload,
    title: "Flux numérique",
    description:
      "Réception STL, conception CFAO, impression 3D. Workflow 100% digital.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: MessageSquare,
    title: "Communication directe",
    description:
      "Chat en temps réel et suivi d'avancement de vos travaux.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: CreditCard,
    title: "Paiement simplifié",
    description:
      "Facturation claire et paiement en ligne sécurisé.",
    color: "bg-emerald-50 text-emerald-600",
  },
];

const steps = [
  {
    step: "01",
    title: "Créez votre compte",
    description: "Inscription rapide et gratuite en tant que praticien.",
    icon: Award,
  },
  {
    step: "02",
    title: "Passez commande",
    description: "Décrivez vos travaux, envoyez fichiers STL et photos.",
    icon: Upload,
  },
  {
    step: "03",
    title: "Suivi en temps réel",
    description: "Suivez l'avancement et échangez directement avec le labo.",
    icon: Clock,
  },
  {
    step: "04",
    title: "Réception",
    description: "Recevez vos prothèses avec contrôle qualité rigoureux.",
    icon: CheckCircle2,
  },
];

const testimonials = [
  {
    name: "Dr. Sophie Martin",
    role: "Chirurgien-dentiste, Paris",
    content:
      "La qualité des prothèses est remarquable. Le flux numérique et le suivi en temps réel ont transformé ma collaboration avec le labo.",
  },
  {
    name: "Dr. Pierre Durand",
    role: "Orthodontiste, Lyon",
    content:
      "Les gouttières sont d'une précision exceptionnelle. L'espace en ligne me fait gagner un temps considérable sur chaque cas.",
  },
  {
    name: "Dr. Claire Lefèvre",
    role: "Chirurgien-dentiste, Marseille",
    content:
      "Enfin un labo qui communique vraiment. Le chat intégré et les notifications d'avancement, c'est exactement ce qu'il nous fallait.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[65vh] overflow-hidden">
        {/* Background image + overlay */}
        <Image
          src="/images/bann.png"
          alt="Laboratoire dentaire DECERF LAB"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-sky-900/50" />

        {/* Content */}
        <div className="relative z-10 mx-auto flex min-h-[65vh] max-w-4xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="animate-fade-in-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-900/40 px-4 py-1.5 text-sm font-medium text-sky-200 backdrop-blur-sm">
              <Microscope className="h-4 w-4" />
              Laboratoire dentaire &amp; orthodontique
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              La précision au service de{" "}
              <span className="bg-gradient-to-r from-sky-300 to-teal-300 bg-clip-text text-transparent">
                votre pratique
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              DECERF LAB allie savoir-faire artisanal et technologie de pointe.
              Commandez, suivez et échangez depuis votre espace dédié — tout
              est pensé pour simplifier votre quotidien.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="gap-2 bg-sky-600 px-6 hover:bg-sky-500"
                >
                  Créer mon espace praticien
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/#services">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-white/10 px-6 text-white backdrop-blur-sm hover:bg-white/20"
                >
                  Découvrir nos services
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex items-center justify-center gap-8 border-t border-white/10 pt-10">
              <div>
                <div className="text-2xl font-bold text-white">15+</div>
                <div className="text-sm text-slate-400">ans d&apos;expérience</div>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <div className="text-2xl font-bold text-white">6000+</div>
                <div className="text-sm text-slate-400">travaux réalisés</div>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <div className="text-2xl font-bold text-white">24h</div>
                <div className="text-sm text-slate-400">délai de réponse</div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating quality card */}
        <div className="absolute bottom-8 right-6 z-10 rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md sm:right-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/20">
              <CheckCircle2 className="h-5 w-5 text-teal-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Qualité certifiée
              </div>
              <div className="text-xs text-slate-300">
                Matériaux traçables &amp; CE
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-sky-600">
              Nos services
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Tout pour vos travaux prothétiques
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Une gamme complète de solutions pour répondre à tous vos besoins
              cliniques, avec un workflow entièrement digitalisé.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card
                key={service.title}
                className="stagger-item group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${service.color} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <service.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Image */}
            <div className="relative">
              <div className="overflow-hidden rounded-2xl">
                <Image
                  src="/images/process-lab.jpg"
                  alt="Confection de prothèses en laboratoire dentaire"
                  width={800}
                  height={600}
                  className="h-auto w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 -z-10 h-64 w-64 rounded-2xl bg-sky-100" />
            </div>

            {/* Steps */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-600">
                Comment ça marche
              </p>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Simple, rapide, transparent
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                De la commande à la réception, un processus fluide en 4 étapes.
              </p>

              <div className="mt-8 space-y-6">
                {steps.map((step, index) => (
                  <div key={step.step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
                        {step.step}
                      </div>
                      {index < steps.length - 1 && (
                        <div className="mt-2 h-full w-px bg-sky-200" />
                      )}
                    </div>
                    <div className={index < steps.length - 1 ? "pb-8" : "pb-0"}>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-600">
                À propos
              </p>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Un laboratoire à la croisée de l&apos;artisanat et de
                l&apos;innovation
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                DECERF LAB est né de la passion et du savoir-faire de Julie
                Decerf, prothésiste dentaire forte de plus de 15 ans
                d&apos;expérience en laboratoire. Un projet personnel, pensé
                pour offrir aux praticiens un partenaire fiable, réactif et
                techniquement exigeant.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-500">
                Ici, chaque travail est suivi de A à Z avec soin. Pas de
                production de masse — une équipe à taille humaine qui connaît
                vos habitudes, respecte vos délais et vous répond en moins de
                24h.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Prothésiste qualifiée, plus de 15 ans d'expérience terrain",
                  "Impression 3D et scan numérique intégrés au workflow",
                  "Matériaux certifiés CE avec traçabilité complète",
                  "Délais respectés et contrôle qualité rigoureux",
                  "Interlocutrice unique — vous savez toujours à qui vous parlez",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-500" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="gap-2 bg-sky-600 hover:bg-sky-700"
                  >
                    Rejoindre DECERF LAB
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Image + stats */}
            <div className="relative">
              <div className="overflow-hidden rounded-2xl">
                {/* Remplacer par : src="/images/julie-decerf.jpg" */}
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-slate-200">
                  <span className="text-sm text-slate-400">Photo de Julie Decerf</span>
                </div>
              </div>
              <div className="absolute -bottom-8 left-4 right-4 grid grid-cols-2 gap-3 sm:left-8 sm:right-8">
                <div className="rounded-xl border border-white/60 bg-white/90 p-4 text-center shadow-lg backdrop-blur-sm">
                  <div className="text-2xl font-bold text-sky-600">6000+</div>
                  <div className="text-xs text-slate-500">
                    Prothèses réalisées
                  </div>
                </div>
                <div className="rounded-xl border border-white/60 bg-white/90 p-4 text-center shadow-lg backdrop-blur-sm">
                  <div className="text-2xl font-bold text-teal-600">100%</div>
                  <div className="text-xs text-slate-500">Digital workflow</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-sky-600">
              Témoignages
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              La confiance de nos praticiens
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.name}
                className="border-0 bg-slate-50 shadow-none"
              >
                <CardContent className="p-6">
                  <Quote className="mb-4 h-8 w-8 text-sky-200" />
                  <p className="text-sm leading-relaxed text-slate-600">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-600">
                      {testimonial.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {testimonial.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="relative overflow-hidden bg-slate-900 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Prêt à travailler avec un labo qui vous comprend ?
            </h2>
            <p className="mt-6 text-lg text-slate-300">
              Rejoignez les centaines de praticiens qui font confiance à DECERF
              LAB. Inscription gratuite, sans engagement.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="gap-2 bg-sky-500 px-8 hover:bg-sky-400"
                >
                  Créer mon compte gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-sky-200/70 bg-slate-900/30 px-8 text-sky-100 hover:border-sky-100 hover:bg-slate-800/70 hover:text-white"
                >
                  Nous contacter
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[600px] w-[600px] rounded-full bg-sky-900/30 blur-3xl" />
        </div>
      </section>
    </>
  );
}