import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FacturesList } from "./factures-list";

export default async function FacturesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: factures, error } = await supabase
    .from("factures")
    .select("id, numero, statut, date_emission, date_echeance, montant_ttc, solde_du, pdf_storage_path, email_envoye_at, commande:commandes(numero)")
    .eq("dentiste_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Mes factures</h1>
        <p className="mt-1 text-sm text-gray-500">
          Brouillons à valider, factures émises et soldes à régler.
        </p>
      </header>
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Impossible de charger les factures.
        </p>
      ) : (
        <FacturesList factures={factures ?? []} />
      )}
    </div>
  );
}