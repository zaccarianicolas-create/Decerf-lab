import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PartnersBand } from "@/components/partners/partners-band";
import {
  MessageSquare,
  Upload,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Microscope,
  Clock,
  Award,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Service = {
  icon?: typeof Upload;
  image?: string;
  title: string;
  description: string;
  color: string;
};

const services: Service[] = [
  {
    image: "/images/protheses_amovibles.png",
    title: "Prothèses amovibles",
    description:
      "Prothèses partielles et complètes, châssis métalliques. Confort optimal.",
    color: "bg-teal-50 text-teal-600",
  },
  {
    image: "/images/appareils_orthodontiques.png",
    title: "Appareils orthodontiques",
    description:
      "Appareils orthodontiques sur mesure, plaques de Hawley et appareils de contention amovibles.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    image: "/images/gouttieres_thermoformees.png",
    title: "Gouttières thermoformées",
    description:
      "Contention, bruxisme, blanchiment et protections sportives.",
    color: "bg-sky-50 text-sky-600",
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

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[560px] overflow-hidden bg-slate-950 sm:min-h-[600px] lg:min-h-[min(72vh,660px)]">
        <Image
          src="/images/bann site.png"
          alt="Prothésiste ajustant un modèle dentaire sur articulateur"
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
                    className={`relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${service.color} transition-transform duration-300 group-hover:scale-110`}
                  >
                    {service.image ? (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 max-w-none -translate-x-1/2 -translate-y-1/2 bg-current"
                        style={{
                          maskImage: `url(${service.image})`,
                          maskPosition: "center",
                          maskRepeat: "no-repeat",
                          maskSize: "contain",
                          WebkitMaskImage: `url(${service.image})`,
                          WebkitMaskPosition: "center",
                          WebkitMaskRepeat: "no-repeat",
                          WebkitMaskSize: "contain",
                        }}
                      />
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
                  src="/images/empreinte.jpeg"
                  alt="Empreinte dentaire tenue par des mains gantées"
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

            <div className="mx-auto w-full max-w-3xl">
              <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_250px_minmax(0,1fr)] lg:gap-3">
                <div className="hidden flex-col items-end gap-3 lg:flex">
                  <div className="relative max-w-40 rounded-xl border border-sky-100 bg-white/95 px-3 py-3 text-center text-sm font-medium leading-snug text-sky-700 shadow-sm lg:-translate-x-2 lg:-translate-y-12">
                    Échanges directs avec la prothésiste
                  </div>
                  <div className="relative max-w-40 rounded-xl border border-violet-100 bg-white/95 px-3 py-3 text-center text-sm font-medium leading-snug text-violet-700 shadow-sm lg:translate-x-2 lg:translate-y-8">
                    Une collaboration en toute confiance
                  </div>
                </div>
                <figure className="relative mx-auto w-full max-w-[375px] lg:max-w-[250px]">
                  <div className="relative mx-auto h-[460px] w-full max-w-[310px] sm:h-[560px] sm:max-w-[375px] lg:h-[500px] lg:max-w-[250px]">
                    <Image
                      src="/images/julie-decerf-portrait.png"
                      alt="Julie Decerf, prothésiste dentaire chez DECERF LAB"
                      fill
                      sizes="(min-width: 1024px) 250px, 80vw"
                      className="object-contain object-bottom"
                    />
                  </div>
                  <figcaption className="mt-2 text-center text-sm font-medium text-slate-800">
                    Julie Decerf <span className="font-normal text-slate-500">· Prothésiste dentaire</span>
                  </figcaption>
                </figure>
                <div className="hidden flex-col items-start gap-3 lg:flex">
                  <div className="relative max-w-40 rounded-xl border border-amber-100 bg-white/95 px-3 py-3 text-center text-sm font-medium leading-snug text-amber-700 shadow-sm lg:translate-x-3 lg:translate-y-2">
                    À l’écoute de vos préférences
                  </div>
                  <div className="relative max-w-40 rounded-xl border border-teal-100 bg-white/95 px-4 py-3 text-center text-sm font-medium leading-snug text-teal-700 shadow-sm lg:-translate-x-2 lg:translate-y-14">
                    Réparation d’urgence
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2 lg:hidden">
                <div className="max-w-full rounded-xl border border-sky-100 bg-white/95 px-3 py-3 text-center text-sm font-medium leading-snug text-sky-700 shadow-sm">
                  Échanges directs avec la prothésiste
                </div>
                <div className="max-w-full rounded-xl border border-violet-100 bg-white/95 px-3 py-3 text-center text-sm font-medium leading-snug text-violet-700 shadow-sm">
                  Une collaboration en toute confiance
                </div>
                <div className="max-w-full rounded-xl border border-amber-100 bg-white/95 px-3 py-3 text-center text-sm font-medium leading-snug text-amber-700 shadow-sm">
                  À l’écoute de vos préférences
                </div>
                <div className="rounded-xl border border-teal-100 bg-white/95 px-4 py-3 text-center text-sm font-medium text-teal-700 shadow-sm">
                  Réparation d’urgence
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PartnersBand />

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