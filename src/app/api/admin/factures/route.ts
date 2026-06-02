import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Non authentifie" }, { status: 401 }),
    };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Non autorise" }, { status: 403 }),
    };
  }

  return { admin, userId: user.id };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { admin, userId } = auth;
  const body = await request.json();
  const commandeId = body?.commande_id as string | undefined;

  if (!commandeId) {
    return NextResponse.json({ error: "commande_id requis" }, { status: 400 });
  }

  const { data: existingFacture } = await admin
    .from("factures")
    .select("id, numero")
    .eq("commande_id", commandeId)
    .maybeSingle();

  if (existingFacture) {
    return NextResponse.json(
      {
        success: true,
        already_exists: true,
        facture: existingFacture,
      },
      { status: 200 }
    );
  }

  const { data: commande, error: commandeError } = await admin
    .from("commandes")
    .select(
      `
      id,
      numero,
      dentiste_id,
      cabinet_id,
      montant_total,
      date_livraison,
      patient_ref,
      items:commande_items(
        id,
        type_travail,
        description,
        quantite,
        prix_unitaire
      )
    `
    )
    .eq("id", commandeId)
    .single();

  if (commandeError || !commande) {
    return NextResponse.json(
      { error: commandeError?.message || "Commande introuvable" },
      { status: 404 }
    );
  }

  const items = (commande.items as any[]) || [];
  if (items.length === 0) {
    return NextResponse.json(
      { error: "Impossible de facturer une commande sans ligne" },
      { status: 400 }
    );
  }

  const factureLignes = items.map((item) => {
    const quantite = Number(item.quantite || 1);
    const prixUnitaire = Number(item.prix_unitaire || 0);
    const totalHt = Number((quantite * prixUnitaire).toFixed(2));
    const totalTva = Number((totalHt * 0.21).toFixed(2));
    const totalTtc = Number((totalHt + totalTva).toFixed(2));

    return {
      commande_item_id: item.id,
      description:
        item.description?.trim() ||
        `Travail ${String(item.type_travail || "prothétique").replace("_", " ")}`,
      quantite,
      prix_unitaire: prixUnitaire,
      taux_tva: 21,
      total_ligne_ht: totalHt,
      total_ligne_tva: totalTva,
      total_ligne_ttc: totalTtc,
    };
  });

  const montantHt = Number(
    factureLignes.reduce((sum, line) => sum + Number(line.total_ligne_ht), 0).toFixed(2)
  );
  const montantTva = Number(
    factureLignes.reduce((sum, line) => sum + Number(line.total_ligne_tva), 0).toFixed(2)
  );
  const montantTtc = Number((montantHt + montantTva).toFixed(2));
  const dateEmission = new Date().toISOString().split("T")[0];
  const dateEcheance = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: createdFacture, error: factureError } = await admin
    .from("factures")
    .insert({
      dentiste_id: commande.dentiste_id,
      cabinet_id: commande.cabinet_id,
      commande_id: commande.id,
      statut: "emise",
      date_emission: dateEmission,
      date_echeance: dateEcheance,
      montant_ht: montantHt,
      montant_tva: montantTva,
      montant_ttc: montantTtc,
      solde_du: montantTtc,
      devise: "eur",
      notes: commande.patient_ref
        ? `Commande ${commande.numero} - Patient ${commande.patient_ref}`
        : `Commande ${commande.numero}`,
      created_by: userId,
    })
    .select("id, numero")
    .single();

  if (factureError || !createdFacture) {
    return NextResponse.json(
      { error: factureError?.message || "Erreur creation facture" },
      { status: 400 }
    );
  }

  const lignesPayload = factureLignes.map((line) => ({
    facture_id: createdFacture.id,
    ...line,
  }));

  const { error: lignesError } = await admin
    .from("facture_lignes")
    .insert(lignesPayload);

  if (lignesError) {
    await admin.from("factures").delete().eq("id", createdFacture.id);
    return NextResponse.json({ error: lignesError.message }, { status: 400 });
  }

  await admin.from("ecritures_compte_client").insert({
    dentiste_id: commande.dentiste_id,
    cabinet_id: commande.cabinet_id,
    facture_id: createdFacture.id,
    type_ecriture: "facture",
    libelle: `Facture ${createdFacture.numero}`,
    montant: montantTtc,
    created_by: userId,
  });

  let totalImputeAvoir = 0;
  let soldeDu = montantTtc;

  const { data: avoirsDisponibles } = await admin
    .from("avoirs")
    .select("id, numero, statut, solde_restant")
    .eq("dentiste_id", commande.dentiste_id)
    .gt("solde_restant", 0)
    .in("statut", ["valide", "impute"])
    .order("date_emission", { ascending: true })
    .limit(100);

  for (const avoir of avoirsDisponibles || []) {
    if (soldeDu <= 0) break;

    const soldeAvoir = Number(avoir.solde_restant || 0);
    if (soldeAvoir <= 0) continue;

    const imputation = Number(Math.min(soldeAvoir, soldeDu).toFixed(2));
    const nouveauSoldeAvoir = Number((soldeAvoir - imputation).toFixed(2));
    const nouveauStatutAvoir = nouveauSoldeAvoir <= 0 ? "impute" : "valide";

    const { error: updateAvoirError } = await admin
      .from("avoirs")
      .update({
        solde_restant: nouveauSoldeAvoir,
        statut: nouveauStatutAvoir,
      })
      .eq("id", avoir.id);

    if (updateAvoirError) continue;

    await admin.from("ecritures_compte_client").insert({
      dentiste_id: commande.dentiste_id,
      cabinet_id: commande.cabinet_id,
      facture_id: createdFacture.id,
      avoir_id: avoir.id,
      type_ecriture: "imputation_avoir",
      libelle: `Imputation ${avoir.numero} sur ${createdFacture.numero}`,
      montant: -imputation,
      created_by: userId,
    });

    totalImputeAvoir = Number((totalImputeAvoir + imputation).toFixed(2));
    soldeDu = Number((soldeDu - imputation).toFixed(2));
  }

  const statutFacture =
    soldeDu <= 0 ? "payee" : totalImputeAvoir > 0 ? "partiellement_payee" : "emise";

  await admin
    .from("factures")
    .update({
      solde_du: soldeDu,
      statut: statutFacture,
    })
    .eq("id", createdFacture.id);

  if (soldeDu <= 0) {
    await admin
      .from("commandes")
      .update({ statut_paiement: "paye" })
      .eq("id", commande.id);
  }

  return NextResponse.json({
    success: true,
    facture: {
      id: createdFacture.id,
      numero: createdFacture.numero,
      montant_ttc: montantTtc,
      montant_impute_avoirs: totalImputeAvoir,
      solde_du: soldeDu,
      statut: statutFacture,
    },
  });
}
