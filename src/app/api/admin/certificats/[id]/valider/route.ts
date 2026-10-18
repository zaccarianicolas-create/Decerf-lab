import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const { data: certificate, error: readError } = await admin
    .from("certificats_conformite")
    .select("id, statut, labo_nom, labo_adresse, labo_site_fabrication, dentiste_nom, patient_reference, description_travail, declaration_conformite, signe_par, classe_dispositif, donnees_snapshot, commande_id, numero_certificat")
    .eq("id", id)
    .maybeSingle();
  if (readError || !certificate) {
    return NextResponse.json({ error: readError?.message || "Fiche introuvable." }, { status: 404 });
  }
  if (certificate.statut !== "brouillon") {
    return NextResponse.json({ error: "Seul un brouillon peut être validé." }, { status: 409 });
  }

  const missing = [
    ["Nom du fabricant", certificate.labo_nom],
    ["Adresse du fabricant", certificate.labo_adresse],
    ["Site de fabrication", certificate.labo_site_fabrication],
    ["Identification du patient par nom, acronyme ou code", certificate.patient_reference],
    ["Prescripteur", certificate.dentiste_nom],
    ["Description/caractéristiques du dispositif", certificate.description_travail],
    ["Déclaration du fabricant", certificate.declaration_conformite],
    ["Signataire", certificate.signe_par],
    ["Classe du dispositif", certificate.classe_dispositif],
  ].filter(([, value]) => !String(value || "").trim()).map(([label]) => label);

  const snapshot = (certificate.donnees_snapshot || {}) as Record<string, unknown>;
  const dentistSnapshot = (snapshot.dentiste || {}) as Record<string, unknown>;
  if (!String(dentistSnapshot.adresse || "").trim()) missing.push("Adresse du prescripteur");
  const unmetRequirements = String(snapshot.exigences_non_satisfaites || "").trim();
  const justification = String(snapshot.justification || "").trim();
  if (!unmetRequirements) missing.push("Réponse explicite sur les exigences non satisfaites");
  const indicatesNoUnmetRequirements = /^(aucun(?:e)?|n[ée]ant|non applicable)$/i.test(unmetRequirements);
  if (unmetRequirements && !indicatesNoUnmetRequirements && !justification) {
    missing.push("Justification des exigences non satisfaites");
  }
  if (missing.length) {
    return NextResponse.json({ error: `Complétez avant validation : ${missing.join("; ")}.` }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("certificats_conformite")
    .update({ statut: "valide", valide_par: user.id, date_validation: now })
    .eq("id", certificate.id)
    .eq("statut", "brouillon")
    .select("*")
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await admin.from("commande_workflow_events").insert({
    commande_id: certificate.commande_id,
    type: "information",
    titre: "Déclaration de conformité validée",
    description: certificate.numero_certificat,
    visible_praticien: true,
    created_by: user.id,
    metadata: { source: "certificat", certificat_id: certificate.id },
  });
  return NextResponse.json(updated);
}
