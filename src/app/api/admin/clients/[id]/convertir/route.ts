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
 * Convertit un client "sans_compte" en compte réel ou en invitation envoyée.
 * Body: { mode: "compte" | "invitation", email? }
 *
 * - mode "compte" : crée auth.users avec l'id existant impossible → on relie via email.
 *   Stratégie : on crée un nouveau auth.users (nouvel id) puis on RÉASSIGNE
 *   toutes les références (commandes, factures, patients, etc.) vers ce nouvel id,
 *   puis on supprime le profil sans_compte.
 * - mode "invitation" : envoie un lien d'invitation ; à l'acceptation, l'utilisateur
 *   est créé normalement. On peut ensuite refaire un merge.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const { id: oldId } = await context.params;
  const body = await request.json();
  const mode = body?.mode as "compte" | "invitation";
  const emailOverride = (body?.email as string | undefined)?.trim();

  const { data: old } = await admin
    .from("profiles")
    .select("*")
    .eq("id", oldId)
    .maybeSingle();
  if (!old || !old.sans_compte) {
    return NextResponse.json(
      { error: "Profil introuvable ou déjà un compte" },
      { status: 404 }
    );
  }
  const email = emailOverride || old.email;
  if (!email) {
    return NextResponse.json(
      { error: "Email requis pour activer ce client" },
      { status: 400 }
    );
  }

  if (mode === "invitation") {
    const token = `${crypto.randomUUID()}-${Date.now().toString(36)}`;
    const expireAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: inv, error } = await admin
      .from("invitations_inscription")
      .insert({
        email,
        nom: old.nom,
        prenom: old.prenom,
        telephone: old.telephone,
        cabinet_id: old.cabinet_id,
        role_cible: "dentiste",
        onboarding_source: "conversion_sans_compte",
        type_compte_client: "dentiste_independant",
        token,
        expire_at: expireAt,
        created_by: userId,
        metadata: { sans_compte_profile_id: oldId },
      })
      .select("id, token")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const tpl = emailTemplates.invitation({
      prenom: old.prenom,
      email,
      token: inv.token,
    });
    await sendEmail({
      to: email,
      template: "invitation",
      subject: tpl.subject,
      html: tpl.html,
      prefKey: "email_invitation",
    });

    const meta = extractRequestMeta(request);
    await logAudit({
      actor_id: userId,
      actor_role: "admin",
      action: "client.convert.invitation",
      entity_type: "profile",
      entity_id: oldId,
      metadata: { email, invitation_id: inv.id },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });

    return NextResponse.json({
      success: true,
      mode: "invitation",
      url: `${request.nextUrl.origin}/register?invitation=${encodeURIComponent(inv.token)}`,
    });
  }

  if (mode === "compte") {
    // Crée le compte auth.users
    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { nom: old.nom, prenom: old.prenom, role: "dentiste" },
      });
    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: authError?.message || "Erreur création compte" },
        { status: 400 }
      );
    }
    const newId = authUser.user.id;

    // Le trigger handle_new_user a probablement inséré un profil → on le supprime
    await admin.from("profiles").delete().eq("id", newId);

    // Repointer toutes les FK qui ciblaient l'ancien id vers le nouveau,
    // puis renommer l'ancien profil avec le nouvel id.
    const tablesToRewire = [
      "commandes",
      "factures",
      "patients",
      "avoirs",
      "ecritures_compte_client",
      "rgpd_requests",
      "conversations",
    ];
    for (const t of tablesToRewire) {
      // Champ "dentiste_id" sur la plupart
      await admin.from(t).update({ dentiste_id: newId }).eq("dentiste_id", oldId);
    }
    // user_id pour rgpd_requests
    await admin.from("rgpd_requests").update({ user_id: newId }).eq("user_id", oldId);

    // Mettre à jour le profil existant en changeant son id
    await admin
      .from("profiles")
      .update({
        id: newId,
        sans_compte: false,
        statut_compte: "approuve",
        actif: true,
        email,
      })
      .eq("id", oldId);

    // Magic link
    await admin.auth.admin.generateLink({ type: "magiclink", email });

    const meta = extractRequestMeta(request);
    await logAudit({
      actor_id: userId,
      actor_role: "admin",
      action: "client.convert.compte",
      entity_type: "profile",
      entity_id: newId,
      metadata: { previous_id: oldId, email },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });

    return NextResponse.json({
      success: true,
      mode: "compte",
      profile_id: newId,
    });
  }

  return NextResponse.json({ error: "Mode invalide" }, { status: 400 });
}
