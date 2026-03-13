import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { commande_id } = body;

  if (!commande_id) {
    return NextResponse.json(
      { error: "commande_id requis" },
      { status: 400 }
    );
  }

  // Charger la commande complète avec toutes les relations
  const { data: commande, error: cmdError } = await admin
    .from("commandes")
    .select(
      `
      *,
      patient:patients(*),
      dentiste:profiles!commandes_dentiste_id_fkey(nom, prenom, email, numero_inami),
      items:commande_items(*)
    `
    )
    .eq("id", commande_id)
    .single();

  if (cmdError || !commande) {
    return NextResponse.json(
      { error: "Commande introuvable" },
      { status: 404 }
    );
  }

  // Construire la description du travail
  const items = (commande.items || []) as any[];
  const descriptionParts = items.map((item: any) => {
    const parts = [item.type_travail?.replace(/_/g, " ")];
    if (item.dents && item.dents.length > 0) {
      parts.push(`dents: ${item.dents.join(", ")}`);
    }
    if (item.materiau) parts.push(item.materiau.replace(/_/g, " "));
    if (item.teinte) parts.push(`teinte ${item.teinte}`);
    return parts.join(" — ");
  });

  const materiauxList = items
    .map((item: any) => item.materiau?.replace(/_/g, " "))
    .filter(Boolean)
    .join(", ");

  const dentsList = items
    .flatMap((item: any) => item.dents || [])
    .join(", ");

  const dentiste = commande.dentiste as any;
  const patient = commande.patient as any;

  // Vérifier s'il existe déjà un certificat pour cette commande
  const { data: existing } = await admin
    .from("certificats_conformite")
    .select("id")
    .eq("commande_id", commande_id)
    .single();

  if (existing) {
    return NextResponse.json({ id: existing.id, exists: true });
  }

  // Créer le certificat
  const { data: certificat, error: certError } = await admin
    .from("certificats_conformite")
    .insert({
      commande_id,
      patient_id: commande.patient_id || null,
      labo_nom: "DECERF LAB",
      labo_adresse: body.labo_adresse || null,
      labo_responsable: body.labo_responsable || null,
      labo_numero_agrement: body.labo_numero_agrement || null,
      dentiste_id: commande.dentiste_id,
      dentiste_nom: dentiste
        ? `Dr ${dentiste.prenom} ${dentiste.nom}`
        : null,
      dentiste_inami: dentiste?.numero_inami || null,
      patient_reference: patient?.reference || commande.patient_ref || null,
      description_travail: descriptionParts.join("\n") || "À compléter",
      materiaux_utilises: materiauxList || null,
      dents: dentsList || null,
      signe_par: body.signe_par || null,
    })
    .select()
    .single();

  if (certError) {
    return NextResponse.json({ error: certError.message }, { status: 500 });
  }

  return NextResponse.json(certificat);
}
