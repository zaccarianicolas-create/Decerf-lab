import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { sendEmail, emailTemplates } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET : export JSON immédiat de toutes les données du praticien connecté.
 * POST : enregistre une demande RGPD (export / suppression / rectification).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const rl = await rateLimit(request, {
    key: "rgpd_export",
    limit: 3,
    windowMs: 60 * 60 * 1000,
    by: "user",
    userId: user.id,
  });
  if (!rl.ok) return rl.response;

  const admin = createAdminClient();

  const [
    { data: profile },
    { data: patients },
    { data: commandes },
    { data: factures },
    { data: avoirs },
    { data: ecritures },
    { data: rgpdRequests },
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    admin.from("patients").select("*").eq("dentiste_id", user.id),
    admin
      .from("commandes")
      .select(
        "*, items:commande_items(*), fichiers:fichiers(id, nom_original, file_kind, created_at), certificats:certificats_conformite(*)"
      )
      .eq("dentiste_id", user.id),
    admin.from("factures").select("*, lignes:facture_lignes(*)").eq("dentiste_id", user.id),
    admin.from("avoirs").select("*").eq("dentiste_id", user.id),
    admin.from("ecritures_compte_client").select("*").eq("dentiste_id", user.id),
    admin.from("rgpd_requests").select("*").eq("user_id", user.id),
  ]);

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: user.id,
    actor_role: "dentiste",
    action: "rgpd.export",
    entity_type: "profile",
    entity_id: user.id,
    metadata: {
      counts: {
        patients: patients?.length ?? 0,
        commandes: commandes?.length ?? 0,
        factures: factures?.length ?? 0,
        avoirs: avoirs?.length ?? 0,
      },
    },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  const payload = {
    exported_at: new Date().toISOString(),
    profile: profile ?? null,
    patients: patients ?? [],
    commandes: commandes ?? [],
    factures: factures ?? [],
    avoirs: avoirs ?? [],
    ecritures_compte_client: ecritures ?? [],
    rgpd_requests: rgpdRequests ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="export-rgpd-${user.id}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const rl = await rateLimit(request, {
    key: "rgpd_request",
    limit: 5,
    windowMs: 60 * 60 * 1000,
    by: "user",
    userId: user.id,
  });
  if (!rl.ok) return rl.response;

  const body = await request.json();
  const type = body?.type as "export" | "suppression" | "rectification" | undefined;
  const message = (body?.message as string | undefined)?.slice(0, 2000) || null;

  if (!type || !["export", "suppression", "rectification"].includes(type)) {
    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rgpd_requests")
    .insert({
      user_id: user.id,
      type,
      statut: "demande",
      message,
    })
    .select("id, type, statut, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Erreur enregistrement" },
      { status: 400 }
    );
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: user.id,
    actor_role: "dentiste",
    action: `rgpd.request.${type}`,
    entity_type: "rgpd_request",
    entity_id: data.id,
    metadata: { has_message: Boolean(message) },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  const { data: prof } = await admin
    .from("profiles")
    .select("email, prenom")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.email) {
    const tpl = emailTemplates.rgpd_recu({ prenom: prof.prenom ?? undefined, type });
    await sendEmail({
      to: prof.email,
      toUserId: user.id,
      template: "rgpd_recu",
      subject: tpl.subject,
      html: tpl.html,
      prefKey: "email_rgpd",
      payload: { request_id: data.id },
    });
  }

  return NextResponse.json({ success: true, request: data });
}
