"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

export function PaiementVirementButton({ factureId, solde }: { factureId: string; solde: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [montant, setMontant] = useState(solde.toFixed(2));
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/factures/${factureId}/paiement-manuel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant: Number(montant), reference }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible d’enregistrer le virement.");
      setOpen(false);
      router.refresh();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Erreur d’enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Enregistrer un virement</Button>;
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <label className="text-xs text-gray-600">
        Montant (€)
        <input type="number" min="0.01" max={solde} step="0.01" value={montant} onChange={(event) => setMontant(event.target.value)} className="mt-1 block w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="min-w-36 flex-1 text-xs text-gray-600">
        Référence (facultatif)
        <input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
      </label>
      <Button size="sm" onClick={submit} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Enregistrer
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
      {error && <p role="alert" className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}