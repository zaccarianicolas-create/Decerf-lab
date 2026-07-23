/**
 * Envoi d'emails transactionnels via Resend.
 * Sans clé RESEND_API_KEY, les emails sont seulement logués (mode "skipped").
 * Respecte les préférences utilisateur (notification_preferences).
 */

import { createAdminClient } from "@/lib/supabase/admin";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "DECERF LAB <noreply@decerf-lab.be>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.decerf-lab.be";

export type EmailTemplate =
  | "invitation"
  | "certificat_emis"
  | "facture_emise"
  | "commande_creee"
  | "commande_statut"
  | "nouveau_message"
  | "assignation_tache"
  | "rgpd_recu"
  | "compte_approuve";

type SendArgs = {
  to: string;
  toUserId?: string | null;
  template: EmailTemplate;
  subject: string;
  html: string;
  text?: string;
  payload?: Record<string, unknown>;
  /** Si fourni, vérifie la préférence (clé email_*) avant envoi */
  prefKey?: keyof PrefsRow;
};

type PrefsRow = {
  email_invitation: boolean;
  email_certificat: boolean;
  email_facture: boolean;
  email_commande: boolean;
  email_message: boolean;
  email_assignation: boolean;
  email_rgpd: boolean;
};

async function checkPref(
  userId: string | null | undefined,
  key: keyof PrefsRow | undefined
): Promise<boolean> {
  if (!userId || !key) return true;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("notification_preferences")
      .select(key as string)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return true; // par défaut activé
    return Boolean((data as unknown as Record<string, unknown>)[key as string]);
  } catch {
    return true;
  }
}

async function logEmail(args: {
  to: string;
  toUserId?: string | null;
  template: EmailTemplate;
  subject: string;
  status: "sent" | "error" | "skipped";
  providerId?: string;
  error?: string;
  payload?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("email_log").insert({
      to_email: args.to,
      to_user_id: args.toUserId ?? null,
      template: args.template,
      subject: args.subject,
      status: args.status,
      provider_id: args.providerId ?? null,
      error: args.error ?? null,
      payload: args.payload ?? null,
    });
  } catch {
    /* swallow */
  }
}

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const allowed = await checkPref(args.toUserId, args.prefKey);
  if (!allowed) {
    await logEmail({ ...args, status: "skipped" });
    return { ok: false, error: "preference_disabled" };
  }

  if (!RESEND_API_KEY) {
    // Mode dev / non configuré
    await logEmail({ ...args, status: "skipped" });
    return { ok: false, error: "no_provider_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });
    const json = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      await logEmail({ ...args, status: "error", error: json.message || `HTTP ${res.status}` });
      return { ok: false, error: json.message };
    }
    await logEmail({ ...args, status: "sent", providerId: json.id });
    return { ok: true, id: json.id };
  } catch (e) {
    const error = e instanceof Error ? e.message : "unknown_error";
    await logEmail({ ...args, status: "error", error });
    return { ok: false, error };
  }
}

// ---------- Templates ----------

function wrap(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f6fa;padding:24px;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#0284c7,#0ea5e9);padding:20px 28px;color:#fff;">
        <h1 style="margin:0;font-size:18px;letter-spacing:.2px;">DECERF LAB</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:.9;">${title}</p>
      </div>
      <div style="padding:24px 28px;font-size:14px;line-height:1.55;">${body}</div>
      <div style="padding:14px 28px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:11px;">
        DECERF LAB — Laboratoire de prothèse dentaire numérique
      </div>
    </div></body></html>`;
}

function btn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:500;margin:12px 0;">${label}</a>`;
}

