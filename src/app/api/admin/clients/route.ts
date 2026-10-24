import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { sendEmail, emailTemplates } from "@/lib/email";

async function requireAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }
  return { admin, userId: user.id };
}

/**
 * 3 modes :
 *  - "compte"      → vrai compte Supabase Auth
 *  - "invitation"  → lien d'invitation par email
 *  - "sans_compte" → fiche gérée par le labo, pas d'auth.users
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;

  const body = await request.json();
  const {
    nom,
    prenom,
    email,
    telephone,
    cabinet_nom,
    numero_inami,
    numero_entreprise,
    assujetti_tva,
    numero_tva,
    type_compte_client = "dentiste_independant",
    mode = "sans_compte",
  } = body as {
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    cabinet_nom?: string;
    numero_inami?: string;
    numero_entreprise?: string;
    assujetti_tva?: "oui" | "non" | "";
    numero_tva?: string;
    type_compte_client?: "dentiste_independant" | "clinique" | "laboratoire";
    mode?: "compte" | "invitation" | "sans_compte";
  };
  const assujettiTva = assujetti_tva === "oui"
    ? true
    : assujetti_tva === "non"
      ? false
      : null;

  if (!nom || !prenom) {
    return NextResponse.json(
      { error: "Nom et prénom sont requis" },
      { status: 400 }
    );
  }
  if (mode !== "sans_compte" && !email) {
    return NextResponse.json(
      { error: "Email requis pour ce mode" },
      { status: 400 }
    );
  }
  if (assujettiTva === true && !numero_tva?.trim()) {
    return NextResponse.json(
      { error: "Le numéro TVA est requis si le client est déclaré assujetti." },
      { status: 400 }
    );
  }

  // Cabinet partagé (réutilisé si déjà présent)
  let cabinetId: string | null = null;
  if (cabinet_nom?.trim()) {
    const { data: existing } = await admin
      .from("cabinets")
      .select("id")
      .ilike("nom", cabinet_nom.trim())
      .maybeSingle();
    if (existing?.id) cabinetId = existing.id;
    else {
      const { data: created } = await admin
        .from("cabinets")
        .insert({ nom: cabinet_nom.trim() })
        .select("id")
        .single();
      cabinetId = created?.id ?? null;
    }
  }

  try {
    if (mode === "compte") {
      const { data: authUser, error: authError } =
        await admin.auth.admin.createUser({
          email: email!,
          email_confirm: true,
          user_metadata: {
            nom,
            prenom,
            role: "dentiste",
            type_compte_client,
            numero_inami: numero_inami?.trim() || null,
            numero_entreprise: numero_entreprise?.trim() || null,
            assujetti_tva: assujettiTva,
            numero_tva: numero_tva?.trim() || null,
          },
        });
      if (authError || !authUser.user) {
        return NextResponse.json(
          { error: authError?.message || "Erreur création compte" },
          { status: 400 }
        );
      }
      await admin
        .from("profiles")
        .update({
          telephone: telephone || null,
          numero_inami: numero_inami?.trim() || null,
          numero_entreprise: numero_entreprise?.trim() || null,
          assujetti_tva: assujettiTva,
          numero_tva: numero_tva?.trim() || null,
          type_compte_client,
          statut_compte: "approuve",
          actif: true,
          cabinet_id: cabinetId,
          sans_compte: false,
          created_by: userId,
        })
        .eq("id", authUser.user.id);

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: email!,
      });
      let emailSent = false;
      let emailError = linkError?.message || null;
      if (linkData.properties?.action_link) {
        const template = emailTemplates.compte_acces({
          prenom,
          url: linkData.properties.action_link,
        });
        const result = await sendEmail({
          to: email!,
          toUserId: authUser.user.id,
          template: "compte_acces",
          subject: template.subject,
          html: template.html,
          payload: { profile_id: authUser.user.id },
        });
        emailSent = result.ok;
        emailError = result.ok ? null : result.error || "Échec d’envoi";
      } else if (!emailError) {
        emailError = "Lien de connexion indisponible";
      }

      const meta = extractRequestMeta(request);
      await logAudit({
        actor_id: userId,
        actor_role: "admin",
        action: "client.create.compte",
        entity_type: "profile",
        entity_id: authUser.user.id,
        metadata: { email },
        ip: meta.ip,
        user_agent: meta.user_agent,
      });
      return NextResponse.json({
        success: true,
        mode: "compte",
        profile_id: authUser.user.id,
        email_sent: emailSent,
        email_error: emailError,
        email_link: emailSent ? null : linkData.properties?.action_link ?? null,
      });
    }

    if (mode === "invitation") {
      const token = `${crypto.randomUUID()}-${Date.now().toString(36)}`;
      const expireAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: inv, error } = await admin
        .from("invitations_inscription")
        .insert({
          email: email!,
          nom,
          prenom,
          telephone: telephone || null,
          numero_inami: numero_inami?.trim() || null,
          numero_entreprise: numero_entreprise?.trim() || null,
          assujetti_tva: assujettiTva,
          numero_tva: numero_tva?.trim() || null,
          cabinet_nom: cabinet_nom || null,
          cabinet_id: cabinetId,
          role_cible: "dentiste",
          onboarding_source: "invitation_labo",
          type_compte_client,
          token,
          expire_at: expireAt,
          created_by: userId,
        })
        .select("id, token, expire_at")
        .single();
      if (error || !inv) {
        return NextResponse.json(
          { error: error?.message || "Erreur création invitation" },
          { status: 400 }
        );
      }

      const tpl = emailTemplates.invitation({
        prenom,
        email: email!,
        token: inv.token,
      });
      const emailResult = await sendEmail({
        to: email!,
        template: "invitation",
        subject: tpl.subject,
        html: tpl.html,
        prefKey: "email_invitation",
        payload: { invitation_id: inv.id },
      });

      const meta = extractRequestMeta(request);
      await logAudit({
        actor_id: userId,
        actor_role: "admin",
        action: "client.create.invitation",
        entity_type: "invitation",
        entity_id: inv.id,
        metadata: { email },
        ip: meta.ip,
        user_agent: meta.user_agent,
      });
      return NextResponse.json({
        success: true,
        mode: "invitation",
        invitation_id: inv.id,
        url: `${request.nextUrl.origin}/register?invitation=${encodeURIComponent(inv.token)}`,
        email_sent: emailResult.ok,
        email_error: emailResult.ok ? null : emailResult.error || "Échec d’envoi",
      });
    }

    // === SANS COMPTE ===
    const newId = crypto.randomUUID();
    const { data: profil, error } = await admin
      .from("profiles")
      .insert({
        id: newId,
        email: email?.trim() || null,
        nom,
        prenom,
        telephone: telephone || null,
        numero_inami: numero_inami?.trim() || null,
        numero_entreprise: numero_entreprise?.trim() || null,
        assujetti_tva: assujettiTva,
        numero_tva: numero_tva?.trim() || null,
        type_compte_client,
        role: "dentiste",
        statut_compte: "approuve",
        actif: true,
        cabinet_id: cabinetId,
        sans_compte: true,
        created_by: userId,
      })
      .select("id, nom, prenom, email")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const meta = extractRequestMeta(request);
    await logAudit({
      actor_id: userId,
      actor_role: "admin",
      action: "client.create.sans_compte",
      entity_type: "profile",
      entity_id: profil.id,
      metadata: { email, cabinet: cabinet_nom },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return NextResponse.json({
      success: true,
      mode: "sans_compte",
      profile_id: profil.id,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur interne" },
      { status: 500 }
    );
  }
}
