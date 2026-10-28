"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const templates = [
  ["invitation", "Invitation praticien"],
  ["compte_acces", "Accès au compte"],
  ["compte_approuve", "Compte approuvé"],
  ["commande_creee", "Commande reçue"],
  ["commande_statut", "Statut de commande"],
  ["facture_a_valider", "Facture à vérifier"],
  ["facture_emise", "Facture émise"],
  ["certificat_emis", "Certificat disponible"],
  ["nouveau_message", "Nouveau message"],
  ["assignation_tache", "Assignation atelier"],
  ["rgpd_recu", "Accusé de réception RGPD"],
];

export function EmailTestsPanel({ configured }: { configured: boolean }) {
  const [template, setTemplate] = useState("invitation");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const send = async () => {
    setSending(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/emails/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const data = await response.json() as { to?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Envoi impossible.");
      setResult({ ok: true, message: `Test accepté par Resend pour ${data.to}. Vérifiez la réception et les indésirables.` });
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "Erreur réseau." });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Tests des emails</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!configured && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Resend n’est pas configuré dans cet environnement. Utilisez le site de production configuré dans Vercel.</p>}
        <p className="text-sm text-gray-600">Destinataire : votre adresse de connexion administrateur. Données fictives uniquement, sans création ni modification de commande, facture ou compte. Limite : 12 tests par heure et par instance.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="email-test-template" className="mb-1 block text-sm font-medium text-gray-700">Modèle</label>
            <select id="email-test-template" value={template} onChange={(event) => setTemplate(event.target.value)} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">
              {templates.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <Button type="button" onClick={() => void send()} disabled={!configured || sending} isLoading={sending} className="gap-2"><Send className="h-4 w-4" /> Envoyer un test</Button>
        </div>
        {result && <p role="status" className={`rounded-md p-3 text-sm ${result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{result.message}</p>}
        <p className="text-xs text-gray-500">Ce test vérifie l’envoi du modèle, pas le déclenchement automatique de son événement métier. Les emails de connexion et de réinitialisation Supabase se testent séparément.</p>
      </CardContent>
    </Card>
  );
}