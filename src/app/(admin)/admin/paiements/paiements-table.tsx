"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Search,
  ExternalLink,
  ArrowUpDown,
} from "lucide-react";

type Paiement = {
  id: string;
  commande_id: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  montant: number;
  devise: string;
  statut: "en_attente" | "paye" | "echoue" | "rembourse";
  methode: string | null;
  created_at: string;
  updated_at: string;
  commande: {
    numero: string;
    patient_ref: string | null;
    dentiste: {
      nom: string;
      prenom: string;
      email: string;
    };
  } | null;
};

function statutBadge(statut: string) {
  switch (statut) {
    case "paye":
      return <Badge variant="success">Payé</Badge>;
    case "echoue":
      return <Badge variant="danger">Échoué</Badge>;
    case "rembourse":
      return (
        <Badge className="border-purple-200 bg-purple-50 text-purple-700">
          Remboursé
        </Badge>
      );
    default:
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
          En attente
        </Badge>
      );
  }
}

export function PaiementsTable({
  initialPaiements,
}: {
  initialPaiements: Paiement[];
}) {
  const [paiements] = useState(initialPaiements);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatut, setFilterStatut] = useState("all");
  const [sortField, setSortField] = useState<"date" | "montant">("date");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = paiements
    .filter((p) => {
      if (filterStatut !== "all" && p.statut !== filterStatut) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.commande?.numero?.toLowerCase().includes(q) ||
        p.commande?.dentiste?.nom?.toLowerCase().includes(q) ||
        p.commande?.dentiste?.prenom?.toLowerCase().includes(q) ||
        p.stripe_payment_intent_id?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortField === "montant") {
        return sortAsc
          ? Number(a.montant) - Number(b.montant)
          : Number(b.montant) - Number(a.montant);
      }
      return sortAsc
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const toggleSort = (field: "date" | "montant") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par commande, dentiste..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="all">Tous les statuts</option>
          <option value="paye">Payé</option>
          <option value="en_attente">En attente</option>
          <option value="echoue">Échoué</option>
          <option value="rembourse">Remboursé</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">Aucun paiement trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="px-6 py-3 font-medium">Commande</th>
                    <th className="px-6 py-3 font-medium">Dentiste</th>
                    <th
                      className="cursor-pointer px-6 py-3 font-medium"
                      onClick={() => toggleSort("montant")}
                    >
                      <span className="flex items-center gap-1">
                        Montant
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </th>
                    <th className="px-6 py-3 font-medium">Statut</th>
                    <th className="px-6 py-3 font-medium">Méthode</th>
                    <th
                      className="cursor-pointer px-6 py-3 font-medium"
                      onClick={() => toggleSort("date")}
                    >
                      <span className="flex items-center gap-1">
                        Date
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </th>
                    <th className="px-6 py-3 font-medium">Stripe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-sky-700">
                        {p.commande?.numero || "—"}
                      </td>
                      <td className="px-6 py-4">
                        {p.commande?.dentiste ? (
                          <div>
                            <p className="text-sm font-medium">
                              Dr {p.commande.dentiste.prenom}{" "}
                              {p.commande.dentiste.nom}
                            </p>
                            <p className="text-xs text-gray-500">
                              {p.commande.dentiste.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        {Number(p.montant).toFixed(2)} {p.devise.toUpperCase()}
                      </td>
                      <td className="px-6 py-4">{statutBadge(p.statut)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {p.methode || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(p.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {p.stripe_payment_intent_id ? (
                          <a
                            href={`https://dashboard.stripe.com/payments/${p.stripe_payment_intent_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sky-600 hover:text-sky-700"
                            title="Voir sur Stripe"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="max-w-[100px] truncate text-xs">
                              {p.stripe_payment_intent_id.slice(-8)}
                            </span>
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
