import Link from "next/link";
import Image from "next/image";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
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

type LineIconProps = { className?: string };
type Service = {
  icon?: ComponentType<{ className?: string }>;
  illustration?: ComponentType<LineIconProps>;
  title: string;
  description: string;
  color: string;
};

function RemovableProsthesisIcon({ className }: LineIconProps) {
  return (
    <svg viewBox="0 0 120 80" fill="none" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        <path d="M17 13c2 22 17 43 43 55 26-12 41-33 43-55" />
        <path d="M26 15c3 18 14 33 34 43 20-10 31-25 34-43" />
        <path d="M27 18c5 4 10 6 15 7m-6 8c5 3 10 5 15 6m3 2c4 1 8 1 12 0m7-2c5-1 10-3 15-6m-6-8c5-1 10-3 15-7" />
        <rect x="25" y="19" width="8" height="11" rx="3" transform="rotate(-22 25 19)" />
        <rect x="37" y="29" width="8" height="11" rx="3" transform="rotate(-34 37 29)" />
        <rect x="49" y="37" width="8" height="11" rx="3" transform="rotate(-12 49 37)" />
        <rect x="63" y="37" width="8" height="11" rx="3" transform="rotate(12 63 37)" />
        <rect x="75" y="29" width="8" height="11" rx="3" transform="rotate(34 75 29)" />
        <rect x="87" y="19" width="8" height="11" rx="3" transform="rotate(22 87 19)" />
      </g>
    </svg>
  );
}

function ThermoformedAlignerIcon({ className }: LineIconProps) {
  return (
    <svg viewBox="0 0 120 80" fill="none" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        <path d="M17 13c2 22 17 43 43 55 26-12 41-33 43-55" />
        <path d="M23 13c2 22 15 39 37 49 22-10 35-27 37-49" />
        <path d="M29 16c3 18 13 31 31 40 18-9 28-22 31-40" />
        <path d="M27 20c6 3 12 5 18 6m-6 10c6 2 12 4 18 4m6 0c6 0 12-2 18-4m6-10c6-1 12-3 18-6" />
        <path d="M22 22c7 4 15 7 23 8m30 0c8-1 16-4 23-8" />
      </g>
    </svg>
  );
}

function OrthodonticApplianceIcon({ className }: LineIconProps) {
  return (
    <svg viewBox="0 0 120 80" fill="none" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        <path d="M17 13c2 22 17 43 43 55 26-12 41-33 43-55" />
        <path d="M24 15c3 18 14 33 36 43 22-10 33-25 36-43" />
        <path d="M21 23c11 8 24 12 39 12s28-4 39-12" />
        <path d="M24 26c11 8 23 12 36 12s25-4 36-12" />
        <rect x="22" y="21" width="9" height="10" rx="1.5" transform="rotate(-18 22 21)" />
        <rect x="37" y="28" width="9" height="10" rx="1.5" transform="rotate(-10 37 28)" />
        <rect x="55.5" y="30" width="9" height="10" rx="1.5" />
        <rect x="74" y="28" width="9" height="10" rx="1.5" transform="rotate(10 74 28)" />
        <rect x="89" y="21" width="9" height="10" rx="1.5" transform="rotate(18 89 21)" />
      </g>
    </svg>
  );
}

