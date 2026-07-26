import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions générales | DECERF LAB",
  description: "Conditions générales d'utilisation DECERF LAB",
};

export default function ConditionsGenerales() {
  return (
    <main className="min-h-screen bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          Conditions générales d'utilisation
        </h1>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              1. Objet
            </h2>
            <p>
              Les présentes conditions générales régissent l'utilisation du site
              www.decerf-lab.be et des services proposés par DECERF LAB, laboratoire
              dentaire situé à Clavier, Belgique.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              2. Accès au service
            </h2>
            <p>
              L'accès au site et aux services est réservé aux dentistes et cliniques
              dentaires dûment enregistrés. DECERF LAB se réserve le droit de refuser
              l'accès à toute personne ne répondant pas aux critères requis.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              3. Compte utilisateur
            </h2>
            <p>
              Pour accéder aux services, vous devez créer un compte avec des
              informations exactes et à jour. Vous êtes responsable de la
              confidentialité de vos identifiants. Vous acceptez d'être responsable
              de toutes les activités effectuées sous votre compte.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              4. Services proposés
            </h2>
            <p>
              DECERF LAB propose des services de laboratoire dentaire, incluant:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Réalisation de travaux dentaires</li>
              <li>Gestion des commandes en ligne</li>
              <li>Suivi des chantiers dentaires</li>
              <li>Délivrance de certificats</li>
              <li>Devis et facturation</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              5. Conditions de paiement
            </h2>
            <p>
              Les conditions de paiement sont communiquées au moment de chaque
              commande. Tous les prix sont mentionnés TTC sauf indication contraire.
              Le paiement doit être effectué selon les délais convenus.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              6. Livraison
            </h2>
            <p>
              Les délais de livraison indiqués sont des estimations. DECERF LAB
              s'efforce de respecter les délais annoncés, mais ne peut être tenue
              responsable des retards de livraison dus à des circonstances
              extraordinaires.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              7. Responsabilité
            </h2>
            <p>
              DECERF LAB réalise ses travaux selon les normes professionnelles en
              vigueur. Cependant, DECERF LAB ne peut être tenue responsable des
              résultats cliniques ou des complications ultérieures liées à l'utilisation
              ou à l'installation des travaux.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              8. Confidentialité professionnelle
            </h2>
            <p>
              DECERF LAB s'engage à respecter le secret professionnel et la
              confidentialité des informations relatives aux patients et aux
              praticiens dans le cadre applicable par la loi belge.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              9. Propriété intellectuelle
            </h2>
            <p>
              Tous les contenus du site (textes, images, logos) sont la propriété
              de DECERF LAB et protégés par les lois sur le droit d'auteur.
              Toute reproduction sans autorisation est interdite.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              10. Limitation de responsabilité
            </h2>
            <p>
              DECERF LAB ne sera pas responsable de:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Les pertes d'exploitation</li>
              <li>Les dommages indirects</li>
              <li>Les interruptions de service</li>
              <li>Les erreurs de l'utilisateur</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              11. Modifications des conditions
            </h2>
            <p>
              DECERF LAB se réserve le droit de modifier ces conditions à tout
              moment. Les modifications s'appliqueront dès leur publication.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              12. Loi applicable
            </h2>
            <p>
              Ces conditions sont soumises à la loi belge. Les litiges éventuels
              seront soumis à la juridiction des tribunaux belges.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              13. Contact
            </h2>
            <p>
              Pour toute question: <a href="mailto:contact@decerf-lab.be" className="text-sky-600 hover:underline">contact@decerf-lab.be</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
