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

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin } = auth;
  const { data, error } = await admin
    .from("parametres_labo")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ parametres: data });
}

const ALLOWED_KEYS = [
  "nom_labo",
  "adresse",
  "code_postal",
  "ville",
  "pays",
  "telephone",
  "email_contact",
  "site_web",
  "tva_numero",
  "numero_agrement",
  "iban",
  "bic",
  "logo_url",
  "signature_url",
  "couleur_primaire",
  "taux_tva_defaut",
  "mentions_legales_facture",
  "mentions_legales_certificat",
  "conditions_paiement",
  "horaires",
  "prefixe_facture",
  "prefixe_certificat",
  "prefixe_devis",
  "validation_manuelle_comptes",
  "max_upload_scan_mb",
  "retention_scans_annees",
  "gestion_avoirs_active",
];

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const body = await request.json();
  const patch: Record<string, unknown> = {};
  for (const k of ALLOWED_KEYS) if (k in body) patch[k] = body[k];
  patch.updated_by = userId;

  const { data: existing } = await admin
    .from("parametres_labo")
    .select("id")
    .limit(1)
    .maybeSingle();

  let result;
  if (existing?.id) {
    result = await admin
      .from("parametres_labo")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();
  } else {
    result = await admin
      .from("parametres_labo")
      .insert(patch)
      .select("*")
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action: "parametres_labo.update",
    entity_type: "parametres_labo",
    entity_id: result.data.id,
    metadata: { keys: Object.keys(patch) },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true, parametres: result.data });
}
