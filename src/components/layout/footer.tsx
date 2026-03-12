import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logod.png"
                alt="DECERF LAB"
                width={160}
                height={45}
                className="h-10 w-auto"
              />
              <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
                Laboratoire dentaire
              </span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
              Votre partenaire de confiance pour des prothèses dentaires de haute
              qualité. Technologie de pointe et savoir-faire artisanal au service
              de votre pratique.
            </p>
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
                  href="/#contact"
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
                <span>01 23 45 67 89</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-500">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>contact@decerflab.fr</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-500">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>123 Rue de la Prothèse, 75001 Paris</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-8 text-center text-sm text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} DECERF LAB. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
