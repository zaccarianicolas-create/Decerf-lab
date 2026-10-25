import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractRequestMeta, logAudit } from "@/lib/audit";

const readText = (value: unknown) => typeof value === "string" ? value.trim() : "";

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

  const { id } = await params;
  const { data: client, error: clientError } = await admin
    .from("profiles")
    .select("id, role, cabinet_id, nom, prenom, telephone, numero_inami, numero_entreprise, assujetti_tva, numero_tva, mode_travail_prefere, modele_scanner, cabinet:cabinets(nom, adresse, code_postal, ville, telephone, email)")
    .eq("id", id)
    .maybeSingle();
  if (clientError || !client || client.role !== "dentiste") {
    return NextResponse.json({ error: clientError?.message || "Client introuvable." }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !body.profile || typeof body.profile !== "object" || !body.cabinet || typeof body.cabinet !== "object") {
    return NextResponse.json({ error: "Données du client invalides." }, { status: 400 });
  }

  const profile = body.profile as Record<string, unknown>;
  const assujettiTva = profile.assujetti_tva;
  if (assujettiTva !== null && typeof assujettiTva !== "boolean") {
    return NextResponse.json({ error: "Statut TVA invalide." }, { status: 400 });
  }
  const numeroTva = readText(profile.numero_tva);
  if (assujettiTva === true && !numeroTva) {
    return NextResponse.json({ error: "Le numéro TVA est requis quand le client se déclare assujetti." }, { status: 400 });
  }

  const profileUpdate = {
    nom: readText(profile.nom),
    prenom: readText(profile.prenom),
    telephone: readText(profile.telephone) || null,
    numero_inami: readText(profile.numero_inami) || null,
    numero_entreprise: readText(profile.numero_entreprise) || null,
    assujetti_tva: assujettiTva,
    numero_tva: numeroTva || null,
    mode_travail_prefere: readText(profile.mode_travail_prefere) || null,
    modele_scanner: readText(profile.modele_scanner) || null,
  };
  const numeroInamiChanged = profileUpdate.numero_inami !== (client.numero_inami || null);
  const currentProfile = client as unknown as Record<string, unknown>;
  const changedProfileFields = Object.entries(profileUpdate)
    .filter(([key, value]) => (currentProfile[key] ?? null) !== value)
    .map(([key]) => key);

  const cabinet = body.cabinet as Record<string, unknown>;
  const cabinetUpdate = {
    nom: readText(cabinet.nom),
    adresse: readText(cabinet.adresse) || null,
    code_postal: readText(cabinet.code_postal) || null,
    ville: readText(cabinet.ville) || null,
    telephone: readText(cabinet.telephone) || null,
    email: readText(cabinet.email).toLowerCase() || null,
  };
  const currentCabinet = Array.isArray(client.cabinet) ? client.cabinet[0] : client.cabinet;
  const currentCabinetFields = (currentCabinet ?? {}) as Record<string, unknown>;
  const changedCabinetFields = Object.entries(cabinetUpdate)
    .filter(([key, value]) => (currentCabinetFields[key] ?? null) !== value)
    .map(([key]) => key);

  let cabinetId = client.cabinet_id;
  let savedCabinet = null;
  if (cabinetId) {
    const { data, error } = await admin
      .from("cabinets")
      .update(cabinetUpdate)
      .eq("id", cabinetId)
      .select("id, nom, adresse, code_postal, ville, telephone, email")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Impossible d’enregistrer le cabinet." }, { status: 400 });
    }
    savedCabinet = data;
  } else if (Object.values(cabinetUpdate).some(Boolean)) {
    if (!cabinetUpdate.nom) {
      return NextResponse.json({ error: "Le nom du cabinet est requis pour créer son adresse." }, { status: 400 });
    }
    const { data, error } = await admin
      .from("cabinets")
      .insert({ ...cabinetUpdate, onboarding_source: "admin" })
      .select("id, nom, adresse, code_postal, ville, telephone, email")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Impossible de créer le cabinet." }, { status: 400 });
    }
    cabinetId = data.id;
    savedCabinet = data;
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      ...profileUpdate,
      ...(cabinetId !== client.cabinet_id ? { cabinet_id: cabinetId } : {}),
      ...(numeroInamiChanged
        ? { numero_inami_verifie: false, numero_inami_verifie_le: null, numero_inami_verifie_par: null }
        : {}),
    })
    .eq("id", client.id);
  if (profileError) {
    if (cabinetId && cabinetId !== client.cabinet_id) await admin.from("cabinets").delete().eq("id", cabinetId);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: user.id,
    actor_role: "admin",
    action: "client.update",
    entity_type: "profile",
    entity_id: client.id,
    metadata: {
      profile_fields: changedProfileFields,
      cabinet_fields: changedCabinetFields,
    },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true, cabinet: savedCabinet });
}
