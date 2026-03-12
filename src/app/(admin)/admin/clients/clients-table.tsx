"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2, XCircle, Clock } from "lucide-react";

type Client = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  role: string;
  actif: boolean;
  statut_compte: "en_attente" | "approuve" | "rejete";
  created_at: string;
  cabinet: { nom: string } | null;
};

function statutBadge(statut: string) {
  switch (statut) {
    case "approuve":
      return <Badge variant="success">Approuvé</Badge>;
    case "rejete":
      return <Badge variant="danger">Refusé</Badge>;
    default:
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
          En attente
        </Badge>
      );
  }
}

export function ClientsTable({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState(initialClients);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const updateStatut = async (
    clientId: string,
    statut: "approuve" | "rejete"
  ) => {
    setLoadingId(clientId);
    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ statut_compte: statut, actif: statut === "approuve" })
      .eq("id", clientId);

    if (!error) {
      startTransition(() => {
        setClients((prev) =>
          prev.map((c) =>
            c.id === clientId
              ? { ...c, statut_compte: statut, actif: statut === "approuve" }
              : c
          )
        );
      });
    }
    setLoadingId(null);
  };

  const pendingClients = clients.filter((c) => c.statut_compte === "en_attente");
  const otherClients = clients.filter((c) => c.statut_compte !== "en_attente");

  return (
    <div className="space-y-8">
      {/* Inscriptions en attente */}
      {pendingClients.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Inscriptions en attente ({pendingClients.length})
            </h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {pendingClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        Dr {client.prenom} {client.nom}
                      </p>
                      <p className="text-sm text-gray-500">{client.email}</p>
                      {client.telephone && (
                        <p className="text-sm text-gray-400">
                          {client.telephone}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        Inscrit le{" "}
                        {new Date(client.created_at).toLocaleDateString(
                          "fr-FR"
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatut(client.id, "approuve")}
                        disabled={loadingId === client.id}
                        className="gap-1.5 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatut(client.id, "rejete")}
                        disabled={loadingId === client.id}
                        className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                        Refuser
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tous les clients */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Tous les clients
        </h2>
        <Card>
          <CardContent className="p-0">
            {otherClients.length === 0 && pendingClients.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">Aucun client inscrit</p>
              </div>
            ) : otherClients.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">
                  Aucun client approuvé ou refusé pour le moment
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="px-6 py-3 font-medium">Nom</th>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Téléphone</th>
                      <th className="px-6 py-3 font-medium">Cabinet</th>
                      <th className="px-6 py-3 font-medium">Statut</th>
                      <th className="px-6 py-3 font-medium">Inscrit le</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {otherClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">
                          Dr {client.prenom} {client.nom}
                        </td>
                        <td className="px-6 py-4 text-sm">{client.email}</td>
                        <td className="px-6 py-4 text-sm">
                          {client.telephone || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {(client.cabinet as any)?.nom || "—"}
                        </td>
                        <td className="px-6 py-4">
                          {statutBadge(client.statut_compte)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(client.created_at).toLocaleDateString(
                            "fr-FR"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {client.statut_compte === "rejete" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateStatut(client.id, "approuve")
                                }
                                disabled={loadingId === client.id}
                                className="text-xs"
                              >
                                Réactiver
                              </Button>
                            )}
                            {client.statut_compte === "approuve" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateStatut(client.id, "rejete")
                                }
                                disabled={loadingId === client.id}
                                className="text-xs text-red-600"
                              >
                                Désactiver
                              </Button>
                            )}
                          </div>
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
    </div>
  );
}
