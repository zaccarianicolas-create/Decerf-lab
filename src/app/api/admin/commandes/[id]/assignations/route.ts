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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const { id: commandeId } = await context.params;

  const body = await request.json();
  const technicienId = body?.technicien_id as string | undefined;
  const role = (body?.role as string | undefined) || "responsable";

  if (!technicienId) {
    return NextResponse.json({ error: "technicien_id requis" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("commande_assignations")
    .insert({
      commande_id: commandeId,
      technicien_id: technicienId,
      role,
      assigned_by: userId,
    })
    .select("id, technicien_id, role")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action: "assignation.create",
    entity_type: "commande",
    entity_id: commandeId,
    metadata: { technicien_id: technicienId, role },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  const { data: tech } = await admin
    .from("profiles")
    .select("email, prenom")
    .eq("id", technicienId)
    .maybeSingle();
  const { data: cmd } = await admin
    .from("commandes")
    .select("numero")
    .eq("id", commandeId)
    .maybeSingle();
  if (tech?.email) {
    const tpl = emailTemplates.assignation_tache({
      prenom: tech.prenom ?? undefined,
      titre: `Rôle ${role}`,
      commande: cmd?.numero ?? "",
    });
    await sendEmail({
      to: tech.email,
      toUserId: technicienId,
      template: "assignation_tache",
      subject: tpl.subject,
      html: tpl.html,
      prefKey: "email_assignation",
      payload: { commande_id: commandeId, assignation_id: data.id },
    });
  }

  return NextResponse.json({ success: true, assignation: data });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const { id: commandeId } = await context.params;

  const { searchParams } = new URL(request.url);
  const assignationId = searchParams.get("assignation_id");

  if (!assignationId) {
    return NextResponse.json(
      { error: "assignation_id requis" },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("commande_assignations")
    .delete()
    .eq("id", assignationId)
    .eq("commande_id", commandeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action: "assignation.delete",
    entity_type: "commande",
    entity_id: commandeId,
    metadata: { assignation_id: assignationId },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true });
}
