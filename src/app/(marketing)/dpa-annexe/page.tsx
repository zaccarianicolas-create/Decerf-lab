import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Annexe DPA (RGPD) | DECERF LAB",
  description: "Annexe de traitement des données personnelles (DPA) de DECERF LAB.",
};

export default function DpaAnnexePage() {
  return (
    <main className="min-h-screen bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-3 text-3xl font-bold text-gray-900">
          Annexe DPA (RGPD)
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Data Processing Agreement - annexe aux Conditions Générales d&apos;Utilisation.
        </p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">1. Objet</h2>
            <p>
              Cette annexe encadre le traitement des données personnelles réalisé dans le cadre
              des services fournis par DECERF LAB, conformément au RGPD et au droit belge.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">2. Parties</h2>
            <p>
              <strong>Prestataire:</strong> DECERF LAB, Rue des Claveaux 1, 4560 Clavier, Belgique.
              <br />
              <strong>Client:</strong> praticien, cabinet ou clinique utilisant la plateforme.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">3. Catégories de données</h2>
            <ul className="ml-6 list-disc space-y-2">
              <li>Données d&apos;identification des praticiens et collaborateurs</li>
              <li>Données de contact et de facturation</li>
              <li>Données liées aux commandes et travaux dentaires</li>
              <li>Données techniques (logs, adresses IP, métadonnées d&apos;accès)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">4. Finalités du traitement</h2>
            <ul className="ml-6 list-disc space-y-2">
              <li>Exécution des prestations de laboratoire dentaire</li>
              <li>Suivi des commandes, certificats et facturation</li>
              <li>Assistance client et communications opérationnelles</li>
              <li>Sécurité, prévention des abus et conformité légale</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">5. Obligations de DECERF LAB</h2>
            <ul className="ml-6 list-disc space-y-2">
              <li>Traiter les données uniquement sur instruction légitime du client</li>
              <li>Mettre en place des mesures techniques et organisationnelles adaptées</li>
              <li>Garantir la confidentialité des personnes autorisées</li>
              <li>Notifier dans les meilleurs délais toute violation de données</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">6. Sous-traitants ultérieurs</h2>
            <p>
              DECERF LAB peut recourir à des sous-traitants techniques (hébergement, email,
              paiements), soumis à des obligations contractuelles de protection des données.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">7. Durée et suppression</h2>
            <p>
              Les données sont conservées pendant la durée nécessaire aux finalités contractuelles
              et obligations légales, puis supprimées ou anonymisées selon les règles applicables.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">8. Droits des personnes concernées</h2>
            <p>
              Les demandes d&apos;accès, rectification, effacement, limitation ou export peuvent être
              adressées à <a href="mailto:contact@decerf-lab.be" className="text-sky-600 hover:underline">contact@decerf-lab.be</a>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">9. Contact RGPD</h2>
            <p>
              DECERF LAB - Rue des Claveaux 1, 4560 Clavier, Belgique
              <br />
              Email: <a href="mailto:contact@decerf-lab.be" className="text-sky-600 hover:underline">contact@decerf-lab.be</a>
            </p>
          </section>

          <section>
            <p className="text-xs text-gray-500">
              Cette annexe constitue un modèle opérationnel. Une validation juridique personnalisée
              par un professionnel du droit belge est recommandée.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
