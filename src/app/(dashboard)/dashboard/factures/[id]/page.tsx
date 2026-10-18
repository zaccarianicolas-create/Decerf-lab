import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FactureValidation } from "./facture-validation";
import type { FactureBillingSnapshot } from "@/lib/facture-workflow";

export default async function FactureBrouillonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { data: facture } = await supabase
    .from("factures")
    .select("id, numero, statut, billing_snapshot")
    .eq("id", id)
    .eq("dentiste_id", user.id)
    .maybeSingle();
  if (!facture) notFound();
  if (facture.statut !== "brouillon") redirect("/dashboard/finance");

  return (
    <FactureValidation
      factureId={facture.id}
      numero={facture.numero}
      snapshot={facture.billing_snapshot as unknown as FactureBillingSnapshot}
    />
  );
}