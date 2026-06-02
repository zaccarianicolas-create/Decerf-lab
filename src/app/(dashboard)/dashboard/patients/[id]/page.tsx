import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PatientDetail } from "./patient-detail";

export default async function DashboardPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("dentiste_id", user.id)
    .single();

  if (!patient) notFound();

  const { data: commandes } = await supabase
    .from("commandes")
    .select(
      "*, items:commande_items(*), certificats:certificats_conformite(*)"
    )
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  const commandeIds = (commandes ?? []).map((c: any) => c.id);

  const [{ data: factures }, { data: notes }] = await Promise.all([
    commandeIds.length > 0
      ? supabase
          .from("factures")
          .select("id, numero, montant_ttc, statut, date_emission, created_at")
          .in("commande_id", commandeIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from("patient_notes_cliniques")
      .select("*")
      .eq("patient_id", id)
      .order("date_note", { ascending: false }),
  ]);

  return (
    <PatientDetail
      patient={patient}
      commandes={commandes ?? []}
      factures={factures ?? []}
      notes={(notes ?? []) as any}
    />
  );
}
