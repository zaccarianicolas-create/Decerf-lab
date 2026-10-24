import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractRequestMeta, logAudit } from "@/lib/audit";
import { emailTemplates, sendEmail } from "@/lib/email";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: actor } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (actor?.role !== "admin") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const body = await request.json().catch(() => null) as { statut?: string } | null;
  if (body?.statut !== "approuve" && body?.statut !== "rejete") {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  const { id } = await params;
  const { data: client, error: readError } = await admin
    .from("profiles")
    .select("id, nom, prenom, email, role, statut_compte")
    .eq("id", id)
    .maybeSingle();
  if (readError || !client || client.role !== "dentiste") {
    return NextResponse.json({ error: readError?.message || "Dentiste introuvable." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      statut_compte: body.statut,
      actif: body.statut === "approuve",
      ...(body.statut === "approuve" ? { valide_par: user.id, date_validation: now } : {}),
    })
    .eq("id", client.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  let emailSent: boolean | null = null;
  let emailError: string | null = null;
  if (body.statut === "approuve" && client.statut_compte !== "approuve" && client.email) {
    const template = emailTemplates.compte_approuve({ prenom: client.prenom ?? undefined });
    const result = await sendEmail({
      to: client.email,
      toUserId: client.id,
      template: "compte_approuve",
      subject: template.subject,
      html: template.html,
      payload: { profile_id: client.id },
    });
    emailSent = result.ok;
    emailError = result.ok ? null : result.error || "Échec d’envoi";
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: user.id,
    actor_role: "admin",
    action: body.statut === "approuve" ? "client.approve" : "client.reject",
    entity_type: "profile",
    entity_id: client.id,
    metadata: { previous_status: client.statut_compte, status: body.statut, email_sent: emailSent },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({
    success: true,
    statut_compte: body.statut,
    actif: body.statut === "approuve",
    email_sent: emailSent,
    email_error: emailError,
  });
}
