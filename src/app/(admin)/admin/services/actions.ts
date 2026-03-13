"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function toggleServiceActif(id: string, actif: boolean) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("services_labo")
    .update({ actif: !actif })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/services");
  return { success: true };
}

export async function deleteService(id: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("services_labo")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/services");
  return { success: true };
}

export async function saveService(
  editingId: string | null,
  payload: {
    nom: string;
    description: string | null;
    categorie: string;
    type_travail: string | null;
    materiaux_disponibles: string[];
    mode_fourniture: string;
    prix_indicatif: number | null;
    duree_estimee_jours: number | null;
    instructions: string | null;
  },
  currentMaxOrdre: number
) {
  const admin = createAdminClient();

  if (editingId) {
    const { error } = await admin
      .from("services_labo")
      .update(payload)
      .eq("id", editingId);

    if (error) {
      return { success: false, error: error.message, data: null };
    }

    revalidatePath("/admin/services");
    return { success: true, data: { id: editingId, ...payload } };
  } else {
    const { data, error } = await admin
      .from("services_labo")
      .insert({ ...payload, ordre: currentMaxOrdre + 1 })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, data: null };
    }

    revalidatePath("/admin/services");
    return { success: true, data };
  }
}

export async function reorderServices(
  orderedIds: { id: string; ordre: number }[]
) {
  const admin = createAdminClient();

  // Update each service's order
  const results = await Promise.all(
    orderedIds.map(({ id, ordre }) =>
      admin.from("services_labo").update({ ordre }).eq("id", id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { success: false, error: failed.error.message };
  }

  revalidatePath("/admin/services");
  return { success: true };
}
