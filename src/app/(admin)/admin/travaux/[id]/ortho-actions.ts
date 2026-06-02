"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type OrthoTraitement =
  | "aligneurs"
  | "contention"
  | "appareil_amovible"
  | "gouttiere"
  | "autre";

type OrthoEtapeStatut = "prevu" | "en_cours" | "termine" | "saute";

async function requireAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifie" as const };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Non autorise" as const };
  }

  return { admin, userId: user.id };
}

export async function upsertOrtho(input: {
  commande_id: string;
  commande_item_id?: string | null;
  type_traitement: OrthoTraitement;
  plan_traitement?: string | null;
  nb_aligneurs?: number;
  etape_courante?: number;
  date_debut?: string | null;
  date_fin_prevue?: string | null;
  date_fin_reelle?: string | null;
  notes?: string | null;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const { admin, userId } = auth;

  const payload = {
    commande_id: input.commande_id,
    commande_item_id: input.commande_item_id ?? null,
    type_traitement: input.type_traitement,
    plan_traitement: input.plan_traitement ?? null,
    nb_aligneurs: Math.max(0, Math.min(200, Number(input.nb_aligneurs || 0))),
    etape_courante: Math.max(0, Number(input.etape_courante || 0)),
    date_debut: input.date_debut || null,
    date_fin_prevue: input.date_fin_prevue || null,
    date_fin_reelle: input.date_fin_reelle || null,
    notes: input.notes ?? null,
    created_by: userId,
  };

  const { data, error } = await admin
    .from("commande_ortho")
    .upsert(payload, { onConflict: "commande_id" })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message || "Erreur upsert ortho" };
  }

  revalidatePath(`/admin/travaux/${input.commande_id}`);
  return { id: data.id };
}

export async function addOrthoEtape(input: {
  ortho_id: string;
  commande_id: string;
  numero: number;
  label?: string | null;
  date_prevue?: string | null;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const { admin } = auth;

  const { error } = await admin.from("commande_ortho_etapes").insert({
    ortho_id: input.ortho_id,
    numero: Number(input.numero || 1),
    label: input.label ?? null,
    date_prevue: input.date_prevue || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/travaux/${input.commande_id}`);
  return { ok: true };
}

export async function updateOrthoEtape(input: {
  etape_id: string;
  commande_id: string;
  label?: string | null;
  date_prevue?: string | null;
  date_realisee?: string | null;
  statut?: OrthoEtapeStatut;
  notes?: string | null;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const { admin } = auth;

  const update: Record<string, unknown> = {};
  if (input.label !== undefined) update.label = input.label;
  if (input.date_prevue !== undefined) update.date_prevue = input.date_prevue || null;
  if (input.date_realisee !== undefined)
    update.date_realisee = input.date_realisee || null;
  if (input.statut !== undefined) update.statut = input.statut;
  if (input.notes !== undefined) update.notes = input.notes;

  const { error } = await admin
    .from("commande_ortho_etapes")
    .update(update)
    .eq("id", input.etape_id);

  if (error) return { error: error.message };

  revalidatePath(`/admin/travaux/${input.commande_id}`);
  return { ok: true };
}

export async function deleteOrthoEtape(input: { etape_id: string; commande_id: string }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const { admin } = auth;
  const { error } = await admin
    .from("commande_ortho_etapes")
    .delete()
    .eq("id", input.etape_id);

  if (error) return { error: error.message };
  revalidatePath(`/admin/travaux/${input.commande_id}`);
  return { ok: true };
}
