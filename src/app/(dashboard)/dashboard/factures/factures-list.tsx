"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FactureActions } from "../finance/facture-actions";

type Facture = {
  id: string;
  numero: string;
  statut: string;
  date_emission: string | null;
  date_echeance: string | null;
  montant_ttc: number;
  solde_du: number;
  pdf_storage_path: string | null;
  email_envoye_at: string | null;
  commande: { numero: string } | { numero: string }[] | null;
};

const FILTERS = [
  { id: "all", label: "Toutes" },
  { id: "brouillon", label: "À valider" },
  { id: "emise", label: "Émises" },
  { id: "partielle", label: "Partielles" },
  { id: "payee", label: "Payées" },
] as const;

function statusBadge(status: string) {
  if (status === "brouillon") return <Badge variant="warning">À valider</Badge>;
  if (status === "payee") return <Badge variant="success">Payée</Badge>;
  if (status === "partiellement_payee") return <Badge variant="warning">Partielle</Badge>;
  if (status === "en_retard") return <Badge variant="danger">En retard</Badge>;
  if (status === "annulee") return <Badge className="bg-gray-100 text-gray-700">Annulée</Badge>;
  return <Badge variant="info">Émise</Badge>;
}

export function FacturesList({ factures }: { factures: Facture[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const filtered = useMemo(() => factures.filter((facture) => {
    if (filter === "all") return true;
    if (filter === "emise") return ["emise", "envoyee", "en_retard"].includes(facture.statut);
    if (filter === "partielle") return facture.statut === "partiellement_payee";
    return facture.statut === filter;
  }), [factures, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les factures">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              filter === item.id
                ? "bg-sky-100 text-sky-800"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {item.label}
            <span className="ml-2 text-xs text-gray-500">
              {item.id === "all"
                ? factures.length
                : factures.filter((facture) => {
                    if (item.id === "emise") return ["emise", "envoyee", "en_retard"].includes(facture.statut);
                    if (item.id === "partielle") return facture.statut === "partiellement_payee";
                    return facture.statut === item.id;
                  }).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">
            Aucune facture dans cette catégorie.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((facture) => (
            <Card key={facture.id}>
              {(() => {
                const commande = Array.isArray(facture.commande)
                  ? facture.commande[0]
                  : facture.commande;
                return (
              <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-gray-900">{facture.numero}</h2>
                    {statusBadge(facture.statut)}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {commande?.numero ? `Commande ${commande.numero}` : "Facture"}
                    {facture.date_emission
                      ? ` · ${new Date(facture.date_emission).toLocaleDateString("fr-FR")}`
                      : " · À valider"}
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <p className="font-semibold text-gray-900">
                    {Number(facture.montant_ttc || 0).toFixed(2)} € TTC
                  </p>
                  {facture.statut !== "brouillon" && (
                    <p className="text-xs text-gray-500">
                      Solde : {Number(facture.solde_du || 0).toFixed(2)} €
                    </p>
                  )}
                </div>
                <FactureActions
                  factureId={facture.id}
                  statut={facture.statut}
                  pdfAvailable={Boolean(facture.pdf_storage_path)}
                  emailSent={Boolean(facture.email_envoye_at)}
                />
              </CardContent>
                );
              })()}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}