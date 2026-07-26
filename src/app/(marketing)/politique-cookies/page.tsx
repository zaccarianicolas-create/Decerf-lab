import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique cookies | DECERF LAB",
  description: "Politique d'utilisation des cookies DECERF LAB",
};

export default function PolitiqueCookies() {
  return (
    <main className="min-h-screen bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          Politique d'utilisation des cookies
        </h1>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              1. Qu'est-ce qu'un cookie?
            </h2>
            <p>
              Un cookie est un petit fichier texte stocké sur votre appareil
              (ordinateur, tablette, téléphone) quand vous visitez un site web.
              Les cookies permettent au site de se souvenir de vos préférences
              et d'améliorer votre expérience utilisateur.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              2. Types de cookies utilisés
            </h2>
            <p>
              <strong>Cookies essentiels (obligatoires):</strong><br />
              Ces cookies sont nécessaires au fonctionnement du site:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Authentification et sécurité</li>
              <li>Gestion de session</li>
              <li>Prévention des attaques CSRF</li>
            </ul>

            <p className="mt-4">
              <strong>Cookies fonctionnels:</strong><br />
              Ces cookies améliorent votre expérience:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Préférences utilisateur</li>
              <li>Mémorisation des choix</li>
              <li>Consentement cookies</li>
            </ul>

            <p className="mt-4">
              <strong>Cookies analytiques:</strong><br />
              Ces cookies nous aident à comprendre comment vous utilisez le site:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Statistiques d'utilisation</li>
              <li>Pages consultées</li>
              <li>Temps de visite</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              3. Cookies essentiels (sans consentement)
            </h2>
            <p>
              Les cookies essentiels suivants sont installés automatiquement:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong>sb-auth:</strong> Authentification Supabase (30 jours)</li>
              <li><strong>sb-refresh:</strong> Renouvellement de session (1 année)</li>
              <li><strong>cookie-consent:</strong> Votre préférence de cookies (1 année)</li>
            </ul>
            <p className="mt-4">
              Ces cookies sont nécessaires pour vous permettre d'accéder aux
              services sécurisés.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              4. Durée de conservation
            </h2>
            <p>
              Les cookies sont conservés pendant les durées indiquées. Vous
              pouvez les supprimer à tout moment en vidant le cache de votre
              navigateur. La suppression des cookies peut affecter votre
              expérience utilisateur.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              5. Gestion des cookies
            </h2>
            <p>
              <strong>Via notre banneau:</strong><br />
              Cliquez sur "Accepter tout" ou "Refuser tout" dans le banneau cookies
              au bas de la page. Vous pouvez modifier vos préférences à tout moment.
            </p>

            <p className="mt-4">
              <strong>Via votre navigateur:</strong><br />
              Vous pouvez accepter ou refuser les cookies dans les paramètres
              de votre navigateur. Les instructions sont disponibles sur:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Chrome: www.google.com/intl/fr/policies/technologies/managing/</li>
              <li>Firefox: support.mozilla.org/fr/kb/activer-desactiver-cookies</li>
              <li>Safari: support.apple.com/fr-fr/guide/safari/manage-cookies-sfri11471/</li>
              <li>Edge: support.microsoft.com/fr-fr/microsoft-edge/...</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              6. Tiers impliqués
            </h2>
            <p>
              Les services tiers suivants peuvent installer des cookies:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong>Supabase:</strong> Authentification et base de données</li>
              <li><strong>Stripe:</strong> Paiements (si applicable)</li>
              <li><strong>Vercel:</strong> Hébergement du site</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              7. Données personnelles
            </h2>
            <p>
              Les cookies ne contiennent pas vos données personnelles sensibles
              (mots de passe, numéros de carte). Consultez notre
              <a href="/politique-confidentialite" className="text-sky-600 hover:underline"> politique de confidentialité</a> pour plus d'informations.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              8. Modifications
            </h2>
            <p>
              Cette politique peut être modifiée à tout moment. Les modifications
              seront publiées sur cette page.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              9. Contact
            </h2>
            <p>
              Pour toute question sur nos cookies:
              <br />
              <a href="mailto:contact@decerf-lab.be" className="text-sky-600 hover:underline">contact@decerf-lab.be</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
