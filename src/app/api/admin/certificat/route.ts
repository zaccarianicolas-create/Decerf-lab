import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logAudit, extractRequestMeta } from "@/lib/audit";
import { sendEmail, emailTemplates } from "@/lib/email";
import { getParametresLabo } from "@/lib/parametres-labo";

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

  const normalize = (value: string | null | undefined) =>
    value?.replace(/_/g, " ") || "";

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
      items:commande_items(*),
      fichiers:fichiers(nom_original, file_kind, metadata)
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
    const parts = [normalize(item.item_label) || normalize(item.type_travail)];
    if (item.dents && item.dents.length > 0) {
      parts.push(`dents: ${item.dents.join(", ")}`);
    }
    if (item.materiau) parts.push(normalize(item.materiau));
    if (item.teinte) parts.push(`teinte ${item.teinte}`);
    if (item.mode_fabrication) {
      parts.push(`mode: ${normalize(item.mode_fabrication)}`);
    }
    return parts.join(" — ");
  });

  const materiauxSet = new Set<string>();
  const lotsSet = new Set<string>();

  items.forEach((item: any) => {
    if (item.materiau) materiauxSet.add(normalize(item.materiau));

    const infosTravail = item.infos_travail || {};
    const lotInfo =
      infosTravail.lot_materiaux ||
      infosTravail.lot ||
      infosTravail.batch;
    if (typeof lotInfo === "string" && lotInfo.trim()) {
      lotsSet.add(lotInfo.trim());
    }
  });

  const fichiers = (commande.fichiers || []) as any[];
  fichiers.forEach((file) => {
    const metadata = file.metadata || {};
    const lotFromMeta = metadata.lot_materiaux || metadata.lot || metadata.batch;
    if (typeof lotFromMeta === "string" && lotFromMeta.trim()) {
      lotsSet.add(lotFromMeta.trim());
    }
  });

  const materiauxList = Array.from(materiauxSet).join(", ");
  const lotsMateriaux = Array.from(lotsSet).join(", ");

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
  const params = await getParametresLabo();
  const { data: certificat, error: certError } = await admin
    .from("certificats_conformite")
    .insert({
      commande_id,
      patient_id: commande.patient_id || null,
      labo_nom: params.nom_labo,
      labo_adresse:
        body.labo_adresse ||
        [params.adresse, params.code_postal, params.ville, params.pays]
          .filter(Boolean)
          .join(", ") ||
        null,
      labo_responsable: body.labo_responsable || null,
      labo_numero_agrement: body.labo_numero_agrement || params.numero_agrement || null,
      dentiste_id: commande.dentiste_id,
      dentiste_nom: dentiste
        ? `Dr ${dentiste.prenom} ${dentiste.nom}`
        : null,
      dentiste_inami: dentiste?.numero_inami || null,
      patient_reference: patient?.reference || commande.patient_ref || null,
      description_travail: descriptionParts.join("\n") || "À compléter",
      materiaux_utilises: materiauxList || null,
      dents: dentsList || null,
      lot_materiaux: body.lot_materiaux || lotsMateriaux || null,
      signe_par: body.signe_par || null,
      statut: "brouillon",
    })
    .select()
    .single();

  if (certError) {
    return NextResponse.json({ error: certError.message }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: user.id,
    actor_role: "admin",
    action: "certificat.create",
    entity_type: "certificat",
    entity_id: certificat?.id ?? null,
    metadata: { commande_id, numero: certificat?.numero_certificat ?? null },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  if (dentiste?.email && certificat) {
    const tpl = emailTemplates.certificat_emis({
      prenom: dentiste.prenom ?? undefined,
      numero: certificat.numero_certificat ?? "",
    });
    await sendEmail({
      to: dentiste.email,
      toUserId: commande.dentiste_id,
      template: "certificat_emis",
      subject: tpl.subject,
      html: tpl.html,
      prefKey: "email_certificat",
      payload: { certificat_id: certificat.id },
    });
  }

  return NextResponse.json(certificat);
}
