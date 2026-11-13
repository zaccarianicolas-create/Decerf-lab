import type { Metadata } from "next";
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
  Phone,
  Monitor,
  Truck,
  LogIn,
  Info,
} from "lucide-react";
import { formatAdresseLabo, getParametresLabo, safeHttpsUrl } from "@/lib/parametres-labo";

const homeTitle = "Laboratoire dentaire à Clavier | DECERF LAB";
const homeDescription = "Laboratoire dentaire et orthodontique à Clavier, Belgique. Prothèses dentaires et appareils sur mesure, flux numérique et accompagnement des praticiens.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: { canonical: "/" },
};

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

const orderMethods = [
  {
    title: "Par téléphone et fiche papier",
    image: "/images/fiche commande.png",
    imageAlt: "Empreinte dentaire et fiche de commande Decerf Lab",
    icon: Phone,
    buttonLabel: "Nous contacter",
    buttonHref: "/contact",
    buttonIcon: Phone,
    steps: [
      {
        title: "Contactez le laboratoire",
        description: "Échangeons sur votre besoin et le travail à réaliser.",
      },
      {
        title: "Préparez votre fiche et vos empreintes",
        description: "Complétez la fiche de commande et joignez vos empreintes (ou modèles).",
      },
      {
        title: "Organisation du ramassage et de la livraison",
        description: "Nous planifions ensemble l'enlèvement de vos empreintes et le retour de votre travail.",
      },
    ],
  },
  {
    title: "Via notre plateforme en ligne",
    image: "/images/pcplateforme.png",
    imageAlt: "Plateforme de commande Decerf Lab affichée sur un ordinateur",
    icon: Monitor,
    buttonLabel: "Accéder à mon espace",
    buttonHref: "/login",
    buttonIcon: LogIn,
    steps: [
      {
        title: "Créez votre compte gratuitement",
        description: "Inscription simple et rapide en tant que praticien.",
      },
      {
        title: "Passez votre commande",
        description: "Décrivez le travail à réaliser et ajoutez vos fichiers (STL, photos, etc.) ou indiquez que vous souhaitez l'envoi d'empreintes / modèles physiques.",
      },
      {
        title: "Demandez un ramassage si nécessaire",
        description: "Planifiez l'enlèvement de vos empreintes, modèles ou travaux, directement depuis la plateforme, en quelques clics.",
        icon: Truck,
      },
      {
        title: "Suivez et recevez votre réalisation",
        description: "Suivez l'avancement de votre commande, échangez avec le labo et recevez votre prothèse après contrôle qualité.",
      },
    ],
  },
];

export default async function HomePage() {
  const labo = await getParametresLabo();
  const siteUrl = safeHttpsUrl(labo.site_web) || "https://www.decerf-lab.be";
  const address = formatAdresseLabo(labo);
  const sameAs = [
    labo.reseau_facebook_url,
    labo.reseau_instagram_url,
    labo.reseau_linkedin_url,
    labo.reseau_x_url,
  ].map(safeHttpsUrl).filter((url): url is string => Boolean(url));
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: labo.nom_labo || "DECERF LAB",
    description: homeDescription,
    url: siteUrl,
    logo: `${siteUrl}/images/logod.png`,
    image: `${siteUrl}/images/bann%20site.png`,
    ...(labo.email_contact ? { email: labo.email_contact } : {}),
    ...(labo.telephone ? { telephone: labo.telephone } : {}),
    ...(address ? {
      address: {
        "@type": "PostalAddress",
        ...(labo.adresse ? { streetAddress: labo.adresse } : {}),
        ...(labo.code_postal ? { postalCode: labo.code_postal } : {}),
        ...(labo.ville ? { addressLocality: labo.ville } : {}),
        ...(labo.pays ? { addressCountry: labo.pays } : {}),
      },
    } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    areaServed: labo.pays || "Belgique",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services du laboratoire dentaire",
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service.title,
          description: service.description,
        },
      })),
    },
  };
  const safeJsonLd = JSON.stringify(localBusiness).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd }} />
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
      <section id="services" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-sky-600">
              Nos services
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Au service de votre pratique
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Une gamme complète de solutions pour répondre à vos besoins
              cliniques, avec un accompagnement flexible, numérique ou traditionnel.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 3).map((service) => (
              <Card
                key={service.title}
                className="stagger-item group h-full rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
              >
                <CardContent className="p-5 sm:p-6">
                  <div
                    className={`relative mb-4 inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl ${service.color}`}
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
                  <h3 className="font-display text-xl font-semibold text-slate-900">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-14 grid gap-10 border-t border-slate-200 pt-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-600">
                Un laboratoire de proximité
              </p>
              <h3 className="font-display mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                La technologie soutient le savoir-faire, elle ne le remplace pas.
              </h3>
              <p className="mt-4 max-w-xl leading-relaxed text-slate-600">
                Un suivi direct avec l&apos;équipe, des échanges simples et une attention portée à chaque réalisation, de la réception des fichiers jusqu&apos;à la finition.
              </p>
            </div>

            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {services.slice(3).map((service) => (
                <div key={service.title} className="flex items-start gap-4 py-4 first:pt-4">
                  <span
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${service.color}`}
                  >
                    {service.icon && <service.icon aria-hidden="true" className="h-5 w-5" />}
                  </span>
                  <div className="pt-0.5">
                    <h4 className="font-semibold text-slate-900">
                      {service.title}
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                      {service.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="comment-ca-marche" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center sm:mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
              Commander au laboratoire
            </p>
            <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Deux façons de commander, un même accompagnement
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-lg text-slate-600">
              Avec ou sans scanner intra-oral, Decerf Lab s&apos;adapte à votre façon de travailler.
            </p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
            {orderMethods.map((method) => (
              <article
                key={method.title}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5"
              >
                <div className="relative h-52 w-full sm:h-56">
                  <Image
                    src={method.image}
                    alt={method.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover object-center"
                  />
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="mb-5 flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                      <method.icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <h3 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                      {method.title}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {method.steps.map((step, index) => (
                      <div key={step.title} className="flex gap-3">
                        <div className="flex w-9 shrink-0 flex-col items-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {index < method.steps.length - 1 && (
                            <span className="mt-1 w-px flex-1 bg-sky-200" />
                          )}
                        </div>
                        <div className="pb-3">
                          {step.icon && (
                            <step.icon aria-hidden="true" className="mb-1 h-5 w-5 text-sky-600" />
                          )}
                          <h4 className="text-sm font-bold text-slate-900 sm:text-base">
                            {step.title}
                          </h4>
                          <p className="mt-0.5 text-sm leading-snug text-slate-600">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-4 text-center">
                    <Link href={method.buttonHref}>
                      <Button className="h-11 w-full max-w-xs gap-2 bg-sky-600 px-6 text-white hover:bg-sky-700">
                        <method.buttonIcon aria-hidden="true" className="h-5 w-5" />
                        {method.buttonLabel}
                      </Button>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 flex items-start justify-center gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-700 sm:mt-6 sm:items-center">
            <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 sm:mt-0" />
            <p>
              <span className="font-semibold text-slate-900">
                Commande en ligne ou par téléphone, avec envoi de fichiers ou d&apos;empreintes physiques :
              </span>{" "}
              à vous de choisir, le service et la qualité Decerf Lab restent les mêmes.
            </p>
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