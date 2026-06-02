import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logAudit, extractRequestMeta } from "@/lib/audit";

async function requireDentiste(patientId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  const { data: patient } = await admin
    .from("patients")
    .select("id, dentiste_id, nom, prenom")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient) {
    return { error: NextResponse.json({ error: "Patient introuvable" }, { status: 404 }) };
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isOwner = patient.dentiste_id === user.id;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }
  return { admin, userId: user.id, patient, role: isAdmin ? "admin" : "dentiste" };
}

// Archive (soft delete) ou réactive un patient
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ctx = await requireDentiste(id);
  if (ctx.error) return ctx.error;
  const { admin, userId, role } = ctx;
  const body = await request.json();
  const action = body?.action as "archive" | "restore" | "anonymize" | undefined;

  if (action === "archive") {
    await admin
      .from("patients")
      .update({ archived_at: new Date().toISOString(), actif: false })
      .eq("id", id);
  } else if (action === "restore") {
    await admin
      .from("patients")
      .update({ archived_at: null, actif: true })
      .eq("id", id);
  } else if (action === "anonymize") {
    await admin
      .from("patients")
      .update({
        nom: "Anonymisé",
        prenom: "Anonymisé",
        date_naissance: null,
        sexe: null,
        telephone: null,
        email: null,
        notes: null,
        allergies: null,
        antecedents: null,
        traitements_en_cours: null,
        contre_indications: null,
        medecin_traitant: null,
        anonymized_at: new Date().toISOString(),
        archived_at: new Date().toISOString(),
        actif: false,
      })
      .eq("id", id);
  } else {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: role,
    action: `patient.${action}`,
    entity_type: "patient",
    entity_id: id,
    metadata: undefined,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true });
}
