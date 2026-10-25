import { Metadata } from "next";
import { formatAdresseLabo, getParametresLabo } from "@/lib/parametres-labo";

export const metadata: Metadata = {
  title: "Conditions d’utilisation du portail | Decerf lab",
  description: "Conditions d’accès et d’utilisation du portail professionnel Decerf lab.",
};

const sections = [
  {
    title: "2. Objet et services du portail",
    paragraphs: () => [
      "Les présentes conditions d’utilisation (« CGU ») définissent l’accès et l’utilisation du portail professionnel de Decerf lab. Le portail peut permettre la gestion des comptes, l’enregistrement des praticiens, cliniques et laboratoires partenaires, la transmission de demandes de travaux et prescriptions, le dépôt de fichiers, le suivi des commandes, la communication avec le Laboratoire et la consultation des factures et documents disponibles.",
      "Les fonctionnalités accessibles dépendent du profil, des autorisations accordées et de l’état de déploiement du portail. Leur présentation n’est pas une garantie qu’une fonction particulière sera disponible en permanence.",
    ],
  },
  {
    title: "3. Utilisateurs autorisés et comptes",
    paragraphs: () => [
      "Le portail est réservé aux professionnels et aux collaborateurs qu’ils habilitent. Decerf lab peut vérifier les informations professionnelles nécessaires à l’ouverture du compte. Les comptes de laboratoire partenaire sont des comptes clients destinés à transmettre des demandes de travaux, notamment en sous-traitance; ils ne donnent pas accès aux fonctions internes d’atelier ou de technicien.",
      "Le titulaire maintient ses informations à jour. L’approbation du compte autorise l’accès au portail, mais ne vaut pas acceptation automatique des commandes.",
    ],
  },
  {
    title: "4. Création, authentification et sécurité du compte",
    paragraphs: () => [
      "L’utilisateur fournit des informations exactes et utilise un compte individuel. Il préserve la confidentialité de ses identifiants et informe Decerf lab sans retard en cas de perte, d’usage non autorisé ou de compromission suspectée.",
      "Le titulaire professionnel retire les accès des collaborateurs qui ne sont plus habilités. Il est interdit de contourner les mesures de sécurité, d’accéder sans autorisation à un compte ou à des données, d’introduire un fichier malveillant ou d’effectuer des extractions abusives.",
      "Decerf lab peut mettre en œuvre des mesures raisonnables de sécurité, notamment l’authentification renforcée lorsqu’elle est proposée. Aucune mesure ne permet de garantir une disponibilité ou une sécurité absolue.",
    ],
  },
  {
    title: "5. Demandes et commandes en ligne",
    paragraphs: () => [
      "Le portail permet de transmettre une demande de réalisation. L’utilisateur vérifie les éléments essentiels de la demande avant son envoi. La commande soumise apparaît comme « en attente » et constitue une demande, non une acceptation immédiate par Decerf lab.",
      "La demande est acceptée lorsque Decerf lab la confirme ou commence son exécution de manière non équivoque. Les conditions commerciales, la formation du contrat, les prix, délais, annulations et réclamations sont régis par les CGV disponibles sur le portail.",
      "Decerf lab peut demander des précisions ou refuser une demande non réalisable dans des conditions techniques, réglementaires ou de sécurité appropriées. Les éventuels frais supplémentaires hors tarif nécessitent l’accord préalable du Client selon les CGV.",
    ],
  },
  {
    title: "6. Prescriptions et responsabilités professionnelles",
    paragraphs: () => [
      "L’utilisateur ne transmet une prescription que s’il est habilité à le faire. Le praticien reste responsable des décisions cliniques relevant de sa compétence, de l’exactitude des indications cliniques et de l’identification du dossier patient.",
      "Le portail ne fournit pas de diagnostic et ne remplace pas les obligations professionnelles du prescripteur. Decerf lab conserve ses propres obligations techniques, réglementaires, de conformité et de sécurité.",
    ],
  },
  {
    title: "7. Fichiers numériques",
    paragraphs: () => [
      "Les formats acceptés sont ceux indiqués dans le portail au moment du dépôt. Ils peuvent inclure STL, OBJ, PLY, ZIP, PDF, JPG, JPEG et PNG. Les limites de taille et autres contraintes techniques affichées dans le portail s’appliquent.",
      "L’utilisateur transmet des fichiers exploitables, pertinents pour la commande et exempts de contenu malveillant. Decerf lab peut refuser ou demander le remplacement d’un fichier incompatible, incomplet ou dangereux. Le traitement technique d’un fichier ne vaut pas validation clinique de la prescription.",
    ],
  },
  {
    title: "8. Données relatives aux patients",
    paragraphs: () => [
      "L’utilisateur limite les données de patients aux informations nécessaires à la commande, à la fabrication, à la traçabilité et à la sécurité. Il privilégie les références pseudonymisées lorsque cela reste compatible avec les obligations applicables.",
      "Les données sont déposées dans les fonctions prévues à cet effet et ne doivent pas contenir d’informations étrangères à la commande. Les modalités de traitement sont détaillées dans la politique de confidentialité et, lorsque Decerf lab agit comme sous-traitant, dans l’annexe DPA.",
    ],
  },
  {
    title: "9. Sous-traitance et partenaires",
    paragraphs: () => [
      "Certaines prestations peuvent être réalisées en tout ou partie par des laboratoires ou partenaires de fabrication. L’accès de ces partenaires aux données est limité à ce qui est nécessaire à leur mission et encadré par les règles contractuelles, réglementaires et de protection des données applicables.",
      "Les présentes CGU ne modifient pas la répartition des rôles et obligations prévue par les CGV, la DPA ou la réglementation applicable aux dispositifs concernés.",
    ],
  },
  {
    title: "10. Suivi, messages et documents",
    paragraphs: () => [
      "Les statuts, dates estimatives, messages et documents affichés dans le portail facilitent le suivi et la communication. Une date indiquée comme estimative n’est pas un délai ferme sauf engagement exprès conforme aux CGV.",
      "Les utilisateurs vérifient les informations avant de s’y fier et signalent rapidement toute erreur. Les pièces réglementaires et factures disponibles dans le portail restent soumises à leurs règles spécifiques de conservation et d’utilisation.",
    ],
  },
  {
    title: "11. Modifications, annulations et réclamations",
    paragraphs: () => [
      "Les demandes de modification, d’annulation, de retouche ou de refabrication sont transmises par les fonctions disponibles ou par un canal accepté. Elles sont traitées selon les CGV; leur envoi dans le portail ne produit pas automatiquement effet lorsqu’une confirmation de Decerf lab est nécessaire.",
      "Tout incident susceptible d’affecter la sécurité d’un dispositif est signalé sans délai et traité selon les obligations réglementaires, indépendamment d’une procédure commerciale ordinaire.",
    ],
  },
  {
    title: "12. Disponibilité et maintenance",
    paragraphs: () => [
      "Decerf lab met en œuvre des moyens raisonnables pour maintenir le portail accessible. Des interruptions peuvent survenir pour maintenance, mise à jour, incident ou événement échappant au contrôle raisonnable de l’Éditeur. Aucun taux de disponibilité n’est garanti sauf accord écrit particulier.",
      "Decerf lab peut faire évoluer les fonctionnalités pour corriger une anomalie, améliorer le service ou répondre à une obligation. Les changements qui affectent substantiellement les droits des utilisateurs sont communiqués de manière appropriée.",
    ],
  },
  {
    title: "13. Propriété intellectuelle",
    paragraphs: () => [
      "Le portail et ses éléments propres sont protégés par les droits de propriété intellectuelle applicables. L’utilisateur bénéficie d’un droit d’accès et d’utilisation limité aux besoins professionnels autorisés.",
      "Il est interdit de copier, redistribuer ou exploiter les éléments protégés sans autorisation ou fondement légal. Les fichiers transmis par le Client restent soumis aux droits de celui-ci et aux conditions d’utilisation nécessaires à l’exécution des commandes et obligations réglementaires.",
    ],
  },
  {
    title: "14. Enregistrements électroniques",
    paragraphs: () => [
      "Decerf lab peut conserver les données nécessaires à la sécurité, au suivi et à la preuve des opérations réalisées sur le portail, notamment l’identifiant du compte, les dates, les versions des CGV/CGU acceptées, les commandes et les actions pertinentes.",
      "Ces enregistrements sont protégés et conservés selon les obligations légales, contractuelles et les durées applicables. Ils peuvent être contestés conformément au droit.",
    ],
  },
  {
    title: "15. Protection des données et cookies",
    paragraphs: () => [
      "Les traitements de données personnelles sont décrits dans la politique de confidentialité. La DPA s’applique lorsqu’elle est nécessaire au regard des rôles de responsable du traitement et de sous-traitant. La politique cookies décrit les cookies et traceurs effectivement utilisés et les choix disponibles.",
    ],
  },
  {
    title: "16. Suspension et fermeture du compte",
    paragraphs: () => [
      "Decerf lab peut suspendre temporairement un compte en cas de risque sérieux de sécurité, d’utilisation illicite ou de manquement significatif, selon une mesure proportionnée et dans les limites du droit applicable. L’utilisateur est informé lorsque cela est possible et approprié.",
      "Le Client peut demander la fermeture de son compte. Les données sont supprimées, restituées ou conservées selon les obligations légales, contractuelles, de traçabilité et de sécurité. La fermeture ne met pas automatiquement fin aux commandes déjà acceptées.",
    ],
  },
  {
    title: "17. Responsabilité",
    paragraphs: () => [
      "Chaque partie répond de ses propres obligations et manquements conformément au droit applicable. Les CGU ne limitent aucune responsabilité dont l’exclusion est interdite par la loi. Le portail ne remplace ni les obligations cliniques du praticien ni les obligations contractuelles et réglementaires de Decerf lab.",
    ],
  },
  {
    title: "18. Modification des CGU",
    paragraphs: () => [
      "Decerf lab peut modifier les CGU pour l’avenir. Les modifications substantielles sont communiquées aux utilisateurs et, lorsque nécessaire, soumises à une nouvelle acceptation. Elles ne s’appliquent pas rétroactivement aux contrats déjà formés.",
    ],
  },
  {
    title: "19. Droit applicable et litiges",
    paragraphs: () => [
      "Les présentes CGU sont soumises au droit belge. Les litiges relèvent des juridictions compétentes selon les règles légales et les accords valables entre les parties.",
    ],
  },
];

