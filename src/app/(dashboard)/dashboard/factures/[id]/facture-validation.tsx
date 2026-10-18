"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, FileText, Loader2, Wallet } from "lucide-react";
import type { FactureBillingSnapshot } from "@/lib/facture-workflow";

export function FactureValidation({
  factureId,
  numero,
  snapshot,
}: {
  factureId: string;
  numero: string;
  snapshot: FactureBillingSnapshot;
}) {
  const router = useRouter();
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "virement">("stripe");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    montant_ttc: number;
    solde_du: number;
    email_sent: boolean;
    payment_url: string | null;
  } | null>(null);

  const estimatedTotals = useMemo(
    () => snapshot.items.reduce((totals, item) => {
      const optionsTotal = item.options.reduce((optionSum, option) =>
        selectedOptions.has(`${item.commande_item_id}:${option.id}`)
          ? optionSum + option.prix_ht
          : optionSum, 0);
      const lineHt = (item.prix_base_ht + optionsTotal) * item.quantite;
      const lineTva = Math.round(lineHt * snapshot.taux_tva) / 100;
      return { ht: totals.ht + lineHt, tva: totals.tva + lineTva };
    }, { ht: 0, tva: 0 }),
    [snapshot.items, snapshot.taux_tva, selectedOptions]
  );
  const estimatedTtc = estimatedTotals.ht + estimatedTotals.tva;

  const toggleOption = (commandeItemId: string, optionId: string) => {
    const key = `${commandeItemId}:${optionId}`;
    setSelectedOptions((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const validate = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/factures/${factureId}/valider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_options: [...selectedOptions].map((key) => {
            const [commande_item_id, service_option_id] = key.split(":");
            return { commande_item_id, service_option_id };
          }),
          payment_method: paymentMethod,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de valider la facture.");
      setResult(data);
      router.refresh();
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "Erreur lors de la validation.");
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facture validée</h1>
          <p className="mt-1 text-sm text-gray-500">
            {numero} · {result.montant_ttc.toFixed(2)} € TTC
          </p>
        </div>
        {!result.email_sent && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            La facture est enregistrée. L’e-mail n’a pas pu être envoyé ; le PDF reste disponible dans Finance.
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <a href={`/api/dashboard/factures/${factureId}/pdf`}>
            <Button variant="outline"><FileText className="mr-2 h-4 w-4" />Télécharger la facture</Button>
          </a>
          {result.payment_url && (
            <a href={result.payment_url}>
              <Button><CreditCard className="mr-2 h-4 w-4" />Payer par Stripe</Button>
            </a>
          )}
          <Link href="/dashboard/finance">
            <Button variant="ghost">Retour à Finance</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/dashboard/finance" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Retour à Finance
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Vérifier la facture</h1>
        <p className="mt-1 text-sm text-gray-500">Commande {snapshot.commande_numero} · Brouillon {numero}</p>
      </header>

      {snapshot.items.map((item) => (
        <Card key={item.commande_item_id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
              <span>{item.service_nom}</span>
              <span className="text-sm font-medium text-gray-700">
                {item.prix_base_ht.toFixed(2)} € HT / unité × {item.quantite}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
            {item.options.length > 0 ? (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium text-gray-700">Options facturables</legend>
                {item.options.map((option) => {
                  const key = `${item.commande_item_id}:${option.id}`;
                  return (
                    <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-gray-200 px-3 py-2.5 hover:bg-gray-50">
                      <span className="flex items-center gap-3 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedOptions.has(key)}
                          onChange={() => toggleOption(item.commande_item_id, option.id)}
                          className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                        />
                        {option.nom}
                      </span>
                      <span className="whitespace-nowrap text-sm font-medium text-gray-900">
                        {option.prix_ht.toFixed(2)} € HT
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            ) : (
              <p className="text-sm text-gray-500">Aucune option tarifable pour ce travail.</p>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle className="text-base">Mode de règlement</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 ${paymentMethod === "stripe" ? "border-sky-500 bg-sky-50" : "border-gray-200"}`}>
            <input type="radio" name="payment-method" checked={paymentMethod === "stripe"} onChange={() => setPaymentMethod("stripe")} className="mt-1" />
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900"><CreditCard className="h-4 w-4" />Paiement en ligne</span>
              <span className="mt-1 block text-xs text-gray-500">Lien de paiement sécurisé Stripe.</span>
            </span>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 ${paymentMethod === "virement" ? "border-sky-500 bg-sky-50" : "border-gray-200"}`}>
            <input type="radio" name="payment-method" checked={paymentMethod === "virement"} onChange={() => setPaymentMethod("virement")} className="mt-1" />
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Wallet className="h-4 w-4" />Facture traditionnelle</span>
              <span className="mt-1 block text-xs text-gray-500">Virement selon les conditions et coordonnées du laboratoire.</span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs text-gray-500">
              {estimatedTotals.ht.toFixed(2)} € HT + {estimatedTotals.tva.toFixed(2)} € TVA ({snapshot.taux_tva}%)
            </p>
            <p className="text-2xl font-bold text-gray-900">{estimatedTtc.toFixed(2)} €</p>
          </div>
          <div className="flex items-center gap-3">
            {error && <p role="alert" className="max-w-xs text-sm text-red-600">{error}</p>}
            <Button onClick={validate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {saving ? "Validation…" : "Valider la facture"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}