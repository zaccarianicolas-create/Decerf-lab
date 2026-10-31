"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FilePlus2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, Receipt, ScrollText } from "lucide-react";
import { PaiementVirementButton } from "./paiement-virement-button";

type PendingCommande = {
  id: string;
  numero: string;
  date_livraison: string | null;
  dentiste_nom: string;
};

type DentistOption = { id: string; nom: string; prenom: string; email: string };
type DirectInvoiceLine = { id: number; description: string; quantite: string; prix_unitaire: string; taux_tva: string };

type FactureRow = {
  id: string;
  numero: string;
  statut: string;
  date_emission: string | null;
  date_echeance: string | null;
  montant_ttc: number;
  solde_du: number;
  billit_order_id: number | null;
  billit_order_status: string | null;
  billit_delivery_status: string | null;
  billit_is_delivered: boolean | null;
  billit_last_error: string | null;
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
  facture_id: string | null;
  billit_order_id: number | null;
  billit_order_status: string | null;
  billit_delivery_status: string | null;
  billit_is_delivered: boolean | null;
  billit_last_error: string | null;
  facture_billit_order_id: number | null;
  billit_pdf_storage_path: string | null;
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
  if (statut === "brouillon") return <Badge variant="warning">À valider</Badge>;
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
  dentistes,
  regimeTva,
  tauxTvaDefaut,
  pendingCommandes,
  factures,
  avoirs,
  ledger,
  billitProductionReady,
}: {
  dentistes: DentistOption[];
  regimeTva: string;
  tauxTvaDefaut: number;
  pendingCommandes: PendingCommande[];
  factures: FactureRow[];
  avoirs: AvoirRow[];
  ledger: LedgerRow[];
  billitProductionReady: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"factures" | "avoirs" | "ledger">("factures");
  const [creatingCommandeId, setCreatingCommandeId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [avoirTarget, setAvoirTarget] = useState<FactureRow | null>(null);
  const [avoirMotif, setAvoirMotif] = useState("");
  const [savingAvoir, setSavingAvoir] = useState(false);
  const [emittingAvoirId, setEmittingAvoirId] = useState<string | null>(null);
  const [syncingFactureId, setSyncingFactureId] = useState<string | null>(null);
  const [syncingAvoirId, setSyncingAvoirId] = useState<string | null>(null);
  const [venteLibreOpen, setVenteLibreOpen] = useState(false);
  const [venteLibreClient, setVenteLibreClient] = useState("");
  const [venteLibreNotes, setVenteLibreNotes] = useState("");
  const [venteLibreLines, setVenteLibreLines] = useState<DirectInvoiceLine[]>([
    { id: 1, description: "", quantite: "1", prix_unitaire: "", taux_tva: String(tauxTvaDefaut) },
  ]);
  const [savingVenteLibre, setSavingVenteLibre] = useState(false);

  const facturesEnRetard = useMemo(
    () => factures.filter((f) => f.statut === "en_retard").length,
    [factures]
  );

  const createFactureFromCommande = async (commandeId: string) => {
    try {
      setError(null);
      setCreatingCommandeId(commandeId);

      const res = await fetch("/api/admin/factures/brouillon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commande_id: commandeId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erreur lors de la generation de facture");
      }

      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur inattendue");
    } finally {
      setCreatingCommandeId(null);
    }
  };

  const createVenteLibre = async () => {
    setSavingVenteLibre(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/factures/libre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dentiste_id: venteLibreClient,
          notes: venteLibreNotes,
          lignes: venteLibreLines.map((line) => ({
            description: line.description,
            quantite: Number(line.quantite),
            prix_unitaire: Number(line.prix_unitaire),
            taux_tva: Number(line.taux_tva),
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible de créer la facture libre.");
      setVenteLibreOpen(false);
      setVenteLibreClient("");
      setVenteLibreNotes("");
      setVenteLibreLines([{ id: 1, description: "", quantite: "1", prix_unitaire: "", taux_tva: String(tauxTvaDefaut) }]);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de créer la facture libre.");
    } finally {
      setSavingVenteLibre(false);
    }
  };

  const updateVenteLibreLine = (id: number, patch: Partial<DirectInvoiceLine>) => {
    setVenteLibreLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  };

  const prepareAvoir = async () => {
    if (!avoirTarget) return;
    setSavingAvoir(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/avoirs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facture_id: avoirTarget.id, motif: avoirMotif }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Impossible de préparer l’avoir.");
      setAvoirTarget(null);
      setAvoirMotif("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de préparer l’avoir.");
    } finally {
      setSavingAvoir(false);
    }
  };

  const emitAvoir = async (avoirId: string) => {
    setEmittingAvoirId(avoirId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/avoirs/${avoirId}/emettre`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "L’émission Billit de l’avoir a échoué.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’émission Billit de l’avoir a échoué.");
      router.refresh();
    } finally {
      setEmittingAvoirId(null);
    }
  };

  const syncFactureBillit = async (factureId: string) => {
    setSyncingFactureId(factureId);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/factures/${factureId}/synchroniser-billit`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Synchronisation Billit impossible.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Synchronisation Billit impossible.");
    } finally {
      setSyncingFactureId(null);
    }
  };

  const syncAvoirBillit = async (avoirId: string) => {
    setSyncingAvoirId(avoirId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/avoirs/${avoirId}/synchroniser-billit`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Synchronisation Billit impossible.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Synchronisation Billit impossible.");
    } finally {
      setSyncingAvoirId(null);
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
              <Button type="button" size="sm" onClick={() => setVenteLibreOpen(true)} disabled={dentistes.length === 0}>
                <FilePlus2 className="mr-1.5 h-4 w-4" /> Facture libre
              </Button>
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

          {!billitProductionReady && (
            <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Les avoirs peuvent être préparés en brouillon. Leur émission Peppol reste désactivée tant que Billit Production n’est pas validé et configuré.
            </p>
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
                        {f.billit_order_id && (
                          <p className="mt-1 text-xs text-gray-500">
                            Peppol : {f.billit_delivery_status || f.billit_order_status || "À synchroniser"}
                            {f.billit_is_delivered ? " · Livrée" : ""}
                          </p>
                        )}
                        {f.billit_last_error && <p className="mt-1 text-xs text-red-700">{f.billit_last_error}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{Number(f.montant_ttc).toFixed(2)} €</p>
                        <p className="text-xs text-gray-500">Solde: {Number(f.solde_du).toFixed(2)} €</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {statutFactureBadge(f.statut)}
                        {f.billit_order_id && (
                          <Button type="button" size="sm" variant="outline" disabled={syncingFactureId === f.id} onClick={() => syncFactureBillit(f.id)} aria-label="Actualiser le statut Billit">
                            <RefreshCw className={`h-4 w-4 ${syncingFactureId === f.id ? "animate-spin" : ""}`} />
                          </Button>
                        )}
                        {Number(f.solde_du) > 0 && !["brouillon", "annulee"].includes(f.statut) && (
                          <PaiementVirementButton factureId={f.id} solde={Number(f.solde_du)} />
                        )}
                        {f.billit_order_id && !["brouillon", "annulee"].includes(f.statut) && !avoirs.some((avoir) => avoir.facture_id === f.id && avoir.statut !== "annule") && (
                          <Button type="button" size="sm" variant="outline" onClick={() => setAvoirTarget(f)}>
                            <FilePlus2 className="mr-1.5 h-4 w-4" /> Préparer un avoir total
                          </Button>
                        )}
                      </div>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border border-gray-200 bg-gray-100 text-gray-700">{a.statut}</Badge>
                        {a.billit_order_id && (
                          <span className="text-xs text-gray-500">
                            Peppol : {a.billit_delivery_status || a.billit_order_status || "À synchroniser"}{a.billit_is_delivered ? " · Livré" : ""}
                          </span>
                        )}
                        {a.billit_pdf_storage_path && (
                          <a href={`/api/dashboard/avoirs/${a.id}/pdf`}>
                            <Button type="button" size="sm" variant="outline" aria-label="Télécharger le PDF de l’avoir">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        {a.billit_last_error && <span className="text-xs text-red-700">{a.billit_last_error}</span>}
                        {a.billit_order_id && (
                          <Button type="button" size="sm" variant="outline" disabled={syncingAvoirId === a.id} onClick={() => syncAvoirBillit(a.id)} aria-label="Actualiser le statut Billit de l’avoir">
                            <RefreshCw className={`h-4 w-4 ${syncingAvoirId === a.id ? "animate-spin" : ""}`} />
                          </Button>
                        )}
                        {a.statut === "brouillon" && billitProductionReady && a.facture_id && a.facture_billit_order_id && (
                          <Button type="button" size="sm" onClick={() => emitAvoir(a.id)} disabled={emittingAvoirId === a.id}>
                            {emittingAvoirId === a.id ? "Émission…" : "Émettre via Billit"}
                          </Button>
                        )}
                      </div>
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
                    <Button
                      size="sm"
                      onClick={() => createFactureFromCommande(c.id)}
                      isLoading={creatingCommandeId === c.id}
                    >
                      Préparer la facture
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {avoirTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="avoir-draft-title" className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h2 id="avoir-draft-title" className="text-lg font-semibold text-gray-900">Préparer un avoir total</h2>
            <p className="mt-2 text-sm text-gray-600">
              Facture {avoirTarget.numero} · {avoirTarget.montant_ttc.toFixed(2)} € TTC. Le brouillon ne modifie pas encore le solde.
            </p>
            <label className="mt-4 block text-sm font-medium text-gray-700">
              Motif
              <textarea value={avoirMotif} onChange={(event) => setAvoirMotif(event.target.value)} rows={3} maxLength={500} className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setAvoirTarget(null); setAvoirMotif(""); }}>Annuler</Button>
              <Button type="button" disabled={savingAvoir || !avoirMotif.trim()} onClick={prepareAvoir}>
                {savingAvoir ? "Enregistrement…" : "Créer le brouillon"}
              </Button>
            </div>
          </section>
        </div>
      )}

      {venteLibreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="vente-libre-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="vente-libre-title" className="text-lg font-semibold text-gray-900">Créer une facture libre</h2>
                <p className="mt-1 text-sm text-gray-600">Vente hors commande et hors catalogue. Le dentiste vérifiera ensuite le brouillon.</p>
              </div>
              <button type="button" onClick={() => setVenteLibreOpen(false)} disabled={savingVenteLibre} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-5 block text-sm font-medium text-gray-700">
              Dentiste client
              <select value={venteLibreClient} onChange={(event) => setVenteLibreClient(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">Sélectionner un dentiste</option>
                {dentistes.map((dentiste) => (
                  <option key={dentiste.id} value={dentiste.id}>{dentiste.prenom} {dentiste.nom} · {dentiste.email}</option>
                ))}
              </select>
            </label>
            <div className="mt-5 space-y-3">
              {venteLibreLines.map((line, index) => (
                <div key={line.id} className="grid grid-cols-1 items-end gap-2 rounded-md border border-gray-200 p-3 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_6rem_auto]">
                  <label className="text-xs font-medium text-gray-600">
                    Désignation
                    <input value={line.description} onChange={(event) => updateVenteLibreLine(line.id, { description: event.target.value })} maxLength={512} placeholder="Ex. Brosse à dents" className="mt-1 w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm text-gray-900" />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Qté
                    <input type="number" min="1" step="1" value={line.quantite} onChange={(event) => updateVenteLibreLine(line.id, { quantite: event.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900" />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Prix HT (€)
                    <input type="number" min="0.01" step="0.01" value={line.prix_unitaire} onChange={(event) => updateVenteLibreLine(line.id, { prix_unitaire: event.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900" />
                  </label>
                  {regimeTva === "franchise" ? (
                    <div className="pb-2 text-xs text-gray-600">TVA franchise</div>
                  ) : (
                    <label className="text-xs font-medium text-gray-600">
                      TVA %
                      <input type="number" min="0" max="100" step="0.01" value={line.taux_tva} onChange={(event) => updateVenteLibreLine(line.id, { taux_tva: event.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900" />
                    </label>
                  )}
                  <button type="button" disabled={venteLibreLines.length <= 1} onClick={() => setVenteLibreLines((current) => current.filter((entry) => entry.id !== line.id))} aria-label={`Supprimer la ligne ${index + 1}`} className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" disabled={venteLibreLines.length >= 40} onClick={() => setVenteLibreLines((current) => [...current, { id: Math.max(0, ...current.map((line) => line.id)) + 1, description: "", quantite: "1", prix_unitaire: "", taux_tva: String(tauxTvaDefaut) }])}>
                <Plus className="mr-1 h-4 w-4" /> Ajouter une ligne
              </Button>
            </div>
            <label className="mt-4 block text-sm font-medium text-gray-700">
              Notes (facultatif)
              <textarea value={venteLibreNotes} onChange={(event) => setVenteLibreNotes(event.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" />
            </label>
            {regimeTva === "franchise" && <p className="mt-2 text-xs text-amber-700">Franchise TVA appliquée selon les paramètres du laboratoire.</p>}
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={savingVenteLibre} onClick={() => setVenteLibreOpen(false)}>Annuler</Button>
              <Button type="button" disabled={savingVenteLibre || !venteLibreClient || venteLibreLines.some((line) => !line.description.trim() || !Number.isInteger(Number(line.quantite)) || Number(line.quantite) < 1 || Number(line.prix_unitaire) <= 0)} onClick={createVenteLibre}>
                {savingVenteLibre ? "Création…" : "Créer le brouillon"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
