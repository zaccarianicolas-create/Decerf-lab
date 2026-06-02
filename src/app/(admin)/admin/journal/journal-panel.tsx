"use client";

import { useState, useTransition, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, FileText, AlertCircle } from "lucide-react";

type AuditLog = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
};

type RgpdRequest = {
  id: string;
  created_at: string;
  user_id: string;
  type: "export" | "suppression" | "rectification";
  statut: "demande" | "en_cours" | "traite" | "refuse";
  message: string | null;
  reponse: string | null;
  traite_at: string | null;
};

type ProfileInfo = { nom: string | null; prenom: string | null; email: string | null };

const STATUT_COLORS: Record<RgpdRequest["statut"], string> = {
  demande: "bg-gray-100 text-gray-700",
  en_cours: "bg-amber-100 text-amber-700",
  traite: "bg-green-100 text-green-700",
  refuse: "bg-red-100 text-red-700",
};

export function JournalPanel({
  logs,
  requests,
  profilesMap,
}: {
  logs: AuditLog[];
  requests: RgpdRequest[];
  profilesMap: Record<string, ProfileInfo>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"logs" | "rgpd">("rgpd");
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [reponse, setReponse] = useState("");
  const [nextStatut, setNextStatut] =
    useState<RgpdRequest["statut"]>("traite");

  const filteredLogs = logs.filter((l) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      l.action.toLowerCase().includes(f) ||
      (l.entity_type ?? "").toLowerCase().includes(f) ||
      (l.entity_id ?? "").toLowerCase().includes(f) ||
      (l.actor_id ?? "").toLowerCase().includes(f)
    );
  });

  const updateRequest = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/rgpd/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: nextStatut, reponse: reponse || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erreur");
        return;
      }
      setEditing(null);
      setReponse("");
      router.refresh();
    });
  };

  const renderUser = (id: string | null) => {
    if (!id) return "—";
    const p = profilesMap[id];
    if (!p) return id.slice(0, 8) + "…";
    return `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || p.email || id.slice(0, 8) + "…";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("rgpd")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "rgpd" ? "bg-sky-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          <Shield className="mr-1 inline h-4 w-4" />
          Demandes RGPD ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("logs")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "logs" ? "bg-sky-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          <FileText className="mr-1 inline h-4 w-4" />
          Audit logs ({logs.length})
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {tab === "rgpd" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Praticien</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        Aucune demande.
                      </td>
                    </tr>
                  )}
                  {requests.map((r) => (
                    <Fragment key={r.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(r.created_at).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">{renderUser(r.user_id)}</td>
                        <td className="px-4 py-3 capitalize">{r.type}</td>
                        <td className="px-4 py-3">
                          <Badge className={STATUT_COLORS[r.statut]}>
                            {r.statut.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-xs text-gray-600">
                          {r.message || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(editing === r.id ? null : r.id);
                              setReponse(r.reponse || "");
                              setNextStatut(
                                r.statut === "demande" ? "en_cours" : "traite"
                              );
                            }}
                          >
                            {editing === r.id ? "Fermer" : "Traiter"}
                          </Button>
                        </td>
                      </tr>
                      {editing === r.id && (
                        <tr className="bg-sky-50/40">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {(
                                  ["en_cours", "traite", "refuse"] as RgpdRequest["statut"][]
                                ).map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setNextStatut(s)}
                                    className={`rounded-lg px-3 py-1 text-xs font-medium ${nextStatut === s ? "bg-sky-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                                  >
                                    {s.replace("_", " ")}
                                  </button>
                                ))}
                              </div>
                              <textarea
                                rows={3}
                                value={reponse}
                                onChange={(e) => setReponse(e.target.value)}
                                placeholder="Réponse / commentaire interne"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                              />
                              <Button
                                size="sm"
                                disabled={pending}
                                onClick={() => updateRequest(r.id)}
                                className="bg-sky-600 hover:bg-sky-700"
                              >
                                {pending ? "..." : "Enregistrer"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "logs" && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrer (action, entité, id...)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Acteur</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Entité</th>
                    <th className="px-3 py-2">IP</th>
                    <th className="px-3 py-2">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                        Aucune entrée.
                      </td>
                    </tr>
                  )}
                  {filteredLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {new Date(l.created_at).toLocaleString("fr-FR")}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {renderUser(l.actor_id)}
                        {l.actor_role && (
                          <span className="ml-1 text-gray-400">({l.actor_role})</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                          {l.action}
                        </code>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {l.entity_type}
                        {l.entity_id && (
                          <span className="block text-gray-400">
                            {l.entity_id.slice(0, 12)}…
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {l.ip || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {l.metadata && Object.keys(l.metadata).length > 0 ? (
                          <code className="text-[10px]">
                            {JSON.stringify(l.metadata)}
                          </code>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
