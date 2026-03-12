import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { PaiementsTable } from "./paiements-table";

export default async function AdminPaiementsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Charger tous les paiements avec la commande et le dentiste correspondants
  const { data: paiements } = await admin
    .from("paiements")
    .select(
      `
      *,
      commande:commandes(
        numero,
        patient_ref,
        dentiste:profiles!commandes_dentiste_id_fkey(nom, prenom, email)
      )
    `
    )
    .order("created_at", { ascending: false });

  // Calculs stats
  const totalPaye =
    paiements
      ?.filter((p: any) => p.statut === "paye")
      .reduce((acc: number, p: any) => acc + Number(p.montant), 0) ?? 0;
  const totalEnAttente =
    paiements
      ?.filter((p: any) => p.statut === "en_attente")
      .reduce((acc: number, p: any) => acc + Number(p.montant), 0) ?? 0;
  const totalRembourse =
    paiements
      ?.filter((p: any) => p.statut === "rembourse")
      .reduce((acc: number, p: any) => acc + Number(p.montant), 0) ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
        <p className="text-sm text-gray-500">
          Suivi des paiements et facturation
        </p>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-medium text-green-700">Total encaissé</p>
          <p className="mt-1 text-2xl font-bold text-green-900">
            {totalPaye.toFixed(2)} €
          </p>
          <p className="text-xs text-green-600">
            {paiements?.filter((p: any) => p.statut === "paye").length || 0}{" "}
            paiement(s)
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-700">En attente</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">
            {totalEnAttente.toFixed(2)} €
          </p>
          <p className="text-xs text-amber-600">
            {paiements?.filter((p: any) => p.statut === "en_attente").length || 0}{" "}
            paiement(s)
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">Remboursé</p>
          <p className="mt-1 text-2xl font-bold text-red-900">
            {totalRembourse.toFixed(2)} €
          </p>
          <p className="text-xs text-red-600">
            {paiements?.filter((p: any) => p.statut === "rembourse").length || 0}{" "}
            paiement(s)
          </p>
        </div>
      </div>

      <PaiementsTable initialPaiements={paiements ?? []} />
    </div>
  );
}
