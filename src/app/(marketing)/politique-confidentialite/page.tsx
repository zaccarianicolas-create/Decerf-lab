import { Metadata } from "next";
import { formatAdresseLabo, getParametresLabo } from "@/lib/parametres-labo";

export const metadata: Metadata = {
  title: "Politique de confidentialité | DECERF LAB",
  description: "Politique de confidentialité et protection des données DECERF LAB",
};

export default async function PolitiqueConfidentialite() {
  const labo = await getParametresLabo();
  const adresse = formatAdresseLabo(labo);
  const emailContact = labo.email_contact || "contact@decerf-lab.be";

  return (
    <main className="min-h-screen bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          Politique de confidentialité
        </h1>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              1. Collecte de données
            </h2>
            <p>
              {labo.nom_labo} collecte les données personnelles suivantes:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Données de contact (nom, email, téléphone)</li>
              <li>Données professionnelles (cabinet dentaire, qualifications)</li>
              <li>Données de facturation (adresse, données IBAN)</li>
                    <li>L&apos;exécution d&apos;un contrat</li>
                    <li>Le respect d&apos;obligations légales</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              2. Base légale du traitement
            </h2>
            <p>
              Le traitement de vos données personnelles est fondé sur:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Votre consentement explicite</li>
              <li>L&apos;exécution d&apos;un contrat</li>
              <li>Le respect d&apos;obligations légales</li>
              <li>Les intérêts légitimes de {labo.nom_labo}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              3. Utilisation des données
            </h2>
            <p>
              Vos données sont utilisées pour:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Fournir nos services (gestion des travaux dentaires)</li>
              <li>Communiquer avec vous</li>
              <li>Facturation et paiements</li>
              <li>Amélioration de nos services</li>
              <li>Conformité légale et réglementaire</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              4. Partage des données
            </h2>
            <p>
              Vos données ne sont jamais vendues à des tiers. Elles peuvent être
              partagées avec:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Nos prestataires de services (hébergement, email)</li>
              <li>Les autorités si exigé par la loi</li>
              <li>Vos patients (données strictement nécessaires)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              5. Conservation des données
            </h2>
            <p>
              Les données sont conservées pour la durée nécessaire à la prestation
              de services, avec un minimum de 7 ans pour les données comptables
              (légalement obligatoire).
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              6. Vos droits RGPD
            </h2>
            <p>
              Vous avez le droit de:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Accéder à vos données personnelles</li>
              <li>Rectifier les données inexactes</li>
              <li>Obtenir l&apos;effacement de vos données</li>
              <li>Demander une limitation du traitement</li>
              <li>Demander l&apos;exportation de vos données</li>
              <li>Retirer votre consentement</li>
            </ul>
            <p className="mt-4">
              Pour exercer ces droits, contactez : <a href={`mailto:${emailContact}`} className="text-sky-600 hover:underline">{emailContact}</a>
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              7. Sécurité des données
            </h2>
            <p>
              {labo.nom_labo} met en place des mesures de sécurité appropriées pour
              protéger vos données contre l&apos;accès non autorisé, la modification
              ou la divulgation:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Chiffrement SSL/TLS</li>
              <li>Authentification sécurisée</li>
              <li>Sauvegarde régulière</li>
              <li>Accès restreint au personnel autorisé</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              8. Cookies
            </h2>
            <p>
              Ce site utilise des cookies. Pour plus d&apos;informations, consultez
              notre <a href="/politique-cookies" className="text-sky-600 hover:underline">politique cookies</a>.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              9. Modifications
            </h2>
            <p>
              Cette politique peut être modifiée à tout moment. Les modifications
              entrent en vigueur dès leur publication sur ce site.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              10. Contact
            </h2>
            <p>
              Pour toute question sur cette politique, contactez:
              <br />
              <strong>Email:</strong> <a href={`mailto:${emailContact}`} className="text-sky-600 hover:underline">{emailContact}</a>
              <br />
              <strong>Adresse:</strong> {adresse || "À compléter dans les paramètres du laboratoire"}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
