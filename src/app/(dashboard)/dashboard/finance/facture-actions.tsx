"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Download, Loader2, Mail, RefreshCw } from "lucide-react";

export function FactureActions({
  factureId,
  statut,
  pdfAvailable,
  emailSent,
  billitOrderId,
}: {
  factureId: string;
  statut: string;
  pdfAvailable: boolean;
  emailSent: boolean;
  billitOrderId?: number | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [billitSyncing, setBillitSyncing] = useState(false);

  const renvoyerFacture = async () => {
    setEmailSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/factures/${factureId}/envoyer`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible d’envoyer la facture.");
      window.location.reload();
    } catch (emailError) {
      setError(emailError instanceof Error ? emailError.message : "Erreur d’envoi.");
      setEmailSending(false);
    }
  };

  const synchroniserBillit = async () => {
    setBillitSyncing(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/factures/${factureId}/synchroniser-billit`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible d’actualiser le statut Billit.");
      window.location.reload();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Erreur de synchronisation Billit.");
      setBillitSyncing(false);
    }
  };

  if (statut === "brouillon") {
    return (
      <Link href={`/dashboard/factures/${factureId}`}>
        <Button size="sm">Vérifier et valider</Button>
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {billitOrderId && (
        <Button size="sm" variant="outline" onClick={synchroniserBillit} disabled={billitSyncing} title="Actualiser le statut de livraison et le solde Billit">
          {billitSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Statut Peppol
        </Button>
      )}
      {pdfAvailable && (
        <a href={`/api/dashboard/factures/${factureId}/pdf`}>
          <Button size="sm" variant="outline" aria-label="Télécharger la facture PDF">
            <Download className="h-4 w-4" />
          </Button>
        </a>
      )}
      {pdfAvailable && !emailSent && (
        <Button size="sm" variant="outline" onClick={renvoyerFacture} disabled={emailSending}>
          {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Renvoyer
        </Button>
      )}
      {pdfAvailable && emailSent && <Check className="h-4 w-4 text-emerald-600" aria-label="Facture envoyée par e-mail" />}
      {error && <p role="alert" className="w-full text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}