"use client";

import { useMemo } from "react";
import { Briefcase, FileCheck, FileText, ScrollText } from "lucide-react";

type Item = {
  id: string;
  date: string;
  type: "commande" | "certificat" | "facture" | "note";
  titre: string;
  description?: string;
  href?: string;
};

export function PatientTimeline({
  commandes,
  certificats,
  factures,
  notes,
}: {
  commandes: any[];
  certificats: any[];
  factures: any[];
  notes: any[];
}) {
  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (const c of commandes ?? []) {
      out.push({
        id: `c-${c.id}`,
        date: c.created_at,
        type: "commande",
        titre: `Commande ${c.numero}`,
        description: `Statut : ${String(c.statut || "—").replace(/_/g, " ")}`,
      });
    }
    for (const c of certificats ?? []) {
      out.push({
        id: `cc-${c.id}`,
        date: c.created_at,
        type: "certificat",
        titre: `Certificat ${c.numero_certificat ?? ""}`,
        description: c.statut ?? "",
      });
    }
    for (const f of factures ?? []) {
      out.push({
        id: `f-${f.id}`,
        date: f.date_emission || f.created_at,
        type: "facture",
        titre: `Facture ${f.numero}`,
        description: `${Number(f.montant_ttc || 0).toFixed(2)} € — ${f.statut}`,
      });
    }
    for (const n of notes ?? []) {
      out.push({
        id: `n-${n.id}`,
        date: n.date_note || n.created_at,
        type: "note",
        titre: n.titre || `Note ${n.type}`,
        description: n.contenu?.slice(0, 120),
      });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [commandes, certificats, factures, notes]);

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">
        Aucune activité pour ce patient.
      </p>
    );
  }

  const ICON = {
    commande: <Briefcase className="h-4 w-4 text-sky-600" />,
    certificat: <FileCheck className="h-4 w-4 text-green-600" />,
    facture: <ScrollText className="h-4 w-4 text-amber-600" />,
    note: <FileText className="h-4 w-4 text-violet-600" />,
  };

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div
          key={it.id}
          className="flex gap-3 rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
            {ICON[it.type]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{it.titre}</p>
              <p className="text-xs text-gray-400">
                {new Date(it.date).toLocaleDateString("fr-FR")}
              </p>
            </div>
            {it.description && (
              <p className="truncate text-xs text-gray-500">{it.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
