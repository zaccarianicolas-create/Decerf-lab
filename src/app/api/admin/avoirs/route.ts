import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBillitAdmin } from "@/lib/billit-admin";

export async function POST(request: Request) {
  const auth = await requireBillitAdmin();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null) as { facture_id?: unknown; motif?: unknown } | null;
  const factureId = typeof body?.facture_id === "string" ? body.facture_id : "";
  const motif = typeof body?.motif === "string" ? body.motif.trim().slice(0, 500) : "";
  if (!factureId || !motif) {
    return NextResponse.json({ error: "Facture et motif sont requis." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: facture, error: factureError } = await admin
    .from("factures")
    .select("id, numero, statut, dentiste_id, cabinet_id, montant_ttc")
    .eq("id", factureId)
    .maybeSingle();
  if (factureError || !facture) {
    return NextResponse.json({ error: factureError?.message || "Facture introuvable." }, { status: 404 });
  }
  if (["brouillon", "annulee"].includes(facture.statut)) {
    return NextResponse.json({ error: "Un avoir ne peut être préparé que pour une facture émise." }, { status: 409 });
  }

  const amount = Number(facture.montant_ttc);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Le montant de la facture ne permet pas de créer un avoir." }, { status: 409 });
  }

  const { data: existingCredits, error: creditsError } = await admin
    .from("avoirs")
    .select("montant, statut")
    .eq("facture_id", facture.id)
    .neq("statut", "annule");
  if (creditsError) return NextResponse.json({ error: creditsError.message }, { status: 500 });
  const existingAmount = (existingCredits ?? []).reduce((total, credit) => total + Number(credit.montant || 0), 0);
  if (existingAmount > 0) {
    return NextResponse.json({ error: "Un avoir existe déjà pour cette facture. Les avoirs partiels ne sont pas encore pris en charge." }, { status: 409 });
  }

  const { data: avoir, error } = await admin
    .from("avoirs")
    .insert({
      numero: "",
      dentiste_id: facture.dentiste_id,
      cabinet_id: facture.cabinet_id,
      facture_id: facture.id,
      statut: "brouillon",
      motif,
      montant: amount,
      solde_restant: 0,
      created_by: auth.userId,
    })
    .select("id, numero, statut, montant, facture_id")
    .single();
  if (error || !avoir) {
    return NextResponse.json({ error: error?.message || "Impossible de créer le brouillon d’avoir." }, { status: 500 });
  }

  return NextResponse.json({ success: true, avoir, facture_numero: facture.numero });
}