export default async function ConditionsUtilisationPage() {
  const labo = await getParametresLabo();
  const adresse = formatAdresseLabo(labo);
  const identity = {
    titulaire_legal: labo.titulaire_legal,
    forme_juridique: labo.forme_juridique,
    nom_labo: labo.nom_labo,
    adresse: adresse || "à compléter dans les paramètres du laboratoire",
    numero_entreprise: labo.numero_entreprise || "à compléter dès attribution",
    tva_numero: labo.tva_numero || "à compléter",
    email_contact: labo.email_contact || "à compléter",
    telephone: labo.telephone || "à compléter",
    site_web: labo.site_web || "à compléter",
  };

  return (
    <main className="min-h-screen bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-3 text-3xl font-bold text-gray-900">
          Conditions d’utilisation du portail professionnel
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Version 1.0 du 25 octobre 2026. À accepter avec les CGV lors de la création du compte.
        </p>
        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">1. Éditeur</h2>
            <p>
              {identity.titulaire_legal}, {identity.forme_juridique.toLowerCase()}, exerçant sous le nom commercial {identity.nom_labo}, dont le siège est situé {identity.adresse}.
            </p>
            <p>
              Numéro BCE : {identity.numero_entreprise}. TVA : {identity.tva_numero}. Contact : {identity.email_contact}. Téléphone : {identity.telephone}. Adresse du portail : {identity.site_web}.
            </p>
          </section>
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">{section.title}</h2>
              {section.paragraphs().map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Acceptation électronique</h2>
            <p>
              L’utilisateur accepte expressément ces CGU au moyen de la case prévue lors de la création du compte. La version et l’heure d’acceptation sont enregistrées. La prise de connaissance de la politique de confidentialité et de la DPA ne constitue pas un consentement RGPD distinct.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