const services: Service[] = [
  {
    illustration: RemovableProsthesisIcon,
    title: "Prothèses amovibles",
    description:
      "Prothèses partielles et complètes, châssis métalliques. Confort optimal.",
    color: "text-[#354f73]",
  },
  {
    illustration: OrthodonticApplianceIcon,
    title: "Appareils orthodontiques",
    description:
      "Appareils orthodontiques sur mesure, plaques de Hawley et appareils de contention amovibles.",
    color: "text-[#354f73]",
  },
  {
    illustration: ThermoformedAlignerIcon,
    title: "Gouttières thermoformées",
    description:
      "Contention, bruxisme, blanchiment et protections sportives.",
    color: "text-[#354f73]",
  },
  {
    icon: Upload,
    title: "Flux numérique",
    description:
      "Réception STL, conception CAO, impression 3D. Workflow 100% digital.",
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
    title: "Facturation claire",
    description:
      "Factures archivées, statuts et soldes dus consultables dans votre espace.",
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
    description: "Décrivez les travaux, envoyez vos fichiers STL et photos, ou demandez un ramassage.",
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
      <section className="relative min-h-[560px] overflow-hidden bg-slate-950 sm:min-h-[600px] lg:min-h-[min(72vh,660px)]">
        <Image
          src="/images/hero-lab-v2.jpg"
          alt="Modèle dentaire en cours de scan numérique au laboratoire"
          fill
          className="object-cover object-[68%_center]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/45 to-slate-950/10" />

        <div className="relative z-10 mx-auto flex min-h-[560px] max-w-7xl items-center px-4 py-14 sm:min-h-[600px] sm:px-6 lg:min-h-[min(72vh,660px)] lg:px-8">
          <div className="animate-fade-in-up max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 border-l-2 border-teal-300 pl-3 text-sm font-semibold text-teal-100">
              <Microscope className="h-4 w-4" />
              Prothèse dentaire · Orthodontie · Flux numérique
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Bien plus qu’une prothèse,
              <br />
              <span className="text-teal-200">un savoir-faire.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white sm:text-lg">
              Prothèses dentaires et appareils orthodontiques sur mesure, réalisés
              rapidement et avec précision. Une réparation urgente ? Contactez
              directement le laboratoire pour trouver la meilleure solution.
            </p>
            <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row">
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
                  className="border-white/50 bg-slate-950/20 px-6 text-white backdrop-blur-sm hover:bg-white/15"
                >
                  Découvrir nos services
                </Button>
              </Link>
            </div>

            <div className="mt-9 flex items-center justify-start gap-5 border-t border-white/25 pt-6 sm:gap-8">
              <div>
                <div className="text-2xl font-bold text-white">15+</div>
                <div className="text-sm text-white/80">ans d&apos;expérience</div>
              </div>
              <div className="h-10 w-px bg-white/35" />
              <div>
                <div className="text-2xl font-bold text-white">6000+</div>
                <div className="text-sm text-white/80">travaux réalisés</div>
              </div>
              <div className="h-10 w-px bg-white/35" />
              <div>
                <div className="text-2xl font-bold text-white">24h</div>
                <div className="text-sm text-white/80">délai de réponse</div>
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
                    className={service.illustration
                      ? `mb-4 inline-flex h-14 w-24 items-center justify-center ${service.color} transition-transform duration-300 group-hover:scale-105`
                      : `mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${service.color} transition-transform duration-300 group-hover:scale-110`}
                  >
                    {service.illustration ? (
                      <service.illustration className="h-full w-full" />
                    ) : service.icon ? (
                      <service.icon className="h-6 w-6" />
                    ) : null}
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
      <section id="comment-ca-marche" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Image */}
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-slate-200/70">
                <Image
                  src="/images/process-lab.jpg"
                  alt="Confection de prothèses en laboratoire dentaire"
                  width={800}
                  height={600}
                  className="h-auto w-full object-cover object-center"
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

              <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-sm font-semibold text-sky-900">
                  Vous n&apos;avez pas de scanner intra-oral ?
                </p>
                <p className="mt-1 text-sm text-sky-800">
                  Aucun souci: le laboratoire travaille aussi avec les empreintes
                  et modèles en plâtre traditionnels.
                </p>
                <div className="mt-3">
                  <Link href="/contact">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-sky-200 bg-white text-sky-700 hover:bg-sky-100"
                    >
                      Parler à un technicien
                    </Button>
                  </Link>
                </div>
              </div>

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
              Rejoignez les praticiens qui font confiance à DECERF LAB.
              Inscription gratuite, sans engagement.
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