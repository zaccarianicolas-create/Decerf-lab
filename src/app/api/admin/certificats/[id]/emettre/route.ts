import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createCertificatPdf } from "@/lib/certificat-pdf";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const { data: certificate, error } = await admin
    .from("certificats_conformite")
    .select("id, numero_certificat, statut, contenu_complet, pdf_storage_path, commande_id, dentiste_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !certificate) {
    return NextResponse.json({ error: error?.message || "Fiche introuvable." }, { status: 404 });
  }
  if (certificate.statut === "emis" || certificate.statut === "envoye") {
    if (certificate.pdf_storage_path) return NextResponse.json({ success: true, already_emitted: true });
  } else if (certificate.statut !== "valide") {
    return NextResponse.json({ error: "La fiche doit être validée avant son émission." }, { status: 409 });
  }
  if (!certificate.contenu_complet?.trim()) {
    return NextResponse.json({ error: "Le contenu de la déclaration est vide." }, { status: 409 });
  }

  const bytes = await createCertificatPdf(certificate.contenu_complet, certificate.numero_certificat);
  const path = `${certificate.dentiste_id}/${certificate.commande_id}/${certificate.id}.pdf`;
  const { error: uploadError } = await admin.storage.from("certificats").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
    cacheControl: "31536000",
  });
  if (uploadError) {
    return NextResponse.json({ error: `Fiche validée, mais archivage PDF impossible : ${uploadError.message}` }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("certificats_conformite")
    .update({
      statut: "emis",
      emis_par: user.id,
      pdf_storage_bucket: "certificats",
      pdf_storage_path: path,
    })
    .eq("id", certificate.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await admin.from("commande_workflow_events").insert({
    commande_id: certificate.commande_id,
    type: "information",
    titre: "Déclaration de conformité émise",
    description: certificate.numero_certificat,
    visible_praticien: false,
    created_by: user.id,
    metadata: { source: "certificat", certificat_id: certificate.id },
  });

  return NextResponse.json({ success: true, path });
}
