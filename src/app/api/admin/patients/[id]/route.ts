import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logAudit, extractRequestMeta } from "@/lib/audit";

async function requireAdmin(patientId: string) {
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
  const { data: patient } = await admin
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient) {
    return { error: NextResponse.json({ error: "Patient introuvable" }, { status: 404 }) };
  }
  return { admin, userId: user.id, patient };
}

/**
 * PATCH /api/admin/patients/[id]
 * Update générique + réassignation dentiste_id possible (l'historique des commandes reste lié au dentiste d'origine).
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ctx = await requireAdmin(id);
  if (ctx.error) return ctx.error;
  const { admin, userId, patient } = ctx;

  const body = await request.json();
  const allowed = [
    "nom",
    "prenom",
    "date_naissance",
    "sexe",
    "notes",
    "telephone",
    "email",
    "allergies",
    "antecedents",
    "traitements_en_cours",
    "contre_indications",
    "medecin_traitant",
    "dentiste_id",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      updates[k] = body[k] === "" ? null : body[k];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  const { error } = await admin
    .from("patients")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action:
      "dentiste_id" in updates
        ? "patient.reassign.by_admin"
        : "patient.update.by_admin",
    entity_type: "patient",
    entity_id: id,
    metadata: {
      ancien_dentiste_id: patient.dentiste_id,
      nouveau_dentiste_id: updates.dentiste_id ?? patient.dentiste_id,
      fields: Object.keys(updates),
    },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true });
}

/**
 * POST /api/admin/patients/[id]
 * action: "archive" | "restore" | "anonymize"
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ctx = await requireAdmin(id);
  if (ctx.error) return ctx.error;
  const { admin, userId } = ctx;

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
    actor_role: "admin",
    action: `patient.${action}.by_admin`,
    entity_type: "patient",
    entity_id: id,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true });
}
