export const CERTIFICAT_TEMPLATE_TAGS: Record<string, string> = {
  "labo.nom": "Nom du fabricant",
  "labo.adresse": "Adresse du fabricant",
  "labo.site_fabrication": "Site de fabrication",
  "dispositifs.liste": "Liste des dispositifs de la commande",
  "patient.identifiant": "Nom, acronyme ou code patient",
  "dentiste.nom": "Nom du prescripteur habilité",
  "dentiste.cabinet": "Établissement prescripteur",
  "dentiste.adresse": "Adresse du prescripteur",
  "prescription.caracteristiques": "Caractéristiques de conception prescrites",
  "production.materiaux_lots": "Matériaux et lots réellement utilisés",
  "conformite.declaration": "Déclaration du fabricant",
  "conformite.exigences_non_satisfaites": "Exigences non satisfaites, le cas échéant",
  "conformite.justification": "Justification des exigences non satisfaites",
  "document.date_emission": "Date d’émission",
  "document.signataire": "Signataire et fonction",
  "document.numero": "Numéro de déclaration",
  "conformite.classe_dispositif": "Classe du dispositif",
  "conformite.code_nomenclature": "Code de nomenclature",
};

const TAG_PATTERN = /\{\{\s*([a-z0-9_.]+)\s*\}\}/gi;

export function findCertificateTemplateTags(template: string): string[] {
  return [...template.matchAll(TAG_PATTERN)].map((match) => match[1]);
}

export function validateCertificateTemplate(template: string): string[] {
  const foundTags = findCertificateTemplateTags(template);
  const unknownTags = [...new Set(foundTags.filter((tag) => !Object.hasOwn(CERTIFICAT_TEMPLATE_TAGS, tag)))];
  const missingRequired = [
    "labo.nom",
    "labo.adresse",
    "labo.site_fabrication",
    "dispositifs.liste",
    "patient.identifiant",
    "dentiste.nom",
    "dentiste.adresse",
    "prescription.caracteristiques",
    "production.materiaux_lots",
    "conformite.declaration",
    "conformite.exigences_non_satisfaites",
    "document.date_emission",
    "document.signataire",
    "document.numero",
  ]
    .filter((tag) => !foundTags.includes(tag));
  return [...unknownTags.map((tag) => `Balise inconnue : {{${tag}}}`), ...missingRequired.map((tag) => `Balise obligatoire manquante : {{${tag}}}`)];
}

export function renderCertificateTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(TAG_PATTERN, (_match, tag: string) => values[tag] ?? "");
}
