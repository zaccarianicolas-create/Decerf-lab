"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, Receipt, ScrollText } from "lucide-react";

type PendingCommande = {
  id: string;
  numero: string;
  montant_total: number;
  date_livraison: string | null;
  dentiste_nom: string;
};

type FactureRow = {
  id: string;
  numero: string;
  statut: string;
  date_emission: string | null;
  date_echeance: string | null;
  montant_ttc: number;
  solde_du: number;
  commande_numero: string;
  dentiste_nom: string;
};

type AvoirRow = {
  id: string;
  numero: string;
  statut: string;
  motif: string;
  montant: number;
  solde_restant: number;
  date_emission: string;
  dentiste_nom: string;
};

type LedgerRow = {
  id: string;
  created_at: string;
  type_ecriture: string;
  libelle: string;
  montant: number;
  dentiste_nom: string;
};

function statutFactureBadge(statut: string) {
  if (statut === "payee") return <Badge variant="success">Payée</Badge>;
  if (statut === "partiellement_payee") {
    return <Badge className="border-amber-200 bg-amber-50 text-amber-700">Partielle</Badge>;
  }
  if (statut === "en_retard") return <Badge variant="danger">En retard</Badge>;
  if (statut === "annulee") {
    return <Badge className="border-gray-200 bg-gray-100 text-gray-700">Annulée</Badge>;
  }
  if (statut === "envoyee") return <Badge variant="info">Envoyée</Badge>;
  return <Badge variant="warning">Émise</Badge>;
}

function csvExportUrl(
  type: "factures" | "avoirs" | "ledger" | "paiements" | "journal",
  from?: string,
  to?: string
) {
  const params = new URLSearchParams({ type });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/api/admin/comptabilite/export?${params.toString()}`;
}

export function FacturationPanel({
  pendingCommandes,
  factures,
  avoirs,
  ledger,
}: {
  pendingCommandes: PendingCommande[];
  factures: FactureRow[];
  avoirs: AvoirRow[];
  ledger: LedgerRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"factures" | "avoirs" | "ledger">("factures");
  const [creatingCommandeId, setCreatingCommandeId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const facturesEnRetard = useMemo(
    () => factures.filter((f) => f.statut === "en_retard").length,
    [factures]
  );

  const createFactureFromCommande = async (commandeId: string) => {
    try {
      setError(null);
      setCreatingCommandeId(commandeId);

      const res = await fetch("/api/admin/factures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commande_id: commandeId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erreur lors de la generation de facture");
      }

      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Erreur inattendue");
    } finally {
      setCreatingCommandeId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Facturation & export comptable</h3>
              <p className="text-sm text-gray-500">
                Génération de factures depuis les commandes terminées et exports CSV.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={csvExportUrl("factures", fromDate, toDate)}>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 h-4 w-4" />
                  Export factures
                </Button>
              </a>
              <a href={csvExportUrl("avoirs", fromDate, toDate)}>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 h-4 w-4" />
                  Export avoirs
                </Button>
              </a>
              <a href={csvExportUrl("ledger", fromDate, toDate)}>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 h-4 w-4" />
                  Export grand-livre
                </Button>
              </a>
              <a href={csvExportUrl("paiements", fromDate, toDate)}>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 h-4 w-4" />
                  Export paiements
                </Button>
              </a>
              <a href={csvExportUrl("journal", fromDate, toDate)}>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 h-4 w-4" />
                  Export journal
                </Button>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Du</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Au</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Factures</p>
              <p className="text-xl font-semibold text-gray-900">{factures.length}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs text-red-600">En retard</p>
              <p className="text-xl font-semibold text-red-800">{facturesEnRetard}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 border-b border-gray-200 p-3">
              <button
                className={`rounded-md px-3 py-1.5 text-sm ${
                  tab === "factures"
                    ? "bg-sky-100 font-medium text-sky-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setTab("factures")}
              >
                <FileText className="mr-1 inline h-4 w-4" />
                Factures
              </button>
              <button
                className={`rounded-md px-3 py-1.5 text-sm ${
                  tab === "avoirs"
                    ? "bg-sky-100 font-medium text-sky-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setTab("avoirs")}
              >
                <Receipt className="mr-1 inline h-4 w-4" />
                Avoirs
              </button>
              <button
                className={`rounded-md px-3 py-1.5 text-sm ${
                  tab === "ledger"
                    ? "bg-sky-100 font-medium text-sky-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setTab("ledger")}
              >
                <ScrollText className="mr-1 inline h-4 w-4" />
                Grand-livre
              </button>
            </div>

            <div className="max-h-[380px] overflow-auto p-3">
              {tab === "factures" && (
                <div className="space-y-2">
                  {factures.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-500">Aucune facture.</p>
                  )}
                  {factures.map((f) => (
                    <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{f.numero}</p>
                        <p className="text-xs text-gray-500">
                          Cmd {f.commande_numero || "—"} • {f.dentiste_nom || "Client"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{Number(f.montant_ttc).toFixed(2)} €</p>
                        <p className="text-xs text-gray-500">Solde: {Number(f.solde_du).toFixed(2)} €</p>
                      </div>
                      <div>{statutFactureBadge(f.statut)}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "avoirs" && (
                <div className="space-y-2">
                  {avoirs.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-500">Aucun avoir.</p>
                  )}
                  {avoirs.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{a.numero}</p>
                        <p className="text-xs text-gray-500">{a.dentiste_nom || "Client"} • {a.motif}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{Number(a.montant).toFixed(2)} €</p>
                        <p className="text-xs text-gray-500">Reste: {Number(a.solde_restant).toFixed(2)} €</p>
                      </div>
                      <Badge className="border border-gray-200 bg-gray-100 text-gray-700">{a.statut}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {tab === "ledger" && (
                <div className="space-y-2">
                  {ledger.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-500">Aucune écriture.</p>
                  )}
                  {ledger.map((l) => (
                    <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{l.libelle}</p>
                        <p className="text-xs text-gray-500">{l.dentiste_nom || "Client"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{Number(l.montant).toFixed(2)} €</p>
                        <p className="text-xs text-gray-500">{new Date(l.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <Badge className="border border-gray-200 bg-gray-100 text-gray-700">{l.type_ecriture}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-base font-semibold text-gray-900">Commandes à facturer</h3>
          <p className="mb-3 text-sm text-gray-500">
            Commandes terminées/livrées sans facture associée.
          </p>
          {pendingCommandes.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
              Aucune commande en attente de facturation.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingCommandes.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3">
                  <div>
                    <p className="text-sm font-semibold text-sky-700">{c.numero}</p>
                    <p className="text-xs text-gray-500">
                      {c.dentiste_nom || "Client"}
                      {c.date_livraison ? ` • Livrée le ${new Date(c.date_livraison).toLocaleDateString("fr-FR")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {Number(c.montant_total || 0).toFixed(2)} €
                    </p>
                    <Button
                      size="sm"
                      onClick={() => createFactureFromCommande(c.id)}
                      isLoading={creatingCommandeId === c.id}
                    >
                      Générer facture
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
