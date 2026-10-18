import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getParametresLabo } from "@/lib/parametres-labo";
import { renderCertificateTemplate, validateCertificateTemplate } from "@/lib/certificat-template";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const commandeId = body?.commande_id;
  const itemId = body?.commande_item_id;
  if (typeof commandeId !== "string" || typeof itemId !== "string") {
    return NextResponse.json(
      { error: "commande_id et commande_item_id sont requis" },
      { status: 400 }
    );
  }
  if (body?.dispositif_sur_mesure !== true) {
    return NextResponse.json(
      { error: "Confirmez que cette ligne est un dispositif sur mesure." },
      { status: 400 }
    );
  }

  const [{ data: commande }, { data: item }, { data: template }, { data: movements }] =
    await Promise.all([
      admin
        .from("commandes")
        .select("id, numero, dentiste_id, patient_id, patient_ref, patient:patients(reference), dentiste:profiles!commandes_dentiste_id_fkey(id, nom, prenom, email, numero_inami, cabinet:cabinets(nom, adresse, code_postal, ville))")
        .eq("id", commandeId)
        .maybeSingle(),
      admin
        .from("commande_items")
        .select("id, commande_id, type_travail, item_label, description, dents, materiau, teinte, infos_travail")
        .eq("id", itemId)
        .eq("commande_id", commandeId)
        .maybeSingle(),
      typeof body.modele_id === "string"
        ? admin.from("certificat_modeles").select("id, contenu_template, version").eq("id", body.modele_id).eq("actif", true).maybeSingle()
        : admin.from("certificat_modeles").select("id, contenu_template, version").eq("est_defaut", true).eq("actif", true).maybeSingle(),
      admin
        .from("stock_mouvements")
        .select("id, article_id, lot_id, type_mouvement, quantite, article:stock_articles(nom, unite), lot:stock_lots(numero_lot)")
        .eq("commande_id", commandeId)
        .eq("commande_item_id", itemId)
        .in("type_mouvement", ["consommation", "sortie"]),
    ]);

  if (!commande || !item) {
    return NextResponse.json({ error: "Travail introuvable." }, { status: 404 });
  }
  if (!template) {
    return NextResponse.json({ error: "Aucun modèle actif n’est configuré." }, { status: 409 });
  }
  const templateErrors = validateCertificateTemplate(template.contenu_template);
  if (templateErrors.length) {
    return NextResponse.json({ error: templateErrors.join(" ") }, { status: 409 });
  }

  const { data: existing } = await admin
    .from("certificats_conformite")
    .select("id, numero_certificat")
    .eq("commande_item_id", item.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ...existing, exists: true });
  }

  const params = await getParametresLabo();
  const dentiste = firstRelation(commande.dentiste) as unknown as { id: string; nom: string; prenom: string; numero_inami: string | null; cabinet: { nom: string; adresse: string | null; code_postal: string | null; ville: string | null } | { nom: string; adresse: string | null; code_postal: string | null; ville: string | null }[] | null } | null;
  const patient = firstRelation(commande.patient) as { reference: string | null } | null;
  const cabinet = Array.isArray(dentiste?.cabinet) ? dentiste.cabinet[0] ?? null : dentiste?.cabinet ?? null;
  const dentisteAdresse = [cabinet?.nom, cabinet?.adresse, cabinet?.code_postal, cabinet?.ville].filter(Boolean).join(", ");
  const usedMaterials = (movements ?? []).map((movement) => {
    const article = firstRelation(movement.article) as { nom: string; unite: string | null } | null;
    const lot = firstRelation(movement.lot) as { numero_lot: string } | null;
    return {
      article_id: movement.article_id,
      lot_id: movement.lot_id,
      nom: article?.nom ?? "Article stock",
      numero_lot: lot?.numero_lot ?? null,
      quantite: Number(movement.quantite),
      unite: article?.unite ?? null,
    };
  });
  const description = [
    item.item_label || item.type_travail.replace(/_/g, " "),
    item.dents?.length ? `Dents : ${item.dents.join(", ")}` : null,
    item.materiau ? `Matériau prescrit : ${item.materiau.replace(/_/g, " ")}` : null,
    item.teinte ? `Teinte : ${item.teinte}` : null,
    item.description,
  ].filter(Boolean).join("\n");
  const materialsText = usedMaterials.length
    ? usedMaterials.map((material) => `${material.nom}${material.numero_lot ? ` — lot ${material.numero_lot}` : ""} (${material.quantite}${material.unite ? ` ${material.unite}` : ""})`).join("\n")
    : "Aucun mouvement de consommation/sortie enregistré pour ce travail.";
  const patientReference = patient?.reference || commande.patient_ref || "";
  const now = new Date().toISOString().slice(0, 10);
  const certificateNumber = `CERT-${now.slice(0, 4)}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const defaultLaboAdresse = [params.adresse, params.code_postal, params.ville, params.pays].filter(Boolean).join(", ");
  const fields = {
    labo_nom: String(body.labo_nom || params.nom_labo),
    labo_adresse: String(body.labo_adresse || defaultLaboAdresse),
    labo_responsable: String(body.labo_responsable || ""),
    labo_numero_agrement: String(body.labo_numero_agrement || params.numero_agrement || ""),
    labo_site_fabrication: String(body.labo_site_fabrication || ""),
    dentiste_nom: String(body.dentiste_nom || (dentiste ? `Dr ${dentiste.prenom} ${dentiste.nom}` : "")),
    dentiste_inami: String(body.dentiste_inami || dentiste?.numero_inami || ""),
    patient_reference: String(body.patient_reference || patientReference),
    description_travail: String(body.description_travail || description),
    materiaux_utilises: String(body.materiaux_utilises || [...new Set(usedMaterials.map((material) => material.nom))].join(", ")),
    dents: String(body.dents || item.dents?.join(", ") || ""),
    lot_materiaux: String(body.lot_materiaux || usedMaterials.map((material) => material.numero_lot).filter(Boolean).join(", ")),
    classe_dispositif: String(body.classe_dispositif || ""),
    code_nomenclature: String(body.code_nomenclature || ""),
    normes_appliquees: String(body.normes_appliquees || "Règlement (UE) 2017/745, annexe XIII"),
    date_emission: String(body.date_emission || now),
    signe_par: String(body.signe_par || ""),
    declaration_conformite: String(body.declaration_conformite || params.mentions_legales_certificat || "Le fabricant déclare que le dispositif est fabriqué conformément à la prescription et aux exigences applicables du règlement (UE) 2017/745."),
  };
  const exigencesNonSatisfaites = String(body.exigences_non_satisfaites || "").trim();
  const justification = String(body.justification || "").trim();
  const tagValues: Record<string, string> = {
    "labo.nom": fields.labo_nom,
    "labo.adresse": fields.labo_adresse,
    "labo.site_fabrication": fields.labo_site_fabrication,
    "dispositifs.liste": description,
    "patient.identifiant": patientReference,
    "dentiste.nom": fields.dentiste_nom,
    "dentiste.cabinet": cabinet?.nom ?? "",
    "dentiste.adresse": dentisteAdresse,
    "prescription.caracteristiques": item.description ?? "",
    "production.materiaux_lots": materialsText,
    "conformite.declaration": fields.declaration_conformite,
    "conformite.exigences_non_satisfaites": exigencesNonSatisfaites,
    "conformite.justification": justification,
    "conformite.classe_dispositif": fields.classe_dispositif,
    "conformite.code_nomenclature": fields.code_nomenclature,
    "document.date_emission": new Date(fields.date_emission).toLocaleDateString("fr-BE"),
    "document.signataire": fields.signe_par,
    "document.numero": certificateNumber,
  };
  const renderedContent = renderCertificateTemplate(template.contenu_template, tagValues);
  const snapshot = {
    commande_id: commande.id,
    commande_numero: commande.numero,
    commande_item_id: item.id,
    travail: item,
    patient: { reference: patientReference },
    dentiste: dentiste ? { id: dentiste.id, nom: fields.dentiste_nom, numero_inami: dentiste.numero_inami, cabinet: cabinet?.nom ?? null, adresse: dentisteAdresse } : null,
    materiaux_lots: usedMaterials,
    classe_dispositif: fields.classe_dispositif,
    code_nomenclature: fields.code_nomenclature,
    exigences_non_satisfaites: exigencesNonSatisfaites,
    justification,
    modele_id: template.id,
    modele_version: template.version,
    contenu: renderedContent,
    generated_at: new Date().toISOString(),
  };

  const { data: certificate, error } = await admin
    .from("certificats_conformite")
    .insert({
      numero_certificat: certificateNumber,
      commande_id: commande.id,
      commande_item_id: item.id,
      patient_id: commande.patient_id,
      dentiste_id: commande.dentiste_id,
      labo_nom: fields.labo_nom,
      labo_adresse: fields.labo_adresse || null,
      labo_responsable: fields.labo_responsable || null,
      labo_numero_agrement: fields.labo_numero_agrement || null,
      dentiste_nom: fields.dentiste_nom || null,
      dentiste_inami: fields.dentiste_inami || null,
      patient_reference: patientReference || null,
      description_travail: fields.description_travail,
      materiaux_utilises: fields.materiaux_utilises || null,
      dents: fields.dents || null,
      lot_materiaux: fields.lot_materiaux || null,
      declaration_conformite: fields.declaration_conformite || "",
      normes_appliquees: fields.normes_appliquees,
      contenu_complet: renderedContent,
      date_emission: now,
      signe_par: fields.signe_par || null,
      modele_id: template.id,
      modele_version: template.version,
      labo_site_fabrication: fields.labo_site_fabrication || null,
      classe_dispositif: ["I", "IIa", "IIb", "III"].includes(fields.classe_dispositif) ? fields.classe_dispositif : null,
      code_nomenclature: fields.code_nomenclature || null,
      donnees_snapshot: snapshot,
      statut: "brouillon",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(certificate, { status: 201 });
}
