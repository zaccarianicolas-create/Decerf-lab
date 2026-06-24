import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractRequestMeta, logAudit } from "@/lib/audit";

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

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;

  const body = (await request.json()) as {
    protocole_id?: string;
    commande_id?: string;
    patient_id?: string | null;
    dentiste_id?: string | null;
    titre?: string;
    sections?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };

  if (!body.protocole_id) {
    return NextResponse.json({ error: "protocole_id requis" }, { status: 400 });
  }

  const { data: protocole } = await admin
    .from("protocoles")
    .select("id, titre, type_protocole, type_travail, version, template_sections")
    .eq("id", body.protocole_id)
    .single();

  if (!protocole) {
    return NextResponse.json({ error: "Protocole introuvable" }, { status: 404 });
  }

  const sections = {
    ...(protocole.template_sections ?? {}),
    ...(body.sections ?? {}),
  };

  const { data: instance, error } = await admin
    .from("protocole_instances")
    .insert({
      protocole_id: protocole.id,
      commande_id: body.commande_id ?? null,
      patient_id: body.patient_id ?? null,
      dentiste_id: body.dentiste_id ?? null,
      titre: body.titre || protocole.titre,
      type_protocole: protocole.type_protocole,
      type_travail: protocole.type_travail,
      version: protocole.version,
      sections,
      template_snapshot: protocole,
      metadata: body.metadata ?? {},
      created_by: userId,
    })
    .select("*")
    .single();

  if (error || !instance) {
    return NextResponse.json({ error: error?.message || "Erreur création" }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action: "protocole_instance.create",
    entity_type: "protocole_instance",
    entity_id: instance.id,
    metadata: {
      protocole_id: protocole.id,
      commande_id: instance.commande_id,
      patient_id: instance.patient_id,
      dentiste_id: instance.dentiste_id,
    },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true, instance });
}
