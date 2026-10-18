import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const { data: certificate, error } = await admin
    .from("certificats_conformite")
    .select("id, numero_certificat, statut, labo_nom, labo_adresse, labo_site_fabrication, description_travail, materiaux_utilises, lot_materiaux, declaration_conformite, date_emission, classe_dispositif, code_nomenclature, donnees_snapshot")
    .eq("id", id)
    .maybeSingle();
  if (error || !certificate) {
    return Response.json({ error: error?.message || "Fiche introuvable." }, { status: 404 });
  }
  if (!["emis", "envoye"].includes(certificate.statut)) {
    return Response.json({ error: "Émettez la déclaration avant de préparer l’export VAS." }, { status: 409 });
  }

  const snapshot = (certificate.donnees_snapshot || {}) as Record<string, unknown>;
  const work = (snapshot.travail || {}) as Record<string, unknown>;
  const teeth = Array.isArray(work.dents)
    ? work.dents.filter((tooth): tooth is string | number => typeof tooth === "string" || typeof tooth === "number")
    : [];
  const materials = Array.isArray(snapshot.materiaux_lots)
    ? snapshot.materiaux_lots.map((entry) => {
        const material = entry as Record<string, unknown>;
        return {
          stock_article: material.nom ?? null,
          lot_number: material.numero_lot ?? null,
          quantity: material.quantite ?? null,
          unit: material.unite ?? null,
        };
      })
    : [];
  const exportData = {
    export_type: "preparation_vas_dispositif_sur_mesure",
    note: "Export préparatoire sans identité de patient ni de prescripteur. À vérifier et soumettre manuellement via VAS; ce fichier ne vaut pas notification officielle.",
    manufacturer: {
      name: certificate.labo_nom,
      address: certificate.labo_adresse,
      manufacturing_site: certificate.labo_site_fabrication,
    },
    device: {
      declaration_number: certificate.numero_certificat,
      device_type: work.type_travail ?? null,
      tooth_positions: teeth,
      prescribed_material: work.materiau ?? null,
      shade: work.teinte ?? null,
      device_class: certificate.classe_dispositif,
      nomenclature_code: certificate.code_nomenclature,
      materials_and_lots: materials,
      issued_at: certificate.date_emission,
    },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(exportData, null, 2));
  const path = `vas/${certificate.id}.json`;
  const { error: uploadError } = await admin.storage.from("certificats").upload(path, bytes, {
    contentType: "application/json; charset=utf-8",
    upsert: true,
    cacheControl: "31536000",
  });
  if (uploadError) {
    return Response.json({ error: `Export préparé, mais archivage impossible : ${uploadError.message}` }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("certificats_conformite")
    .update({ vas_export_storage_path: path })
    .eq("id", certificate.id);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="VAS-${certificate.numero_certificat}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
