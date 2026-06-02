"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, AlertCircle, FileText, Trash2, Edit3 } from "lucide-react";

type RgpdRequest = {
  id: string;
  type: "export" | "suppression" | "rectification";
  statut: "demande" | "en_cours" | "traite" | "refuse";
  message: string | null;
  reponse: string | null;
  created_at: string;
  traite_at: string | null;
};

const TYPE_LABELS: Record<RgpdRequest["type"], string> = {
  export: "Export des données",
  suppression: "Suppression du compte",
  rectification: "Rectification",
};

const STATUT_COLORS: Record<RgpdRequest["statut"], string> = {
  demande: "bg-gray-100 text-gray-700",
  en_cours: "bg-amber-100 text-amber-700",
  traite: "bg-green-100 text-green-700",
  refuse: "bg-red-100 text-red-700",
};

export function RgpdPanel({ requests }: { requests: RgpdRequest[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<RgpdRequest["type"]>("rectification");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch("/api/dashboard/rgpd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erreur lors de l'envoi");
        return;
      }
      setSuccess("Demande enregistrée. Notre équipe vous répondra sous 30 jours.");
      setMessage("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Download className="h-4 w-4 text-sky-600" />
                Exporter mes données
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Téléchargez immédiatement un fichier JSON contenant l&apos;ensemble
                de vos données (profil, patients, commandes, factures, avoirs).
              </p>
            </div>
            <a
              href="/api/dashboard/rgpd"
              download
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              <Download className="h-4 w-4" />
              Télécharger
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <FileText className="h-4 w-4 text-sky-600" />
            Nouvelle demande RGPD
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setType("rectification")}
              className={`rounded-lg border p-3 text-left text-sm transition ${type === "rectification" ? "border-sky-500 bg-sky-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <Edit3 className="mb-1 h-4 w-4 text-sky-600" />
              <div className="font-medium text-gray-900">Rectification</div>
              <div className="text-xs text-gray-500">
                Corriger une donnée incorrecte
              </div>
            </button>
            <button
              type="button"
              onClick={() => setType("export")}
              className={`rounded-lg border p-3 text-left text-sm transition ${type === "export" ? "border-sky-500 bg-sky-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <Download className="mb-1 h-4 w-4 text-sky-600" />
              <div className="font-medium text-gray-900">Export complet</div>
              <div className="text-xs text-gray-500">
                Demander une copie officielle
              </div>
            </button>
            <button
              type="button"
              onClick={() => setType("suppression")}
              className={`rounded-lg border p-3 text-left text-sm transition ${type === "suppression" ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <Trash2 className="mb-1 h-4 w-4 text-red-600" />
              <div className="font-medium text-gray-900">Suppression</div>
              <div className="text-xs text-gray-500">
                Effacer mon compte et mes données
              </div>
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Précisions (optionnel)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              placeholder="Décrivez votre demande..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <Button
            onClick={submit}
            disabled={pending}
            className="bg-sky-600 hover:bg-sky-700"
          >
            {pending ? "Envoi..." : "Envoyer la demande"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-base font-semibold text-gray-900">
            Historique de vos demandes
          </h2>
          {requests.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune demande pour le moment.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((r) => (
                <div key={r.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {TYPE_LABELS[r.type]}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <Badge className={STATUT_COLORS[r.statut]}>
                      {r.statut.replace("_", " ")}
                    </Badge>
                  </div>
                  {r.message && (
                    <p className="mt-2 text-xs text-gray-600">
                      <strong>Votre message :</strong> {r.message}
                    </p>
                  )}
                  {r.reponse && (
                    <p className="mt-1 text-xs text-gray-600">
                      <strong>Réponse :</strong> {r.reponse}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
