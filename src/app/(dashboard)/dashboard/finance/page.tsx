import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Receipt, Scale, TrendingDown } from "lucide-react";

function factureBadge(statut: string) {
  if (statut === "payee") return <Badge variant="success">Payée</Badge>;
  if (statut === "partiellement_payee") return <Badge variant="warning">Partielle</Badge>;
  if (statut === "en_retard") return <Badge variant="danger">En retard</Badge>;
  if (statut === "annulee") return <Badge className="bg-gray-100 text-gray-700">Annulée</Badge>;
  if (statut === "envoyee") return <Badge variant="info">Envoyée</Badge>;
  return <Badge variant="default">Émise</Badge>;
}

function csvExportUrl(type: "factures" | "avoirs" | "ledger", from?: string, to?: string) {
  const params = new URLSearchParams({ type });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/api/dashboard/comptabilite/export?${params.toString()}`;
}

export default async function DashboardFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const from = params.from || "";
  const to = params.to || "";

  let facturesQuery = supabase
    .from("factures")
    .select("id,numero,statut,date_emission,date_echeance,montant_ttc,solde_du,commande:commandes(numero)")
    .eq("dentiste_id", user.id)
    .order("date_emission", { ascending: false })
    .limit(60);

  if (from) facturesQuery = facturesQuery.gte("date_emission", from);
  if (to) facturesQuery = facturesQuery.lte("date_emission", to);

  let avoirsQuery = supabase
    .from("avoirs")
    .select("id,numero,statut,motif,montant,solde_restant,date_emission,facture:factures(numero)")
    .eq("dentiste_id", user.id)
    .order("date_emission", { ascending: false })
    .limit(40);

  if (from) avoirsQuery = avoirsQuery.gte("date_emission", from);
  if (to) avoirsQuery = avoirsQuery.lte("date_emission", to);

  let ledgerQuery = supabase
    .from("ecritures_compte_client")
    .select("id,created_at,type_ecriture,libelle,montant,facture:factures(numero),avoir:avoirs(numero)")
    .eq("dentiste_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (from) ledgerQuery = ledgerQuery.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) ledgerQuery = ledgerQuery.lte("created_at", `${to}T23:59:59.999Z`);

  const [{ data: factures }, { data: avoirs }, { data: ledger }] = await Promise.all([
    facturesQuery,
    avoirsQuery,
    ledgerQuery,
  ]);

  const totalFacture = (factures || []).reduce(
    (sum: number, row: any) => sum + Number(row.montant_ttc || 0),
    0
  );
  const totalSolde = (factures || []).reduce(
    (sum: number, row: any) => sum + Number(row.solde_du || 0),
    0
  );
  const totalAvoir = (avoirs || []).reduce(
    (sum: number, row: any) => sum + Number(row.solde_restant || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500">Suivi de vos factures, avoirs et écritures comptables.</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Du</label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Au</label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Filtrer
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-sky-100 p-3">
              <FileText className="h-5 w-5 text-sky-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Facturé</p>
              <p className="text-xl font-semibold text-gray-900">{totalFacture.toFixed(2)} €</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-orange-100 p-3">
              <TrendingDown className="h-5 w-5 text-orange-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Solde dû</p>
              <p className="text-xl font-semibold text-gray-900">{totalSolde.toFixed(2)} €</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-indigo-100 p-3">
              <Receipt className="h-5 w-5 text-indigo-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Avoirs disponibles</p>
              <p className="text-xl font-semibold text-gray-900">{totalAvoir.toFixed(2)} €</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-gray-100 p-3">
              <Scale className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Écritures</p>
              <p className="text-xl font-semibold text-gray-900">{ledger?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exports ciblés</CardTitle>
          <div className="flex flex-wrap gap-2">
            <a href={csvExportUrl("factures", from, to)}>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-4 w-4" />
                Mes factures
              </Button>
            </a>
            <a href={csvExportUrl("avoirs", from, to)}>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-4 w-4" />
                Mes avoirs
              </Button>
            </a>
            <a href={csvExportUrl("ledger", from, to)}>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-4 w-4" />
                Mon grand-livre
              </Button>
            </a>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Factures</CardTitle>
        </CardHeader>
        <CardContent>
          {!factures || factures.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Aucune facture sur la période.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">Numéro</th>
                    <th className="pb-3 font-medium">Commande</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Montant</th>
                    <th className="pb-3 font-medium">Solde</th>
                    <th className="pb-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {factures.map((f: any) => (
                    <tr key={f.id}>
                      <td className="py-3 text-sm font-medium text-gray-900">{f.numero}</td>
                      <td className="py-3 text-sm text-gray-600">{f.commande?.numero || "—"}</td>
                      <td className="py-3 text-sm text-gray-600">
                        {f.date_emission
                          ? new Date(f.date_emission).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="py-3 text-sm font-semibold text-gray-900">
                        {Number(f.montant_ttc || 0).toFixed(2)} €
                      </td>
                      <td className="py-3 text-sm text-gray-700">{Number(f.solde_du || 0).toFixed(2)} €</td>
                      <td className="py-3">{factureBadge(f.statut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Avoirs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!avoirs || avoirs.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">Aucun avoir.</p>
            ) : (
              avoirs.map((a: any) => (
                <div key={a.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{a.numero}</p>
                    <Badge className="bg-gray-100 text-gray-700">{a.statut}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">{a.motif}</p>
                  <p className="mt-1 text-sm text-gray-700">
                    Montant: {Number(a.montant || 0).toFixed(2)} € • Restant: {Number(a.solde_restant || 0).toFixed(2)} €
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grand-livre récent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!ledger || ledger.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">Aucune écriture.</p>
            ) : (
              ledger.slice(0, 20).map((line: any) => (
                <div key={line.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{line.libelle}</p>
                    <p className={`text-sm font-semibold ${Number(line.montant) >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {Number(line.montant) >= 0 ? "+" : ""}
                      {Number(line.montant || 0).toFixed(2)} €
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {line.type_ecriture} • {new Date(line.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