export const emailTemplates = {
  invitation(p: { prenom?: string; email: string; token: string }) {
    const url = `${APP_URL}/register?invitation=${p.token}`;
    return {
      subject: "Invitation à rejoindre DECERF LAB",
      html: wrap(
        "Invitation",
        `<p>Bonjour ${p.prenom ?? ""},</p>
         <p>Vous êtes invité·e à rejoindre la plateforme DECERF LAB pour gérer vos commandes de prothèses.</p>
         ${btn("Activer mon compte", url)}
         <p style="color:#64748b;font-size:12px;">Ce lien expire dans 7 jours.</p>`
      ),
    };
  },
  certificat_emis(p: { prenom?: string; numero: string; url?: string }) {
    return {
      subject: `Certificat de conformité ${p.numero}`,
      html: wrap(
        "Certificat émis",
        `<p>Bonjour ${p.prenom ?? ""},</p>
         <p>Le certificat de conformité <strong>${p.numero}</strong> est disponible.</p>
         ${p.url ? btn("Télécharger le certificat", p.url) : ""}
         ${btn("Voir dans mon espace", `${APP_URL}/dashboard/commandes`)}`
      ),
    };
  },
  facture_emise(p: { prenom?: string; numero: string; montant: number }) {
    return {
      subject: `Facture ${p.numero} disponible`,
      html: wrap(
        "Nouvelle facture",
        `<p>Bonjour ${p.prenom ?? ""},</p>
         <p>La facture <strong>${p.numero}</strong> d'un montant de <strong>${p.montant.toFixed(2)} €</strong> est disponible.</p>
         ${btn("Consulter ma facture", `${APP_URL}/dashboard/finance`)}`
      ),
    };
  },
  commande_creee(p: { prenom?: string; numero: string }) {
    return {
      subject: `Commande ${p.numero} reçue`,
      html: wrap(
        "Commande enregistrée",
        `<p>Bonjour ${p.prenom ?? ""},</p>
         <p>Votre commande <strong>${p.numero}</strong> a bien été enregistrée et sera prise en charge par notre équipe.</p>
         ${btn("Suivre ma commande", `${APP_URL}/dashboard/commandes`)}`
      ),
    };
  },
  commande_statut(p: { prenom?: string; numero: string; statut: string }) {
    return {
      subject: `Commande ${p.numero} — ${p.statut}`,
      html: wrap(
        "Mise à jour de commande",
        `<p>Bonjour ${p.prenom ?? ""},</p>
         <p>Votre commande <strong>${p.numero}</strong> est passée au statut <strong>${p.statut}</strong>.</p>
         ${btn("Voir le détail", `${APP_URL}/dashboard/commandes`)}`
      ),
    };
  },
  nouveau_message(p: { prenom?: string; expediteur: string }) {
    return {
      subject: `Nouveau message de ${p.expediteur}`,
      html: wrap(
        "Nouveau message",
        `<p>Bonjour ${p.prenom ?? ""},</p>
         <p><strong>${p.expediteur}</strong> vous a envoyé un message.</p>
         ${btn("Ouvrir la messagerie", `${APP_URL}/dashboard/messages`)}`
      ),
    };
  },
  assignation_tache(p: { prenom?: string; titre: string; commande: string }) {
    return {
      subject: `Nouvelle tâche : ${p.titre}`,
      html: wrap(
        "Tâche assignée",
        `<p>Bonjour ${p.prenom ?? ""},</p>
         <p>Une nouvelle tâche vous a été assignée sur la commande <strong>${p.commande}</strong> :</p>
         <p style="background:#f1f5f9;padding:10px 14px;border-radius:8px;">${p.titre}</p>
         ${btn("Ouvrir l'atelier", `${APP_URL}/atelier`)}`
      ),
    };
  },
  rgpd_recu(p: { prenom?: string; type: string }) {
    return {
      subject: "Demande RGPD bien reçue",
      html: wrap(
        "Demande RGPD",
        `<p>Bonjour ${p.prenom ?? ""},</p>
         <p>Nous avons bien reçu votre demande RGPD (<strong>${p.type}</strong>). Elle sera traitée sous 30 jours.</p>`
      ),
    };
  },
  compte_approuve(p: { prenom?: string }) {
    return {
      subject: "Votre compte est activé",
      html: wrap(
        "Compte approuvé",
        `<p>Bonjour ${p.prenom ?? ""},</p>
         <p>Votre compte DECERF LAB a été approuvé. Vous pouvez désormais accéder à votre espace.</p>
         ${btn("Accéder à mon espace", `${APP_URL}/dashboard`)}`
      ),
    };
  },
};
