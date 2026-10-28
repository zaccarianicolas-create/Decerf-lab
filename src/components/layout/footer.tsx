import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { formatAdresseLabo, getParametresLabo, safeHttpsUrl } from "@/lib/parametres-labo";

export async function Footer() {
  const labo = await getParametresLabo();
  const adresse = formatAdresseLabo(labo);
  const socialLinks = [
    { label: "Facebook", href: safeHttpsUrl(labo.reseau_facebook_url), Icon: Facebook },
    { label: "Instagram", href: safeHttpsUrl(labo.reseau_instagram_url), Icon: Instagram },
    { label: "LinkedIn", href: safeHttpsUrl(labo.reseau_linkedin_url), Icon: Linkedin },
    { label: "X (Twitter)", href: safeHttpsUrl(labo.reseau_x_url), Icon: Twitter },
  ].filter((social) => social.href);

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex flex-col items-start">
              <Image
                src="/images/logod.png"
                alt={labo.nom_labo}
                width={180}
                height={50}
                className="h-12 w-auto"
              />
              <span className="-mt-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-slate-400">
                Laboratoire dentaire
              </span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
              Votre partenaire de confiance pour des prothèses dentaires de haute
              qualité. Technologie de pointe et savoir-faire artisanal au service
              de votre pratique.
            </p>
            {socialLinks.length > 0 && (
              <nav aria-label="Réseaux sociaux du laboratoire" className="mt-5 flex items-center gap-2">
                {socialLinks.map(({ label, href, Icon }) => href && (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-sky-300 hover:text-sky-700"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </nav>
            )}
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900">
              Liens rapides
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/#services"
                  className="text-sm text-slate-500 transition-colors hover:text-sky-600"
                >
                  Nos services
                </Link>
              </li>
              <li>
                <Link
                  href="/#about"
                  className="text-sm text-slate-500 transition-colors hover:text-sky-600"
                >
                  À propos
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-slate-500 transition-colors hover:text-sky-600"
                >
                  Espace praticien
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-slate-500 transition-colors hover:text-sky-600"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900">
              Contact
            </h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-2 text-sm text-slate-500">
                <Phone className="h-4 w-4 text-slate-400" />
                {labo.telephone ? (
                  <a href={`tel:${labo.telephone.replace(/\(0\)|[^+\d]/g, "")}`} className="hover:text-sky-600">{labo.telephone}</a>
                ) : <span>Téléphone à compléter</span>}
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-500">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{labo.email_contact || "Email à compléter"}</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-500">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>{adresse || "Adresse à compléter"}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center text-xs text-slate-400 sm:flex-row">
            <Link
              href="/mentions-legales"
              className="hover:text-sky-600 transition-colors"
            >
              Mentions légales
            </Link>
            <span>•</span>
            <Link
              href="/conditions-generales"
              className="hover:text-sky-600 transition-colors"
            >
              CGV
            </Link>
            <span>•</span>
            <Link
              href="/conditions-utilisation"
              className="hover:text-sky-600 transition-colors"
            >
              CGU
            </Link>
            <span>•</span>
            <Link
              href="/politique-confidentialite"
              className="hover:text-sky-600 transition-colors"
            >
              Confidentialité
            </Link>
            <span>•</span>
            <Link
              href="/politique-cookies"
              className="hover:text-sky-600 transition-colors"
            >
              Cookies
            </Link>
            <span>•</span>
            <Link
              href="/dpa-annexe"
              className="hover:text-sky-600 transition-colors"
            >
              Annexe DPA
            </Link>
          </div>
          <p className="mt-6 text-center text-sm text-slate-400">
            &copy; {new Date().getFullYear()} {labo.nom_labo}. Tous droits réservés.
          </p>
          <p className="mt-2 text-center text-xs text-slate-400">
            Made with ♡ by{" "}
            <a
              href="https://lexeragroup.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-500 hover:text-sky-600 transition-colors"
            >
              Lexeragroup
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
