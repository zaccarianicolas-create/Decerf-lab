"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Download, Loader2, Mail } from "lucide-react";

export function FactureActions({
  factureId,
  statut,
  solde,
  pdfAvailable,
  emailSent,
  methodePaiement,
}: {
  factureId: string;
  statut: string;
  solde: number;
  pdfAvailable: boolean;
  emailSent: boolean;
  methodePaiement: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);

  const payerParStripe = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/factures/${factureId}/paiement`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Lien Stripe indisponible.");
      window.location.assign(result.url);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Erreur de paiement.");
      setLoading(false);
    }
  };

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

  if (statut === "brouillon") {
    return (
      <Link href={`/dashboard/factures/${factureId}`}>
        <Button size="sm">Vérifier et valider</Button>
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
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
      {methodePaiement === "stripe" && solde > 0 && (
        <Button size="sm" onClick={payerParStripe} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CreditCard className="mr-1 h-4 w-4" />}
          Payer
        </Button>
      )}
      {error && <p role="alert" className="w-full text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}