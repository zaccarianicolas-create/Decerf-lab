import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { PaiementsTable } from "./paiements-table";
import { FacturationPanel } from "./facturation-panel";

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

  const { data: factures } = await admin
    .from("factures")
    .select(
      `
      id,
      numero,
      statut,
      date_emission,
      date_echeance,
      montant_ttc,
      solde_du,
      commande:commandes(numero),
      dentiste:profiles!factures_dentiste_id_fkey(nom, prenom)
    `
    )
    .order("created_at", { ascending: false })
    .limit(80);

  const { data: avoirs } = await admin
    .from("avoirs")
    .select(
      `
      id,
      numero,
      statut,
      motif,
      montant,
      solde_restant,
      date_emission,
      dentiste:profiles!avoirs_dentiste_id_fkey(nom, prenom)
    `
    )
    .order("created_at", { ascending: false })
    .limit(80);

  const { data: ledger } = await admin
    .from("ecritures_compte_client")
    .select(
      `
      id,
      created_at,
      type_ecriture,
      libelle,
      montant,
      dentiste:profiles!ecritures_compte_client_dentiste_id_fkey(nom, prenom)
    `
    )
    .order("created_at", { ascending: false })
    .limit(120);

  const { data: commandesFacturables } = await admin
    .from("commandes")
    .select(
      `
      id,
      numero,
      montant_total,
      date_livraison,
      statut,
      dentiste:profiles!commandes_dentiste_id_fkey(nom, prenom)
    `
    )
    .in("statut", ["terminee", "livree"])
    .order("updated_at", { ascending: false })
    .limit(200);

  const commandeIds = (commandesFacturables || []).map((c: any) => c.id);
  const { data: facturesLiees } = commandeIds.length
    ? await admin
        .from("factures")
        .select("commande_id")
        .in("commande_id", commandeIds)
    : { data: [] as any[] };

  const commandeIdsFactures = new Set(
    (facturesLiees || []).map((f: any) => f.commande_id)
  );

  const pendingCommandes = (commandesFacturables || [])
    .filter((commande: any) => !commandeIdsFactures.has(commande.id))
    .filter((commande: any) => Number(commande.montant_total || 0) > 0)
    .map((commande: any) => ({
      id: commande.id,
      numero: commande.numero,
      montant_total: Number(commande.montant_total || 0),
      date_livraison: commande.date_livraison,
      dentiste_nom:
        [commande.dentiste?.prenom, commande.dentiste?.nom]
          .filter(Boolean)
          .join(" ") || "",
    }))
    .slice(0, 40);

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

  const totalFacture =
    factures?.reduce((acc: number, f: any) => acc + Number(f.montant_ttc || 0), 0) ??
    0;
  const totalSolde =
    factures?.reduce((acc: number, f: any) => acc + Number(f.solde_du || 0), 0) ??
    0;
  const totalAvoirs =
    avoirs?.reduce((acc: number, a: any) => acc + Number(a.montant || 0), 0) ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
        <p className="text-sm text-gray-500">
          Suivi des paiements et facturation
        </p>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
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
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm font-medium text-sky-700">Facturé</p>
          <p className="mt-1 text-2xl font-bold text-sky-900">
            {totalFacture.toFixed(2)} €
          </p>
          <p className="text-xs text-sky-600">{factures?.length || 0} facture(s)</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm font-medium text-orange-700">Solde ouvert</p>
          <p className="mt-1 text-2xl font-bold text-orange-900">
            {totalSolde.toFixed(2)} €
          </p>
          <p className="text-xs text-orange-600">Encours client</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-sm font-medium text-indigo-700">Avoirs émis</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">
            {totalAvoirs.toFixed(2)} €
          </p>
          <p className="text-xs text-indigo-600">{avoirs?.length || 0} avoir(s)</p>
        </div>
      </div>

      <div className="mb-8">
        <FacturationPanel
          pendingCommandes={pendingCommandes}
          factures={(factures || []).map((f: any) => ({
            id: f.id,
            numero: f.numero,
            statut: f.statut,
            date_emission: f.date_emission,
            date_echeance: f.date_echeance,
            montant_ttc: Number(f.montant_ttc || 0),
            solde_du: Number(f.solde_du || 0),
            commande_numero: f.commande?.numero || "",
            dentiste_nom:
              [f.dentiste?.prenom, f.dentiste?.nom].filter(Boolean).join(" ") || "",
          }))}
          avoirs={(avoirs || []).map((a: any) => ({
            id: a.id,
            numero: a.numero,
            statut: a.statut,
            motif: a.motif,
            montant: Number(a.montant || 0),
            solde_restant: Number(a.solde_restant || 0),
            date_emission: a.date_emission,
            dentiste_nom:
              [a.dentiste?.prenom, a.dentiste?.nom].filter(Boolean).join(" ") || "",
          }))}
          ledger={(ledger || []).map((l: any) => ({
            id: l.id,
            created_at: l.created_at,
            type_ecriture: l.type_ecriture,
            libelle: l.libelle,
            montant: Number(l.montant || 0),
            dentiste_nom:
              [l.dentiste?.prenom, l.dentiste?.nom].filter(Boolean).join(" ") || "",
          }))}
        />
      </div>

      <PaiementsTable initialPaiements={paiements ?? []} />
    </div>
  );
}
