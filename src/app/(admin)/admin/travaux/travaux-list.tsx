"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ArrowUpDown,
  Briefcase,
  FileCheck,
  Eye,
  Package,
  Truck,
} from "lucide-react";
import {
  getStatusLabel,
  getStatusColor,
  formatDate,
  formatPrice,
} from "@/lib/utils";

type Commande = {
  id: string;
  numero: string;
  patient_ref: string | null;
  patient_id: string | null;
  mode_reception: string | null;
  statut: string;
  priorite: string;
  montant_total: number;
  date_souhaitee: string | null;
  created_at: string;
  patient: { id: string; reference: string; nom: string; prenom: string } | null;
  dentiste: { id: string; nom: string; prenom: string; email: string } | null;
  items: {
    type_travail: string;
    dents: string[] | null;
    materiau: string | null;
    teinte: string | null;
  }[];
};

export function TravauxList({
  initialCommandes,
}: {
  initialCommandes: Commande[];
}) {
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const allTypes = Array.from(
    new Set(
      initialCommandes.flatMap((c) =>
        c.items?.map((i) => i.type_travail) ?? []
      )
    )
  );

  const filtered = initialCommandes.filter((c) => {
    if (filterStatut !== "all" && c.statut !== filterStatut) return false;
    if (
      filterType !== "all" &&
      !c.items?.some((i) => i.type_travail === filterType)
    )
      return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.numero?.toLowerCase().includes(q) ||
      c.dentiste?.nom?.toLowerCase().includes(q) ||
      c.dentiste?.prenom?.toLowerCase().includes(q) ||
      c.patient?.nom?.toLowerCase().includes(q) ||
      c.patient?.prenom?.toLowerCase().includes(q) ||
      c.patient?.reference?.toLowerCase().includes(q) ||
      c.patient_ref?.toLowerCase().includes(q)
    );
  });

  const typeLabel = (t: string) =>
    t.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro, dentiste, patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="acceptee">Acceptée</option>
          <option value="en_cours">En cours</option>
          <option value="controle_qualite">Contrôle qualité</option>
          <option value="terminee">Terminée</option>
          <option value="expediee">Expédiée</option>
          <option value="livree">Livrée</option>
        </select>
        {allTypes.length > 0 && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="all">Tous les types</option>
            {allTypes.map((t) => (
              <option key={t} value={t}>
                {typeLabel(t)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          {
            label: "Total",
            count: initialCommandes.length,
            icon: Briefcase,
            color: "text-gray-600 bg-gray-100",
          },
          {
            label: "En attente",
            count: initialCommandes.filter((c) => c.statut === "en_attente")
              .length,
            icon: Package,
            color: "text-amber-600 bg-amber-100",
          },
          {
            label: "En cours",
            count: initialCommandes.filter(
              (c) => c.statut === "en_cours" || c.statut === "acceptee"
            ).length,
            icon: Briefcase,
            color: "text-blue-600 bg-blue-100",
          },
          {
            label: "Terminés",
            count: initialCommandes.filter((c) => c.statut === "terminee")
              .length,
            icon: FileCheck,
            color: "text-green-600 bg-green-100",
          },
          {
            label: "Expédiés",
            count: initialCommandes.filter(
              (c) => c.statut === "expediee" || c.statut === "livree"
            ).length,
            icon: Truck,
            color: "text-teal-600 bg-teal-100",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2.5"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}
            >
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{s.count}</p>
              <p className="text-[11px] text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">Aucun travail trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="px-5 py-3 font-medium">N°</th>
                    <th className="px-5 py-3 font-medium">Patient</th>
                    <th className="px-5 py-3 font-medium">Dentiste</th>
                    <th className="px-5 py-3 font-medium">Type(s)</th>
                    <th className="px-5 py-3 font-medium">Réception</th>
                    <th className="px-5 py-3 font-medium">Statut</th>
                    <th className="px-5 py-3 font-medium">Priorité</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-sky-700">
                        {c.numero}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {c.patient ? (
                          <div>
                            <p className="font-medium">
                              {c.patient.prenom} {c.patient.nom}
                            </p>
                            <p className="text-xs text-gray-400">
                              {c.patient.reference}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            {c.patient_ref || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {c.dentiste ? (
                          <span>
                            Dr {c.dentiste.prenom} {c.dentiste.nom}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.items?.slice(0, 2).map((item, i) => (
                            <span
                              key={i}
                              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                            >
                              {typeLabel(item.type_travail)}
                            </span>
                          ))}
                          {(c.items?.length || 0) > 2 && (
                            <span className="text-xs text-gray-400">
                              +{(c.items?.length || 0) - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {c.mode_reception === "enlevement" ? (
                          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-700">
                            Enlèvement
                          </span>
                        ) : (
                          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-700">
                            Numérique
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(c.statut)}`}
                        >
                          {getStatusLabel(c.statut)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant={
                            c.priorite === "urgente"
                              ? "danger"
                              : c.priorite === "express"
                                ? "warning"
                                : "default"
                          }
                        >
                          {c.priorite}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/travaux/${c.id}`}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-sky-600 hover:bg-sky-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Voir
                        </Link>
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
