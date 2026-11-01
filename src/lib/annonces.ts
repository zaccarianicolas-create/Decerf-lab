export type LabAnnonce = {
  id: string;
  titre: string;
  message: string;
  categorie: "information" | "fermeture" | "voeux" | "promotion";
  statut: "brouillon" | "publie" | "archive";
  starts_at: string;
  ends_at: string | null;
  send_email: boolean;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_url?: string | null;
  read?: boolean;
};

export const ANNONCE_CATEGORIES: Record<LabAnnonce["categorie"], string> = {
  information: "Information",
  fermeture: "Congés / fermeture",
  voeux: "Vœux",
  promotion: "Offre commerciale",
};