import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createFactureDraft } from "@/lib/facture-workflow";
import { emailTemplates, sendEmail } from "@/lib/email";

const STATUTS_AUTORISES = [
  "en_attente",
  "acceptee",
  "en_cours",
  "controle_qualite",
  "terminee",
  "expediee",
  "livree",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const statut = body?.statut;
  if (typeof statut !== "string" || !STATUTS_AUTORISES.includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data: commande, error: commandeError } = await admin
    .from("commandes")
    .select("id, statut")
    .eq("id", id)
    .maybeSingle();
  if (commandeError || !commande) {
    return NextResponse.json({ error: commandeError?.message || "Commande introuvable" }, { status: 404 });
  }

  let factureId: string | undefined;
  if (statut === "terminee") {
    const result = await createFactureDraft(admin, id, user.id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    factureId = result.factureId;
  }

  const { error: updateError } = await admin
    .from("commandes")
    .update({ statut })
    .eq("id", id);
  if (updateError) {
    if (factureId && commande.statut !== "terminee") {
      await admin.from("factures").delete().eq("id", factureId).eq("statut", "brouillon");
    }
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (statut === "terminee" && factureId && commande.statut !== "terminee") {
    const [{ data: facture }, { data: dentist }] = await Promise.all([
      admin.from("factures").select("id, statut").eq("id", factureId).maybeSingle(),
      admin.from("commandes").select("numero, dentiste:profiles!commandes_dentiste_id_fkey(id, email, prenom)").eq("id", id).single(),
    ]);
    const dentistProfile = Array.isArray(dentist?.dentiste) ? dentist.dentiste[0] : dentist?.dentiste;
    if (facture?.statut === "brouillon" && dentistProfile?.email) {
      const template = emailTemplates.facture_a_valider({
        prenom: dentistProfile.prenom ?? undefined,
        commande: dentist?.numero ?? "",
        url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.decerf-lab.be"}/dashboard/factures/${facture.id}`,
      });
      await sendEmail({
        to: dentistProfile.email,
        toUserId: dentistProfile.id,
        template: "facture_a_valider",
        subject: template.subject,
        html: template.html,
        prefKey: "email_facture",
        payload: { facture_id: facture.id },
      });
    }
  }

  return NextResponse.json({ success: true, facture_id: factureId ?? null });
}