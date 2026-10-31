import { Metadata } from "next";
import { formatAdresseLabo, getParametresLabo } from "@/lib/parametres-labo";
import { CONDITIONS_GENERALES_SECTIONS, CONDITIONS_GENERALES_VERSION } from "@/lib/conditions-generales-content";

export const metadata: Metadata = {
  title: "Conditions générales de vente | Decerf lab",
  description: "Conditions générales de vente et d’utilisation B2B de Decerf lab.",
  alternates: { canonical: "/conditions-generales" },
};

export default async function ConditionsGenerales() {
  const labo = await getParametresLabo();
  const adresse = formatAdresseLabo(labo);

  return (
    <main className="min-h-screen bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-3 text-3xl font-bold text-gray-900">
          Conditions générales de vente et d’utilisation
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          {CONDITIONS_GENERALES_VERSION} · Applicables à compter de leur acceptation par le Client.
        </p>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              1. Identification du Laboratoire
            </h2>
            <p>
              <strong>Nom commercial :</strong> {labo.nom_labo}<br />
              <strong>Titulaire :</strong> {labo.titulaire_legal} ({labo.forme_juridique})<br />
              <strong>Numéro BCE :</strong> {labo.numero_entreprise || "À compléter dès attribution"}<br />
              <strong>Numéro TVA :</strong> {labo.tva_numero || "À compléter"}<br />
              <strong>Adresse :</strong> {adresse || "À compléter dans les paramètres du laboratoire"}<br />
              <strong>Téléphone :</strong> {labo.telephone || "À compléter"}<br />
              <strong>Email :</strong> {labo.email_contact || "À compléter"}<br />
              <strong>Site :</strong> {labo.site_web || "À compléter"}<br />
            </p>
            <p>Ci-après « {labo.nom_labo} » ou « le Laboratoire ».</p>
          </section>
          {CONDITIONS_GENERALES_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {"link" in section && section.link && (
                <p>
                  <a href={section.link.href} className="text-sky-600 hover:underline">
                    {section.link.label}
                  </a>
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
