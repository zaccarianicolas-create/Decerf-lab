import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { renderCertificateTemplate, validateCertificateTemplate } from "@/lib/certificat-template";

const editableFields = [
  "labo_nom",
  "labo_adresse",
  "labo_responsable",
  "labo_numero_agrement",
  "labo_site_fabrication",
  "dentiste_nom",
  "dentiste_inami",
  "patient_reference",
  "description_travail",
  "materiaux_utilises",
  "dents",
  "lot_materiaux",
  "classe_dispositif",
  "code_nomenclature",
  "normes_appliquees",
  "declaration_conformite",
  "signe_par",
  "date_emission",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { data: certificate } = await admin
    .from("certificats_conformite")
    .select("id, statut, modele_id, modele_version, donnees_snapshot, numero_certificat, labo_site_fabrication")
    .eq("id", id)
    .maybeSingle();
  if (!certificate) return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
  if (certificate.statut !== "brouillon") {
    return NextResponse.json({ error: "Une fiche validée ne peut plus être modifiée." }, { status: 409 });
  }

  const { data: template } = await admin
    .from("certificat_modeles")
    .select("id, contenu_template, version")
    .eq("id", typeof body?.modele_id === "string" ? body.modele_id : certificate.modele_id)
    .eq("actif", true)
    .maybeSingle();
  if (!template) return NextResponse.json({ error: "Modèle de fiche introuvable." }, { status: 409 });
  const templateErrors = validateCertificateTemplate(template.contenu_template);
  if (templateErrors.length) return NextResponse.json({ error: templateErrors.join(" ") }, { status: 409 });

  const snapshot = (certificate.donnees_snapshot || {}) as Record<string, unknown>;
  const dentistSnapshot = (snapshot.dentiste || {}) as Record<string, unknown>;
  const materials = Array.isArray(snapshot.materiaux_lots) ? snapshot.materiaux_lots as Array<Record<string, unknown>> : [];
  const values: Record<string, string> = {};
  for (const key of editableFields) {
    if (typeof body?.[key] === "string") values[key] = body[key];
  }
  const materialText = materials.length
    ? materials.map((material) => `${material.nom || "Article"}${material.numero_lot ? ` — lot ${material.numero_lot}` : ""} (${material.quantite || 0}${material.unite ? ` ${material.unite}` : ""})`).join("\n")
    : values.materiaux_utilises || "";
  const exigencesNonSatisfaites = typeof body?.exigences_non_satisfaites === "string"
    ? body.exigences_non_satisfaites.trim()
    : String(snapshot.exigences_non_satisfaites || "");
  const justification = typeof body?.justification === "string"
    ? body.justification.trim()
    : String(snapshot.justification || "");
  const tagValues: Record<string, string> = {
    "labo.nom": values.labo_nom || "",
    "labo.adresse": values.labo_adresse || "",
    "labo.site_fabrication": values.labo_site_fabrication || "",
    "dispositifs.liste": values.description_travail || "",
    "patient.identifiant": values.patient_reference || "",
    "dentiste.nom": values.dentiste_nom || "",
    "dentiste.cabinet": String(dentistSnapshot.cabinet || ""),
    "dentiste.adresse": String(dentistSnapshot.adresse || ""),
    "prescription.caracteristiques": values.description_travail || "",
    "production.materiaux_lots": materialText,
    "conformite.declaration": values.declaration_conformite || "",
    "conformite.exigences_non_satisfaites": exigencesNonSatisfaites,
    "conformite.justification": justification,
    "conformite.classe_dispositif": values.classe_dispositif || "",
    "conformite.code_nomenclature": values.code_nomenclature || "",
    "document.date_emission": values.date_emission ? new Date(values.date_emission).toLocaleDateString("fr-BE") : "",
    "document.signataire": values.signe_par || "",
    "document.numero": certificate.numero_certificat,
  };
  const content = renderCertificateTemplate(template.contenu_template, tagValues);
  const nextSnapshot = {
    ...snapshot,
    modele_id: template.id,
    modele_version: template.version,
    contenu: content,
    edited_at: new Date().toISOString(),
    fields: { ...values, exigences_non_satisfaites: exigencesNonSatisfaites, justification },
  };
  const payload = {
    ...values,
    modele_id: template.id,
    modele_version: template.version,
    contenu_complet: content,
    donnees_snapshot: nextSnapshot,
    labo_site_fabrication: values.labo_site_fabrication || null,
    classe_dispositif: ["I", "IIa", "IIb", "III"].includes(values.classe_dispositif || "") ? values.classe_dispositif : null,
    code_nomenclature: values.code_nomenclature || null,
  };
  const { data: updated, error } = await admin
    .from("certificats_conformite")
    .update(payload)
    .eq("id", id)
    .eq("statut", "brouillon")
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updated);
}
