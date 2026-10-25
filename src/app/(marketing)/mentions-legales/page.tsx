import { Metadata } from "next";
import { formatAdresseLabo, getParametresLabo } from "@/lib/parametres-labo";

export const metadata: Metadata = {
  title: "Mentions légales | DECERF LAB",
  description: "Mentions légales du laboratoire dentaire DECERF LAB",
  alternates: { canonical: "/mentions-legales" },
};

export default async function MentionsLegales() {
  const labo = await getParametresLabo();
  const adresse = formatAdresseLabo(labo);

  return (
    <main className="min-h-screen bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Mentions légales</h1>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              1. Identification de l&apos;entreprise
            </h2>
            <p>
              <strong>Nom commercial:</strong> {labo.nom_labo}<br />
              <strong>Titulaire:</strong> {labo.titulaire_legal} ({labo.forme_juridique})<br />
              <strong>Numéro BCE:</strong> {labo.numero_entreprise || "À compléter dès attribution"}<br />
              <strong>Numéro TVA:</strong> {labo.tva_numero || "À compléter"}<br />
              <strong>Adresse:</strong> {adresse || "À compléter dans les paramètres du laboratoire"}<br />
              <strong>Téléphone:</strong> {labo.telephone || "À compléter"}<br />
              <strong>Email:</strong> {labo.email_contact || "À compléter"}<br />
              <strong>Site:</strong> {labo.site_web || "À compléter"}<br />
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              2. Hébergement du site
            </h2>
            <p>
              Ce site est hébergé par Vercel Inc.<br />
              <strong>Adresse:</strong> 440 N Barranca Ave, Covina, CA 91723, USA<br />
              <strong>Site:</strong> www.vercel.com
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              3. Directeur de la publication
            </h2>
            <p>
              Le site est publié sous la responsabilité de {labo.titulaire_legal},
              titulaire de {labo.nom_labo}.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              4. Propriété intellectuelle
            </h2>
            <p>
              Tous les éléments du site (textes, images, logos, marques) sont
              la propriété exclusive de DECERF LAB ou de ses partenaires.
              Toute reproduction sans autorisation écrite est interdite.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              5. Responsabilité
            </h2>
            <p>
              DECERF LAB s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des
              informations du site. Cependant, DECERF LAB ne peut garantir
              l&apos;absence d&apos;erreurs ou d&apos;omissions. Les utilisateurs utilisent le
              site à leurs propres risques.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              6. Liens externes
            </h2>
            <p>
              DECERF LAB n&apos;est pas responsable du contenu des sites externes
              accessibles via des liens hypertextes. L&apos;établissement de liens
              externes ne constitue pas une approbation des contenus de ces sites.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              7. Droit applicable
            </h2>
            <p>
              Ce site est soumis à la loi belge. Les litiges éventuels seront
              soumis à la juridiction des tribunaux belges.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              8. Contact
            </h2>
            <p>
              Pour toute question relative aux mentions légales, veuillez
              contacter: <a href={`mailto:${labo.email_contact || "contact@decerf-lab.be"}`} className="text-sky-600 hover:underline">{labo.email_contact || "contact@decerf-lab.be"}</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
