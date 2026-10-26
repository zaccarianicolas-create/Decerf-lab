import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractRequestMeta, logAudit } from "@/lib/audit";

async function requireTechnicien() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, actif, actif_collaborateur")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "technicien" || !profile.actif || !profile.actif_collaborateur) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }
  return { admin, userId: user.id };
}

export async function GET(request: NextRequest) {
  const auth = await requireTechnicien();
  if (auth.error) return auth.error;
  const dentistId = request.nextUrl.searchParams.get("dentiste_id");
  if (!dentistId) return NextResponse.json({ error: "dentiste_id requis" }, { status: 400 });

  const { data: dentist } = await auth.admin
    .from("profiles")
    .select("id")
    .eq("id", dentistId)
    .eq("role", "dentiste")
    .eq("actif", true)
    .maybeSingle();
  if (!dentist) return NextResponse.json({ error: "Dentiste introuvable ou inactif." }, { status: 404 });

  const { data, error } = await auth.admin
    .from("patients")
    .select("id, reference, nom, prenom")
    .eq("dentiste_id", dentistId)
    .eq("actif", true)
    .order("nom");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ patients: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireTechnicien();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const dentistId = typeof body?.dentiste_id === "string" ? body.dentiste_id : "";
  const nom = typeof body?.nom === "string" ? body.nom.trim() : "";
  const prenom = typeof body?.prenom === "string" ? body.prenom.trim() : "";
  const dateNaissance = typeof body?.date_naissance === "string" ? body.date_naissance : null;
  if (!dentistId || !nom || !prenom) {
    return NextResponse.json({ error: "Dentiste, nom et prénom sont requis." }, { status: 400 });
  }

  const { data: dentist } = await admin
    .from("profiles")
    .select("id")
    .eq("id", dentistId)
    .eq("role", "dentiste")
    .eq("actif", true)
    .maybeSingle();
  if (!dentist) return NextResponse.json({ error: "Dentiste introuvable ou inactif." }, { status: 404 });

  const { data: patient, error } = await admin
    .from("patients")
    .insert({ dentiste_id: dentistId, nom, prenom, date_naissance: dateNaissance || null })
    .select("id, reference, nom, prenom")
    .single();
  if (error || !patient) {
    return NextResponse.json({ error: error?.message || "Création du patient impossible." }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "technicien",
    action: "patient.create.by_technicien",
    entity_type: "patient",
    entity_id: patient.id,
    metadata: { dentiste_id: dentistId, reference: patient.reference },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });
  return NextResponse.json({ patient }, { status: 201 });
}
