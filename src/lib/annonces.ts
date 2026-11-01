import type { AnnouncementNode } from "@/lib/annonce-document.mjs";

export type AnnonceCategory = { code: string; label: string; email_kind: "information" | "promotion"; is_closure: boolean; actif: boolean };

export type LabAnnonce = {
  id: string;
  titre: string;
  message: string;
  categorie: string;
  message_document?: AnnouncementNode | null;
  image_paths?: string[];
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