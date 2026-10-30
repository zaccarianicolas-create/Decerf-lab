"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Link2Off, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type BillitStatus = {
  configured: boolean;
  connected: boolean;
  authMode: "api_key" | "oauth" | null;
  environment: "sandbox";
  connected_at: string | null;
};

export function BillitPanel() {
  const [status, setStatus] = useState<BillitStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testOrderId, setTestOrderId] = useState<number | null>(null);
  const [testOrderStatus, setTestOrderStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const response = await fetch("/api/admin/billit", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "État Billit indisponible.");
    setStatus(payload);
  };

  useEffect(() => {
    let active = true;
    const resultParam = new URLSearchParams(window.location.search).get("billit");
    fetch("/api/admin/billit", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "État Billit indisponible.");
        return payload as BillitStatus;
      })
      .then((payload) => {
        if (!active) return;
        setStatus(payload);
        setResult(resultParam);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "État Billit indisponible.");
      });
    return () => { active = false; };
  }, []);

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/billit", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Déconnexion Billit impossible.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Déconnexion Billit impossible.");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setError(null);
    setTestResult(null);
    try {
      const response = await fetch("/api/admin/billit/test", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Envoi du test Billit impossible.");
      setTestOrderId(payload.orderId);
      setTestOrderStatus(null);
      setTestResult(`Facture fictive ${payload.orderNumber} envoyée au Sandbox (OrderID ${payload.orderId}).`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Envoi du test Billit impossible.");
    } finally {
      setBusy(false);
    }
  };

  const refreshTestStatus = async () => {
    if (!testOrderId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/billit/test?orderId=${testOrderId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Statut Billit indisponible.");
      const delivery = payload.delivered === true ? "livrée" : payload.delivered === false ? "pas encore livrée" : "livraison non confirmée";
      setTestOrderStatus(`${payload.orderStatus || "Statut en attente"} · ${payload.isSent ? "envoyée par Billit" : "pas encore marquée envoyée"} · ${delivery}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Statut Billit indisponible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Facturation électronique Peppol</h2>
          <p className="mt-1 text-sm text-gray-600">
            Connexion Billit limitée à l’environnement Sandbox. Aucun envoi en production n’est activé.
          </p>
          <p className="mt-3 text-sm text-gray-700">
            {status?.authMode === "api_key"
              ? "Clé API du compte Sandbox configurée."
              : status?.connected
                ? "Compte Billit Sandbox connecté par OAuth."
                : "Compte Billit Sandbox non connecté."}
          </p>
          {status && !status.configured && (
            <p className="mt-2 text-sm text-amber-700">
              Configuration serveur à compléter : clé API Sandbox et Party ID, ou identifiants OAuth Sandbox, URL HTTPS du callback et clé de chiffrement.
            </p>
          )}
          {result === "connected" && <p role="status" className="mt-2 text-sm text-green-700">Compte Sandbox connecté.</p>}
          {result === "error" && <p role="alert" className="mt-2 text-sm text-red-700">La connexion Billit a échoué. Réessaie ou vérifie les paramètres OAuth.</p>}
          {testResult && <p role="status" className="mt-2 text-sm text-green-700">{testResult}</p>}
          {testOrderStatus && <p role="status" className="mt-2 text-sm text-gray-700">Statut réseau : {testOrderStatus}</p>}
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {testOrderId && (
            <Button type="button" variant="outline" disabled={busy} onClick={refreshTestStatus}>
              <RefreshCw className="mr-2 h-4 w-4" /> Actualiser le statut
            </Button>
          )}
          {status?.authMode === "api_key" ? (
            <Button type="button" disabled={busy} onClick={sendTest}>
              <Send className="mr-2 h-4 w-4" /> Envoyer une facture test
            </Button>
          ) : status?.connected ? (
            <>
              <Button type="button" disabled={busy} onClick={sendTest}>
                <Send className="mr-2 h-4 w-4" /> Envoyer une facture test
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={disconnect}>
                <Link2Off className="mr-2 h-4 w-4" /> Déconnecter
              </Button>
            </>
          ) : (
            <a href="/api/admin/billit/connexion" aria-disabled={!status?.configured} className={!status?.configured ? "pointer-events-none opacity-50" : ""}>
              <Button type="button" disabled={!status?.configured}>
                <ExternalLink className="mr-2 h-4 w-4" /> Connecter Billit Sandbox
              </Button>
            </a>
          )}
          <Button type="button" variant="outline" disabled={busy} onClick={() => {
            setError(null);
            setBusy(true);
            refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "État Billit indisponible."))
              .finally(() => setBusy(false));
          }} aria-label="Actualiser l’état Billit" title="Actualiser l’état Billit">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}