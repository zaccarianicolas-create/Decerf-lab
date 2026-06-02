import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { AdminPatientDetail } from "./patient-detail";

export default async function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: patient } = await admin
    .from("patients")
    .select(
      "*, dentiste:profiles!dentiste_id(id, nom, prenom, email, sans_compte, cabinet:cabinets(nom))"
    )
    .eq("id", id)
    .single();
  if (!patient) notFound();

  const { data: commandes } = await admin
    .from("commandes")
    .select(
      "*, items:commande_items(*), certificats:certificats_conformite(*), dentiste:profiles!dentiste_id(id, nom, prenom, sans_compte)"
    )
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  const commandeIds = (commandes ?? []).map((c: any) => c.id);

  const [{ data: factures }, { data: notes }, { data: dentistes }] =
    await Promise.all([
      commandeIds.length > 0
        ? admin
            .from("factures")
            .select(
              "id, numero, montant_ttc, statut, date_emission, created_at, commande_id"
            )
            .in("commande_id", commandeIds)
        : Promise.resolve({ data: [] as any[] }),
      admin
        .from("patient_notes_cliniques")
        .select("*")
        .eq("patient_id", id)
        .order("date_note", { ascending: false }),
      admin
        .from("profiles")
        .select("id, nom, prenom, sans_compte")
        .eq("role", "dentiste")
        .eq("actif", true)
        .order("nom"),
    ]);

  return (
    <AdminPatientDetail
      patient={patient as any}
      commandes={(commandes ?? []) as any}
      factures={(factures ?? []) as any}
      notes={(notes ?? []) as any}
      dentistes={(dentistes ?? []) as any}
    />
  );
}
