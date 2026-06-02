import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logAudit, extractRequestMeta } from "@/lib/audit";

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
 * POST /api/admin/patients
 * Crée un patient au nom d'un dentiste (ou orphelin si dentiste_id absent).
 * Body: { dentiste_id?, nom, prenom, date_naissance?, sexe?, telephone?, email?,
 *         notes?, allergies?, antecedents?, traitements_en_cours?,
 *         contre_indications?, medecin_traitant? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;

  const body = await request.json();
  if (!body?.nom || !body?.prenom) {
    return NextResponse.json(
      { error: "nom et prenom requis" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("patients")
    .insert({
      dentiste_id: body.dentiste_id || null,
      nom: body.nom,
      prenom: body.prenom,
      date_naissance: body.date_naissance || null,
      sexe: body.sexe || null,
      telephone: body.telephone || null,
      email: body.email || null,
      notes: body.notes || null,
      allergies: body.allergies || null,
      antecedents: body.antecedents || null,
      traitements_en_cours: body.traitements_en_cours || null,
      contre_indications: body.contre_indications || null,
      medecin_traitant: body.medecin_traitant || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Erreur création" },
      { status: 400 }
    );
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action: "patient.create.by_admin",
    entity_type: "patient",
    entity_id: data.id,
    metadata: {
      reference: data.reference,
      dentiste_id: data.dentiste_id,
      orphelin: !data.dentiste_id,
    },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true, patient: data });
}
