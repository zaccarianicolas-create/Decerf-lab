import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logAudit, extractRequestMeta } from "@/lib/audit";

async function requireAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }
  return { admin, userId: user.id };
}

/**
 * Crée une commande au nom d'un dentiste (avec OU sans compte).
 * Body: {
 *   dentiste_id: string,
 *   patient_id?: string,
 *   patient_ref?: string,
 *   priorite?: "normale" | "urgente" | "express",
 *   date_livraison?: string (ISO),
 *   notes?: string,
 *   items: Array<{ type_travail, description, quantite, prix_unitaire, dents?, materiau?, teinte?, mode_fabrication? }>
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;

  const body = await request.json();
  const {
    dentiste_id,
    patient_id,
    patient_ref,
    priorite = "normale",
    date_livraison,
    notes,
    items = [],
  } = body as {
    dentiste_id?: string;
    patient_id?: string;
    patient_ref?: string;
    priorite?: "normale" | "urgente" | "express";
    date_livraison?: string;
    notes?: string;
    items?: Array<Record<string, any>>;
  };

  if (!dentiste_id) {
    return NextResponse.json({ error: "dentiste_id requis" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Au moins une ligne requise" }, { status: 400 });
  }

  const { data: dentiste } = await admin
    .from("profiles")
    .select("id, cabinet_id, role")
    .eq("id", dentiste_id)
    .maybeSingle();
  if (!dentiste) {
    return NextResponse.json({ error: "Dentiste introuvable" }, { status: 404 });
  }

  const montantTotal = items.reduce(
    (s, it) =>
      s + Number(it.quantite || 1) * Number(it.prix_unitaire || 0),
    0
  );

  const { data: cmd, error } = await admin
    .from("commandes")
    .insert({
      dentiste_id,
      cabinet_id: dentiste.cabinet_id,
      patient_id: patient_id || null,
      patient_ref: patient_ref || null,
      priorite,
      date_livraison: date_livraison || null,
      notes: notes || null,
      statut: "acceptee",
      montant_total: montantTotal,
      created_by: userId,
    })
    .select("id, numero")
    .single();

  if (error || !cmd) {
    return NextResponse.json(
      { error: error?.message || "Erreur création commande" },
      { status: 400 }
    );
  }

  const itemsPayload = items.map((it) => ({
    commande_id: cmd.id,
    type_travail: it.type_travail || "autre",
    description: it.description || null,
    item_label: it.item_label || null,
    quantite: Number(it.quantite || 1),
    prix_unitaire: Number(it.prix_unitaire || 0),
    dents: it.dents || null,
    materiau: it.materiau || null,
    teinte: it.teinte || null,
    mode_fabrication: it.mode_fabrication || null,
    infos_travail: it.infos_travail || null,
  }));

  const { error: itemsError } = await admin
    .from("commande_items")
    .insert(itemsPayload);
  if (itemsError) {
    await admin.from("commandes").delete().eq("id", cmd.id);
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action: "commande.create.by_admin",
    entity_type: "commande",
    entity_id: cmd.id,
    metadata: { dentiste_id, numero: cmd.numero, montant: montantTotal },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({
    success: true,
    commande: { id: cmd.id, numero: cmd.numero },
  });
}
