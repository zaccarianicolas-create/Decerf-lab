import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailTemplates, sendEmail, type EmailTemplate } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const testFactories = {
  invitation: () => emailTemplates.invitation({ prenom: "Compte de test", email: "exemple@example.com", token: "TEST-LIEN-NON-VALIDE" }),
  certificat_emis: () => emailTemplates.certificat_emis({ prenom: "Compte de test", numero: "CERT-TEST", url: "https://www.decerf-lab.be/login" }),
  facture_a_valider: () => emailTemplates.facture_a_valider({ prenom: "Compte de test", commande: "CMD-TEST", url: "https://www.decerf-lab.be/login" }),
  facture_emise: () => emailTemplates.facture_emise({ prenom: "Compte de test", numero: "FA-TEST", montant: 123.45 }),
  commande_creee: () => emailTemplates.commande_creee({ prenom: "Compte de test", numero: "CMD-TEST" }),
  commande_statut: () => emailTemplates.commande_statut({ prenom: "Compte de test", numero: "CMD-TEST", statut: "En cours (test)" }),
  nouveau_message: () => emailTemplates.nouveau_message({ prenom: "Compte de test", expediteur: "DECERF LAB (test)" }),
  assignation_tache: () => emailTemplates.assignation_tache({ prenom: "Compte de test", titre: "Tâche fictive", commande: "CMD-TEST" }),
  rgpd_recu: () => emailTemplates.rgpd_recu({ prenom: "Compte de test", type: "export de démonstration" }),
  compte_approuve: () => emailTemplates.compte_approuve({ prenom: "Compte de test" }),
  compte_acces: () => emailTemplates.compte_acces({ prenom: "Compte de test", url: "https://www.decerf-lab.be/login" }),
} satisfies Record<EmailTemplate, () => { subject: string; html: string }>;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role, actif").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || !profile.actif || !user.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const limit = await rateLimit(request, { key: "admin-email-test", by: "user", userId: user.id, limit: 12, windowMs: 3600000 });
  if (!limit.ok) return limit.response;

  const body: unknown = await request.json().catch(() => null);
  const template = body && typeof body === "object" && "template" in body ? body.template : null;
  if (typeof template !== "string" || !Object.hasOwn(testFactories, template)) {
    return NextResponse.json({ error: "Modèle de test invalide." }, { status: 400 });
  }

  const templateKey = template as EmailTemplate;
  const example = testFactories[templateKey]();
  const banner = '<p style="margin:0;padding:16px;background:#fff3cd;color:#664d03;font:14px Helvetica,Arial,sans-serif;">TEST DE DÉMONSTRATION : aucun compte, commande, facture ou certificat n’a été créé ou modifié. Les liens ne valident aucune opération.</p>';
  const result = await sendEmail({
    to: user.email,
    toUserId: user.id,
    template: templateKey,
    subject: `[TEST DECERF LAB] ${example.subject}`,
    html: example.html.replace(/(<body\b[^>]*>)/i, `$1${banner}`),
    payload: { test: true, requested_by: user.id },
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Échec de l’envoi." }, { status: 502 });
  }
  return NextResponse.json({ accepted: true, to: user.email, provider_id: result.id, template: templateKey });
}