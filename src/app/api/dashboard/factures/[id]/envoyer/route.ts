import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { emailTemplates, sendEmail } from "@/lib/email";
import type { FactureBillingSnapshot } from "@/lib/facture-workflow";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: facture, error } = await admin
    .from("factures")
    .select("id, numero, statut, dentiste_id, montant_ttc, billing_snapshot, pdf_storage_path")
    .eq("id", id)
    .eq("dentiste_id", user.id)
    .maybeSingle();
  if (error || !facture) {
    return NextResponse.json({ error: error?.message || "Facture introuvable." }, { status: 404 });
  }
  if (facture.statut === "brouillon" || !facture.pdf_storage_path) {
    return NextResponse.json({ error: "La facture PDF n’est pas encore disponible." }, { status: 409 });
  }

  const { data: pdf, error: downloadError } = await admin.storage
    .from("factures")
    .download(facture.pdf_storage_path);
  if (downloadError || !pdf) {
    return NextResponse.json({ error: downloadError?.message || "PDF introuvable." }, { status: 500 });
  }

  const snapshot = facture.billing_snapshot as unknown as FactureBillingSnapshot;
  if (!snapshot.client.email) {
    return NextResponse.json({ error: "Aucune adresse e-mail disponible pour cette facture." }, { status: 409 });
  }
  const template = emailTemplates.facture_emise({
    prenom: snapshot.client.prenom,
    numero: facture.numero,
    montant: Number(facture.montant_ttc),
  });
  const result = await sendEmail({
    to: snapshot.client.email,
    toUserId: user.id,
    template: "facture_emise",
    subject: template.subject,
    html: template.html,
    prefKey: "email_facture",
    payload: { facture_id: facture.id, resend: true },
    attachments: [{
      filename: `${facture.numero}.pdf`,
      content: Buffer.from(await pdf.arrayBuffer()).toString("base64"),
    }],
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "L’e-mail n’a pas pu être envoyé." }, { status: 502 });
  }

  await admin.from("factures").update({ email_envoye_at: new Date().toISOString() }).eq("id", facture.id);
  return NextResponse.json({ success: true });
}