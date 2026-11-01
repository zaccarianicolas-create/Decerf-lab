export const DEFAULT_NOTIFICATION_PREFERENCES = {
  email_invitation: true,
  email_certificat: true,
  email_facture: true,
  email_commande: true,
  email_message: true,
  email_assignation: true,
  email_rgpd: true,
  email_annonce: true,
  email_promotion: false,
};

export type NotificationPreferences = typeof DEFAULT_NOTIFICATION_PREFERENCES;

export const NOTIFICATION_LABELS: Record<keyof NotificationPreferences, string> = {
  email_invitation: "Invitations",
  email_certificat: "Certificats de conformité",
  email_facture: "Factures",
  email_commande: "Commandes et changements de statut",
  email_message: "Messages non lus",
  email_assignation: "Assignations et tâches",
  email_rgpd: "Demandes RGPD",
  email_annonce: "Informations et annonces du laboratoire",
  email_promotion: "Offres commerciales et promotions",
};