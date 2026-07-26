import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales | DECERF LAB",
  description: "Mentions légales du laboratoire dentaire DECERF LAB",
};

export default function MentionsLegales() {
  return (
    <main className="min-h-screen bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Mentions légales</h1>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              1. Identification de l'entreprise
            </h2>
            <p>
              <strong>Raison sociale:</strong> DECERF LAB<br />
              <strong>Adresse:</strong> Rue des Claveaux 1, 4560 Clavier, Belgique<br />
              <strong>Téléphone:</strong> +32 (0)4 xxx xx xx<br />
              <strong>Email:</strong> contact@decerf-lab.be<br />
              <strong>Responsable:</strong> Julie Decerf<br />
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
              Le site est publié sous la responsabilité de Julie Decerf,
              directrice du laboratoire dentaire DECERF LAB.
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
              DECERF LAB s'efforce d'assurer l'exactitude et la mise à jour des
              informations du site. Cependant, DECERF LAB ne peut garantir
              l'absence d'erreurs ou d'omissions. Les utilisateurs utilisent le
              site à leurs propres risques.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              6. Liens externes
            </h2>
            <p>
              DECERF LAB n'est pas responsable du contenu des sites externes
              accessibles via des liens hypertextes. L'établissement de liens
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
              contacter: <a href="mailto:contact@decerf-lab.be" className="text-sky-600 hover:underline">contact@decerf-lab.be</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
