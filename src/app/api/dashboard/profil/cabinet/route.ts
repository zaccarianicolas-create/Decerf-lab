import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const readCabinetFields = (body: Record<string, unknown>) => ({
  nom: typeof body.nom === "string" ? body.nom.trim() : "",
  adresse: typeof body.adresse === "string" ? body.adresse.trim() : "",
  code_postal: typeof body.code_postal === "string" ? body.code_postal.trim() : "",
  ville: typeof body.ville === "string" ? body.ville.trim() : "",
  telephone: typeof body.telephone === "string" ? body.telephone.trim() : "",
  email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
});

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, cabinet_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "dentiste") {
    return NextResponse.json({ error: "Profil client introuvable." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const fields = readCabinetFields(body);
  if (!fields.nom || !fields.adresse || !fields.code_postal || !fields.ville) {
    return NextResponse.json({ error: "Nom, rue, code postal et ville sont requis." }, { status: 400 });
  }

  if (profile.cabinet_id) {
    const { data, error } = await admin
      .from("cabinets")
      .update({
        ...fields,
        telephone: fields.telephone || null,
        email: fields.email || null,
      })
      .eq("id", profile.cabinet_id)
      .select("id, nom, adresse, code_postal, ville, telephone, email")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Impossible de mettre à jour le cabinet." }, { status: 400 });
    }
    return NextResponse.json({ cabinet: data });
  }

  const { data: cabinet, error: cabinetError } = await admin
    .from("cabinets")
    .insert({
      ...fields,
      telephone: fields.telephone || null,
      email: fields.email || null,
      onboarding_source: "inscription_site",
    })
    .select("id, nom, adresse, code_postal, ville, telephone, email")
    .single();
  if (cabinetError || !cabinet) {
    return NextResponse.json({ error: cabinetError?.message || "Impossible de créer le cabinet." }, { status: 400 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ cabinet_id: cabinet.id })
    .eq("id", profile.id);
  if (profileError) {
    await admin.from("cabinets").delete().eq("id", cabinet.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ cabinet });
}
