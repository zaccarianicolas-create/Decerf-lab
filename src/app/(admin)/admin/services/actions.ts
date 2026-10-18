"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin" ? createAdminClient() : null;
}

export async function toggleServiceActif(id: string, actif: boolean) {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Non autorisé" };
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
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Non autorisé" };
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
    prix_base_ht: number | null;
    duree_estimee_jours: number | null;
    instructions: string | null;
    options: {
      id?: string;
      nom: string;
      prix_ht: number;
      actif: boolean;
      ordre: number;
    }[];
  },
  currentMaxOrdre: number
) {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Non autorisé", data: null };

  const { options, prix_base_ht, ...servicePayload } = payload;
  let serviceId = editingId;
  let serviceData: Record<string, unknown>;

  if (editingId) {
    const { error } = await admin
      .from("services_labo")
      .update(servicePayload)
      .eq("id", editingId);

    if (error) {
      return { success: false, error: error.message, data: null };
    }
    serviceData = { id: editingId, ...servicePayload };
  } else {
    const { data, error } = await admin
      .from("services_labo")
      .insert({ ...servicePayload, ordre: currentMaxOrdre + 1 })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, data: null };
    }
    serviceId = data.id;
    serviceData = data;
  }

  const tariffResult = prix_base_ht === null
    ? await admin.from("service_tarifs").delete().eq("service_id", serviceId)
    : await admin.from("service_tarifs").upsert(
        { service_id: serviceId, prix_base_ht },
        { onConflict: "service_id" }
      );
  if (tariffResult.error) {
    return { success: false, error: tariffResult.error.message, data: null };
  }

  const { data: existingOptions, error: optionsReadError } = await admin
    .from("service_options")
    .select("id")
    .eq("service_id", serviceId);
  if (optionsReadError) {
    return { success: false, error: optionsReadError.message, data: null };
  }

  const existingIds = new Set((existingOptions ?? []).map((option) => option.id));
  if (options.some((option) => option.id && !existingIds.has(option.id))) {
    return { success: false, error: "Option de service invalide", data: null };
  }

  const optionResults = await Promise.all(
    options.map(({ id, ...option }) =>
      id
        ? admin
            .from("service_options")
            .update(option)
            .eq("id", id)
            .eq("service_id", serviceId)
        : admin
            .from("service_options")
            .insert({ ...option, service_id: serviceId })
    )
  );
  const failedOption = optionResults.find((result) => result.error);
  if (failedOption?.error) {
    return { success: false, error: failedOption.error.message, data: null };
  }

  const submittedIds = options.flatMap((option) => option.id ? [option.id] : []);
  const omittedIds = [...existingIds].filter((id) => !submittedIds.includes(id));
  if (omittedIds.length) {
    const { error } = await admin
      .from("service_options")
      .update({ actif: false })
      .in("id", omittedIds);
    if (error) return { success: false, error: error.message, data: null };
  }

  const { data: savedOptions, error: savedOptionsError } = await admin
    .from("service_options")
    .select("id, nom, prix_ht, actif, ordre")
    .eq("service_id", serviceId)
    .order("ordre");
  if (savedOptionsError) {
    return { success: false, error: savedOptionsError.message, data: null };
  }

  revalidatePath("/admin/services");
  revalidatePath("/dashboard/tarifs");
  return {
    success: true,
    data: {
      ...serviceData,
      prix_base_ht,
      options: savedOptions ?? [],
    },
  };
}

export async function reorderServices(
  orderedIds: { id: string; ordre: number }[]
) {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Non autorisé" };

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
